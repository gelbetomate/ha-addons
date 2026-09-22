'use strict';

const { createServer } = require('http');
const fs = require('fs');
const path = require('path');
const { streamImageToSwitch } = require('./ump/videoStream');
const { buildTelegram, buildVideoStateRequest } = require('./ump/builder');

/**
 * Create the bridge HTTP API server.
 *
 * Exposes a REST API so that the u::lux Display custom integration can
 * delegate image streaming to the bridge, keeping all UMP/UDP logic in one place.
 *
 * Endpoints:
 *   GET /api/health
 *     Response 200: { "ok": true }
 *
 *   GET /api/discovery/devices
 *     Response 200: { "devices": [...] }
 *
 *   GET /api/registry/devices
 *     Response 200: { "devices": [...] }
 *
 *   GET /api/registry/devices/:switchId
 *     Response 200: { "device": {...} }
 *     Response 404: { "error": "Device not found" }
 *
 *   POST /api/registry/devices
 *     Body (JSON): { "switch_id": "XX:XX:XX:XX:XX:XX", "name": "...", "ip": "...", "port": ... }
 *     Response 201: { "device": {...} }
 *     Response 400: { "error": "..." }
 *
 *   PUT /api/registry/devices/:switchId
 *     Body (JSON): { "name": "...", "ip": "...", "port": ... }
 *     Response 200: { "device": {...} }
 *     Response 400: { "error": "..." }
 *
 *   DELETE /api/registry/devices/:switchId
 *     Response 204: (no body)
 *     Response 404: { "error": "Device not found" }
 *
 *   POST /api/display/image/:switchId
 *     Body (JSON): {
 *       "base64": "<base64-encoded PNG or other image>",
 *       "width":  <optional, pixels — defaults to stream config>,
 *       "height": <optional, pixels — defaults to stream config>
 *     }
 *     Response 200: { "ok": true }
 *     Response 404: { "error": "Unknown switch_id: <id>" }
 *     Response 500: { "error": "<message>" }
 *
 * @param {object}   opts
 * @param {object}   opts.config   - Full add-on config
 * @param {Function} opts.udpSend  - udpSend(host, port, buf) from the UDP server
 * @param {object}   opts.discoveryRegistry - Device discovery/registry manager
 * @param {object}   opts.discoveryScanner - Active discovery scanner
 * @param {object}   opts.log      - Logger
 * @returns {{ start: Function, close: Function }}
 */
function createApiServer({ config, udpSend, discoveryRegistry, discoveryScanner, haClient, mqttClient, log }) {
  const apiPort = config.api_port || 8099;
  const streamCfg = config.stream || {};

  function isApiPath(pathname) {
    return pathname === '/api' || pathname.startsWith('/api/');
  }

  function respond(res, status, body) {
    // Handle 204 No Content and other responses with no body
    if (body === undefined) {
      res.writeHead(status);
      res.end();
      return;
    }

    const json = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json),
    });
    res.end(json);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  async function readJsonBody(req) {
    const raw = await readBody(req);
    if (!raw || !raw.trim()) {
      throw new Error('Request body must not be empty');
    }
    return JSON.parse(raw);
  }

  function getSwitchTarget(switchId) {
    const store = discoveryRegistry?.getStore?.();
    const fromRegistry = store?.get?.(switchId);
    if (fromRegistry) {
      return {
        switch_id: fromRegistry.switch_id,
        ip: fromRegistry.ip,
        port: fromRegistry.port,
      };
    }

    const fromConfig = (config.switches || []).find(
      (s) => String(s.switch_id || '').toLowerCase() === switchId.toLowerCase()
    );

    if (!fromConfig) {
      return null;
    }

    return {
      switch_id: fromConfig.switch_id,
      ip: fromConfig.ip,
      port: fromConfig.port,
    };
  }

  async function handleRequest(req, res) {
    const { method } = req;
    const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = parsedUrl.pathname;

    // --- GET / (serve registry UI) ---
    if (method === 'GET' && pathname === '/') {
      const uiPath = path.join(__dirname, 'ui', 'registry.html');
      try {
        const html = fs.readFileSync(uiPath, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': Buffer.byteLength(html),
        });
        res.end(html);
        return;
      } catch (err) {
        log.error(`Failed to load UI: ${err.message}`);
        return respond(res, 500, { error: 'UI not available' });
      }
    }

    // --- GET /api/health ---
    if (method === 'GET' && pathname === '/api/health') {
      return respond(res, 200, { ok: true, ha: haClient?.getStatus?.() || { connected: false } });
    }

    // --- GET /api/discovery/devices ---
    if (method === 'GET' && pathname === '/api/discovery/devices') {
      const devices = discoveryRegistry ? discoveryRegistry.list() : [];
      return respond(res, 200, { devices });
    }

    // --- POST /api/discovery/scan ---
    if (method === 'POST' && pathname === '/api/discovery/scan') {
      discoveryScanner?.scan?.();
      return respond(res, 202, { ok: true });
    }

    const umpProbeMatch = pathname.match(/^\/api\/diagnostics\/ump\/([^/]+)$/);
    if (method === 'POST' && umpProbeMatch) {
      const switchId = decodeURIComponent(umpProbeMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const probe = buildTelegram(buildVideoStateRequest());
      const requestedAt = new Date().toISOString();
      discoveryRegistry.updateDiagnosticsBySwitchId(switchId, {
        ump_probe_status: 'pending',
        ump_probe_requested_at: requestedAt,
        ump_probe_error: null,
      });
      udpSend(target.ip, config.listen_port || 34988, probe);
      setTimeout(() => {
        const current = discoveryRegistry.getStore().get(switchId);
        if (current?.ump_probe_requested_at === requestedAt && current.ump_probe_status === 'pending') {
          discoveryRegistry.updateDiagnosticsBySwitchId(switchId, {
            ump_probe_status: 'timeout',
            ump_probe_error: 'No UMP response received within 3 seconds',
          });
        }
      }, 3000);
      log.info(`Sent UMP VideoState probe to ${target.ip}:${config.listen_port || 34988}`);
      return respond(res, 202, { ok: true, message: 'UMP probe sent' });
    }

    // --- GET /api/registry/devices ---
    if (method === 'GET' && pathname === '/api/registry/devices') {
      const registryStore = discoveryRegistry?.getStore?.();
      if (!registryStore) {
        return respond(res, 500, { error: 'Registry not available' });
      }
      const devices = registryStore.getAll();
      return respond(res, 200, { devices });
    }

    // --- GET /api/registry/devices/:switchId ---
    const registryGetMatch = pathname.match(/^\/api\/registry\/devices\/([^/]+)$/);
    if (method === 'GET' && registryGetMatch) {
      const switchId = decodeURIComponent(registryGetMatch[1]);
      const registryStore = discoveryRegistry?.getStore?.();
      if (!registryStore) {
        return respond(res, 500, { error: 'Registry not available' });
      }
      const device = registryStore.get(switchId);
      if (!device) {
        return respond(res, 404, { error: `Device not found: ${switchId}` });
      }
      return respond(res, 200, { device });
    }

    // --- POST /api/registry/devices ---
    if (method === 'POST' && pathname === '/api/registry/devices') {
      const registryStore = discoveryRegistry?.getStore?.();
      if (!registryStore) {
        return respond(res, 500, { error: 'Registry not available' });
      }

      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        return respond(res, 400, { error: `Invalid JSON body: ${err.message}` });
      }

      try {
        const device = discoveryRegistry.registerDevice(payload);
        if (config.mode.mqtt && config.mode.mqtt_discovery && device.mqtt_discovery) {
          mqttClient?.publishDiscovery(device);
        }
        log.info(`HTTP API: registered device "${device.switch_id}" (${device.ip})`);
        return respond(res, 201, { device });
      } catch (err) {
        return respond(res, 400, { error: err.message });
      }
    }

    // --- PUT /api/registry/devices/:switchId ---
    const registryUpdateMatch = pathname.match(/^\/api\/registry\/devices\/([^/]+)$/);
    if (method === 'PUT' && registryUpdateMatch) {
      const switchId = decodeURIComponent(registryUpdateMatch[1]);
      const registryStore = discoveryRegistry?.getStore?.();
      if (!registryStore) {
        return respond(res, 500, { error: 'Registry not available' });
      }

      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        return respond(res, 400, { error: `Invalid JSON body: ${err.message}` });
      }

      try {
        const device = discoveryRegistry.registerDevice({ ...payload, switch_id: switchId });
        if (config.mode.mqtt && config.mode.mqtt_discovery) {
          if (device.mqtt_discovery) mqttClient?.publishDiscovery(device);
          else mqttClient?.removeDiscovery(device.switch_id);
        }
        log.info(`HTTP API: updated device "${device.switch_id}"`);
        return respond(res, 200, { device });
      } catch (err) {
        return respond(res, 400, { error: err.message });
      }
    }

    const registryLinkMatch = pathname.match(/^\/api\/registry\/devices\/([^/]+)\/(link|unlink)$/);
    if (method === 'POST' && registryLinkMatch) {
      const switchId = decodeURIComponent(registryLinkMatch[1]);
      const action = registryLinkMatch[2];
      const registryStore = discoveryRegistry?.getStore?.();
      if (!registryStore) return respond(res, 500, { error: 'Registry not available' });
      let payload = {};
      if (action === 'link') {
        try {
          payload = await readJsonBody(req);
        } catch (err) {
          return respond(res, 400, { error: `Invalid JSON body: ${err.message}` });
        }
        if (!payload.ha_entry_id) return respond(res, 400, { error: 'ha_entry_id is required' });
      }
      const device = action === 'link'
        ? registryStore.linkEntry(switchId, payload.ha_entry_id)
        : registryStore.unlinkEntry(switchId);
      if (!device) return respond(res, 404, { error: `Device not found: ${switchId}` });
      return respond(res, 200, { device });
    }

    // --- DELETE /api/registry/devices/:switchId ---
    const registryDeleteMatch = pathname.match(/^\/api\/registry\/devices\/([^/]+)$/);
    if (method === 'DELETE' && registryDeleteMatch) {
      const switchId = decodeURIComponent(registryDeleteMatch[1]);
      const registryStore = discoveryRegistry?.getStore?.();
      if (!registryStore) {
        return respond(res, 500, { error: 'Registry not available' });
      }

      const device = registryStore.get(switchId);
      let haDeleteError = null;
      const deleteFromHa = parsedUrl.searchParams.get('delete_from_homeassistant') === 'true';
      if (deleteFromHa) {
        try {
          if (!haClient) {
            throw new Error('Home Assistant device management is disabled or unavailable');
          }
          const entryIds = new Set();
          if (device?.linked_entry_id) entryIds.add(device.linked_entry_id);

          const entries = await haClient.getConfigEntries();
          for (const entry of entries) {
            if (
              entry.domain === 'ulux_display' &&
              String(entry.data?.switch_id || '').toUpperCase() === switchId.toUpperCase() &&
              (!device?.bridge_url || entry.data?.bridge_url === device.bridge_url)
            ) {
              entryIds.add(entry.entry_id);
            }
          }

          for (const entryId of entryIds) {
            await haClient.deleteConfigEntry(entryId);
          }
          log.info(`HA config entries removed for "${switchId}": ${entryIds.size}`);
        } catch (err) {
          haDeleteError = err.message;
          log.warning(`Failed to delete HA config entry for "${switchId}": ${err.message}`);
        }
      }

      const removed = discoveryRegistry.unregisterDevice(switchId);
      if (!removed) {
        return respond(res, 404, { error: `Device not found: ${switchId}` });
      }
      if (config.mode.mqtt && config.mode.mqtt_discovery) {
        mqttClient?.removeDiscovery(switchId);
      }
      log.info(`HTTP API: removed device "${switchId}"`);
      return respond(res, 200, {
        ok: true,
        bridge_deleted: true,
        homeassistant_deleted: deleteFromHa && !haDeleteError,
        warning: haDeleteError || undefined,
      });
    }

    // --- POST /api/display/image/:switchId ---
    const imageMatch = pathname.match(/^\/api\/display\/image\/([^/]+)$/);
    if (method === 'POST' && imageMatch) {
      const switchId = decodeURIComponent(imageMatch[1]);

      const sw = getSwitchTarget(switchId);
      if (!sw) {
        log.warning(`HTTP API: unknown switch_id="${switchId}"`);
        return respond(res, 404, { error: `Unknown switch_id: ${switchId}` });
      }

      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        return respond(res, 400, { error: `Invalid JSON body: ${err.message}` });
      }

      if (!payload.base64) {
        return respond(res, 400, { error: 'Missing required field: base64' });
      }

      const remotePort = sw.port || config.listen_port || 34988;

      try {
        await streamImageToSwitch({
          source: { base64: payload.base64 },
          remoteHost: sw.ip,
          remotePort,
          udpSend,
          log,
          width:  payload.width  || streamCfg.width  || 240,
          height: payload.height || streamCfg.height || 240,
          linesPerPacket:      streamCfg.lines_per_packet      || 5,
          interPacketDelayMs:  streamCfg.inter_packet_delay_ms ?? 5,
        });

        log.info(`HTTP API: streamed image to switch "${switchId}" (${sw.ip}:${remotePort})`);
        return respond(res, 200, { ok: true });
      } catch (err) {
        log.error(`HTTP API: image stream failed for switch "${switchId}": ${err.message}`);
        return respond(res, 500, { error: err.message });
      }
    }

    return respond(res, 404, { error: 'Not found' });
  }

  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = parsedUrl.pathname;
      log.error(`HTTP API unhandled error on ${req.method} ${pathname}: ${err.message}`);
      if (!res.headersSent) {
        if (isApiPath(pathname)) {
          respond(res, 500, { error: 'Internal server error' });
          return;
        }
        const text = 'Internal server error';
        res.writeHead(500, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Length': Buffer.byteLength(text),
        });
        res.end(text);
      }
    });
  });

  return {
    start() {
      server.listen(apiPort, '0.0.0.0', () => {
        log.info(`HTTP API server listening on port ${apiPort}`);
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          log.error(`HTTP API port ${apiPort} is already in use. Another bridge instance may still be running.`);
          return;
        }
        log.error(`HTTP API server error: ${err.message}`);
      });
    },
    close() {
      server.close();
    },
  };
}

module.exports = { createApiServer };
