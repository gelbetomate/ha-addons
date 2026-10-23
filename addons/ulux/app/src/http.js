'use strict';

const { createServer } = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { createStreamManager } = require('./ump/videoStream');
const {
  buildTelegramForDevice,
  buildInitializationRequest,
  buildPageIndexMessage,
  buildActivateMessage,
  buildLedMessage,
  buildTextMessage,
  buildEditValueMessage,
  buildRealValueMessage,
  buildValueMessage,
  buildAudioPlayLocalMessage,
  buildAudioControlMessage,
  buildAudioStopMessage,
  buildAudioVolumeMessage,
  buildIdInitMessage,
} = require('./ump/builder');

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
function createApiServer({ config, udpSend, audioTransport, discoveryRegistry, discoveryScanner, haClient, mqttClient, log }) {
  const apiPort = config.api_port || 8099;
  const streamCfg = config.stream || {};
  let discoveryScanState = { status: 'idle', started_at: null, completed_at: null };
  const streamManager = createStreamManager({ udpSend, log });
  const audioWebSocket = new WebSocket.Server({ noServer: true });

  audioWebSocket.on('connection', (ws, request, context) => {
    const { switchId, mode } = context;
    const target = getSwitchTarget(switchId);
    if (!target || !audioTransport) {
      ws.close(1008, 'Unknown audio device');
      return;
    }

    const receiveAudio = mode === 'receive' || mode === 'duplex';
    const sendAudio = mode === 'send' || mode === 'duplex';
    const unsubscribe = receiveAudio
      ? audioTransport.subscribe(switchId, (frame) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
          type: 'audio_start',
          sample_rate: frame.sampleRate,
          width: frame.width,
          channels: frame.channels,
          sequence: frame.sequence,
          missing: Boolean(frame.missing),
        }));
        ws.send(frame.pcm, { binary: true });
      })
      : () => {};
    const sender = sendAudio
      ? audioTransport.createSender({
        remoteHost: target.ip,
        remotePort: config.audio_port || 35000,
      })
      : null;
    sender?.start();

    ws.on('message', (data, isBinary) => {
      if (sender && isBinary) sender.push(Buffer.from(data));
    });
    ws.on('close', () => {
      unsubscribe();
      sender?.stop();
    });
    ws.send(JSON.stringify({ type: 'ready', switch_id: switchId, mode }));
    log.info(`Audio WebSocket connected for ${switchId} (${mode})`);
  });

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
        ump_device_id: fromRegistry.ump_device_id || 0x5d,
        ump_frame_version: fromRegistry.ump_frame_version || 0x0232,
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

    const streamStatusMatch = pathname.match(/^\/api\/display\/stream\/([^/]+)$/);
    if (method === 'GET' && streamStatusMatch) {
      const switchId = decodeURIComponent(streamStatusMatch[1]);
      return respond(res, 200, { switch_id: switchId, stream: streamManager.status(switchId) });
    }

    const streamStopMatch = pathname.match(/^\/api\/display\/stream\/([^/]+)\/stop$/);
    if (method === 'POST' && streamStopMatch) {
      const switchId = decodeURIComponent(streamStopMatch[1]);
      const sw = getSwitchTarget(switchId);
      if (!sw) return respond(res, 404, { error: `Unknown switch_id: ${switchId}` });
      streamManager.stop(
        switchId,
        sw.ip,
        sw.port || config.listen_port || 34988,
      );
      return respond(res, 200, { ok: true, switch_id: switchId });
    }

    // --- GET /api/discovery/devices ---
    if (method === 'GET' && pathname === '/api/discovery/devices') {
      const devices = discoveryRegistry ? discoveryRegistry.list() : [];
      return respond(res, 200, { devices });
    }

    // --- POST /api/discovery/scan ---
    if (method === 'POST' && pathname === '/api/discovery/scan') {
      if (discoveryScanState.status === 'running') {
        return respond(res, 202, { ok: true, scan: discoveryScanState });
      }
      discoveryScanState = { status: 'running', started_at: new Date().toISOString(), completed_at: null };
      discoveryScanner?.scanAndWait?.(12000)
        .then(() => {
          discoveryScanState = { ...discoveryScanState, status: 'complete', completed_at: new Date().toISOString() };
        })
        .catch((err) => {
          discoveryScanState = { ...discoveryScanState, status: 'error', error: err.message, completed_at: new Date().toISOString() };
          log.warning(`Discovery scan failed: ${err.message}`);
        });
      return respond(res, 202, { ok: true, scan: discoveryScanState });
    }

    if (method === 'GET' && pathname === '/api/discovery/scan') {
      return respond(res, 200, { scan: discoveryScanState });
    }

    if (method === 'GET' && pathname === '/api/registry/pending-deletions') {
      return respond(res, 200, { devices: discoveryRegistry.listPendingDeletions() });
    }

    const pendingDeletionMatch = pathname.match(/^\/api\/registry\/pending-deletions\/([^/]+)$/);
    if (method === 'DELETE' && pendingDeletionMatch) {
      discoveryRegistry.clearPendingDeletion(decodeURIComponent(pendingDeletionMatch[1]));
      return respond(res, 204);
    }

    const umpProbeMatch = pathname.match(/^\/api\/diagnostics\/ump\/([^/]+)$/);
    if (method === 'POST' && umpProbeMatch) {
      const switchId = decodeURIComponent(umpProbeMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const registryRecord = discoveryRegistry?.getStore?.()?.get?.(switchId);
      const deviceIds = registryRecord?.ump_device_id == null
        ? [1, 93, 0x5D]
        : [target.ump_device_id];
      const probes = deviceIds.map((deviceId) => buildTelegramForDevice(
        deviceId,
        target.ump_frame_version,
        buildInitializationRequest(),
      ));
      const probe = probes[0];
      const requestedAt = new Date().toISOString();
      discoveryRegistry.updateDiagnosticsBySwitchId(switchId, {
        ump_probe_status: 'pending',
        ump_probe_requested_at: requestedAt,
        ump_probe_error: null,
        ump_tx_hex: probe.toString('hex'),
        ump_rx_hex: null,
      });
      probes.forEach((candidate, index) => {
        setTimeout(() => udpSend(target.ip, config.listen_port || 34988, candidate), index * 100);
      });
      setTimeout(() => {
        const current = discoveryRegistry.getStore().get(switchId);
        if (current?.ump_probe_requested_at === requestedAt && current.ump_probe_status === 'pending') {
          discoveryRegistry.updateDiagnosticsBySwitchId(switchId, {
            ump_probe_status: 'timeout',
            ump_probe_error: 'No UMP response received within 3 seconds',
          });
        }
      }, 3000);
      log.info(
        `Sent UMP initialization probes (device IDs ${deviceIds.join(', ')}) ` +
        `to ${target.ip}:${config.listen_port || 34988}`,
      );
      return respond(res, 202, { ok: true, message: 'UMP probe sent' });
    }

    // --- POST /api/switch/:switchId/page ---
    const pageMatch = pathname.match(/^\/api\/switch\/([^/]+)\/page$/);
    if (method === 'POST' && pageMatch) {
      const switchId = decodeURIComponent(pageMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const hasPageIndex = body.page_index !== undefined;
      const pageIndex = hasPageIndex
        ? Math.max(0, Number(body.page_index))
        : Math.max(0, Number(body.page ?? body.page_number ?? 1) - 1);
      const pageNumber = pageIndex + 1;
      const telegram = buildTelegramForDevice(
        target.ump_device_id,
        target.ump_frame_version,
        buildPageIndexMessage(pageIndex)
      );
      udpSend(target.ip, target.port || 34988, telegram);
      log.info(`API: Sent PageIndex (${pageIndex}) to ${target.ip}:${target.port || 34988}`);
      return respond(res, 200, { ok: true, switch_id: switchId, page: pageNumber, page_index: pageIndex });
    }

    // --- POST /api/switch/:switchId/activate ---
    const activateMatch = pathname.match(/^\/api\/switch\/([^/]+)\/activate$/);
    if (method === 'POST' && activateMatch) {
      const switchId = decodeURIComponent(activateMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const active = body.active !== false && body.activate !== false;
      const telegram = buildTelegramForDevice(
        target.ump_device_id,
        target.ump_frame_version,
        buildActivateMessage({ activate: active, deactivate: !active })
      );
      udpSend(target.ip, target.port || 34988, telegram);
      log.info(`API: Sent Activate (active=${active}) to ${target.ip}:${target.port || 34988}`);
      return respond(res, 200, { ok: true, switch_id: switchId, active });
    }

    // --- POST /api/switch/:switchId/led ---
    const ledMatch = pathname.match(/^\/api\/switch\/([^/]+)\/led$/);
    if (method === 'POST' && ledMatch) {
      const switchId = decodeURIComponent(ledMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const actorId = Number(body.actor_id ?? 1);
      const leds = Array.isArray(body.leds) ? body.leds : [];
      const telegram = buildTelegramForDevice(
        target.ump_device_id,
        target.ump_frame_version,
        buildLedMessage(actorId, leds)
      );
      udpSend(target.ip, target.port || 34988, telegram);
      log.info(`API: Sent LED command to ${target.ip}:${target.port || 34988} (actor=${actorId})`);
      return respond(res, 200, { ok: true, switch_id: switchId, actor_id: actorId });
    }

    // --- POST /api/switch/:switchId/text ---
    const textMatch = pathname.match(/^\/api\/switch\/([^/]+)\/text$/);
    if (method === 'POST' && textMatch) {
      const switchId = decodeURIComponent(textMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const actorId = Number(body.actor_id ?? 1);
      const textId = Number(body.text_id ?? 0);
      const text = String(body.text ?? '');
      const color = body.color || { r: 255, g: 255, b: 255 };
      const telegram = buildTelegramForDevice(
        target.ump_device_id,
        target.ump_frame_version,
        buildTextMessage(actorId, textId, text, {
          color,
          visible: body.visible !== false,
          remove: Boolean(body.remove),
        })
      );
      udpSend(target.ip, target.port || 34988, telegram);
      log.info(`API: Sent Text command to ${target.ip}:${target.port || 34988} (actor=${actorId}, textId=${textId})`);
      return respond(res, 200, { ok: true, switch_id: switchId, actor_id: actorId, text_id: textId });
    }

    // --- POST /api/switch/:switchId/value ---
    const valueMatch = pathname.match(/^\/api\/switch\/([^/]+)\/value$/);
    if (method === 'POST' && valueMatch) {
      const switchId = decodeURIComponent(valueMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const actorId = Number(body.actor_id ?? 1);
      let telegram;
      if (body.edit_value !== undefined && body.real_values !== undefined) {
        telegram = buildTelegramForDevice(
          target.ump_device_id,
          target.ump_frame_version,
          buildValueMessage(actorId, Number(body.edit_value), body.real_values)
        );
      } else if (body.edit_value !== undefined) {
        telegram = buildTelegramForDevice(
          target.ump_device_id,
          target.ump_frame_version,
          buildEditValueMessage(actorId, Number(body.edit_value))
        );
      } else if (body.real_values !== undefined) {
        telegram = buildTelegramForDevice(
          target.ump_device_id,
          target.ump_frame_version,
          buildRealValueMessage(actorId, body.real_values)
        );
      } else if (typeof body.value === 'number') {
        telegram = buildTelegramForDevice(
          target.ump_device_id,
          target.ump_frame_version,
          buildEditValueMessage(actorId, body.value)
        );
      }
      if (telegram) {
        udpSend(target.ip, target.port || 34988, telegram);
        log.info(`API: Sent Value command to ${target.ip}:${target.port || 34988} (actor=${actorId})`);
        return respond(res, 200, { ok: true, switch_id: switchId, actor_id: actorId });
      }
      return respond(res, 400, { error: 'Missing edit_value, real_values, or value' });
    }

    // --- POST /api/switch/:switchId/audio/play ---
    const audioPlayMatch = pathname.match(/^\/api\/switch\/([^/]+)\/audio\/play$/);
    if (method === 'POST' && audioPlayMatch) {
      const switchId = decodeURIComponent(audioPlayMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const telegram = buildTelegramForDevice(
        target.ump_device_id,
        target.ump_frame_version,
        buildAudioPlayLocalMessage({
          soundIndex: Number(body.sound_index ?? 1),
          volume: Number(body.volume ?? 100),
          repeats: Number(body.repeats ?? 0),
          delayBeforeRepeat: Number(body.delay_before_repeat ?? 0),
          equalizer: Number(body.equalizer ?? 0),
          alarm: Boolean(body.alarm),
          incVolumeTime: Number(body.inc_volume_time ?? 0),
        })
      );
      udpSend(target.ip, target.port || 34988, telegram);
      log.info(`API: Sent AudioPlayLocal to ${target.ip}:${target.port || 34988}`);
      return respond(res, 200, { ok: true, switch_id: switchId });
    }

    // --- POST /api/switch/:switchId/audio/stop ---
    const audioStopMatch = pathname.match(/^\/api\/switch\/([^/]+)\/audio\/stop$/);
    if (method === 'POST' && audioStopMatch) {
      const switchId = decodeURIComponent(audioStopMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const telegram = buildTelegramForDevice(
        target.ump_device_id,
        target.ump_frame_version,
        buildAudioStopMessage({
          stopNormal: body.stop_normal !== false,
          stopAlarm: Boolean(body.stop_alarm),
        })
      );
      udpSend(target.ip, target.port || 34988, telegram);
      log.info(`API: Sent AudioStop to ${target.ip}:${target.port || 34988}`);
      return respond(res, 200, { ok: true, switch_id: switchId });
    }

    // --- POST /api/switch/:switchId/audio/volume ---
    const audioVolumeMatch = pathname.match(/^\/api\/switch\/([^/]+)\/audio\/volume$/);
    if (method === 'POST' && audioVolumeMatch) {
      const switchId = decodeURIComponent(audioVolumeMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const volume = Number(body.volume ?? 50);
      const telegram = buildTelegramForDevice(
        target.ump_device_id,
        target.ump_frame_version,
        buildAudioVolumeMessage(volume)
      );
      udpSend(target.ip, target.port || 34988, telegram);
      log.info(`API: Sent AudioVolume (${volume}%) to ${target.ip}:${target.port || 34988}`);
      return respond(res, 200, { ok: true, switch_id: switchId, volume });
    }

    // --- POST /api/switch/:switchId/audio/config ---
    const audioConfigMatch = pathname.match(/^\/api\/switch\/([^/]+)\/audio\/config$/);
    if (method === 'POST' && audioConfigMatch) {
      const switchId = decodeURIComponent(audioConfigMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const targetIp = String(body.target_ip || config.audio_target_ip || '').trim();
      if (!targetIp) return respond(res, 400, { error: 'Missing target_ip' });

      let controlMessage;
      try {
        controlMessage = buildAudioControlMessage({
          targetIp,
          targetPort: Number(body.target_port ?? config.audio_port ?? 35000),
          micOn: Boolean(body.mic_on),
          micGain: Number(body.mic_gain ?? 0),
          speakerOn: body.speaker_on !== false,
          speakerVolume: Number(body.speaker_volume ?? 100),
        });
      } catch (err) {
        return respond(res, 400, { error: err.message });
      }

      udpSend(target.ip, config.audio_control_port || 35004, controlMessage);
      log.info(`API: Sent audio control to ${target.ip}:${config.audio_control_port || 35004}`);
      return respond(res, 200, {
        ok: true,
        switch_id: switchId,
        control_port: config.audio_control_port || 35004,
        target_ip: targetIp,
        target_port: Number(body.target_port ?? config.audio_port ?? 35000),
        mic_on: Boolean(body.mic_on),
        speaker_on: body.speaker_on !== false,
      });
    }

    // --- POST /api/switch/:switchId/ump/raw ---
    const rawMatch = pathname.match(/^\/api\/switch\/([^/]+)\/ump\/raw$/);
    if (method === 'POST' && rawMatch) {
      const switchId = decodeURIComponent(rawMatch[1]);
      const target = getSwitchTarget(switchId);
      if (!target) return respond(res, 404, { error: `Device not found: ${switchId}` });
      const body = await readJsonBody(req).catch(() => ({}));
      const hex = typeof body === 'string' ? body : (body.hex || '');
      const buf = Buffer.from(hex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
      if (!buf.length) return respond(res, 400, { error: 'Invalid or empty hex payload' });
      udpSend(target.ip, target.port || 34988, buf);
      log.info(`API: Sent raw UMP telegram (${buf.length} bytes) to ${target.ip}:${target.port || 34988}`);
      return respond(res, 200, { ok: true, switch_id: switchId, bytes_sent: buf.length });
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
        registryStore.save();
        if (config.mode.mqtt && config.mode.mqtt_discovery && device.mqtt_discovery) {
          mqttClient?.publishDiscovery(device);
        }
        log.info(`HTTP API: registered device "${device.switch_id}" (${device.ip})`);
        return respond(res, 201, { device });
      } catch (err) {
        return respond(res, 400, { error: err.message });
      }
    }

    if (method === 'POST' && pathname === '/api/registry/import') {
      const registryStore = discoveryRegistry?.getStore?.();
      if (!registryStore) return respond(res, 500, { error: 'Registry not available' });
      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        return respond(res, 400, { error: `Invalid JSON body: ${err.message}` });
      }
      if (!Array.isArray(payload.devices)) {
        return respond(res, 400, { error: 'devices array is required' });
      }
      try {
        const devices = payload.devices.map((device) => discoveryRegistry.registerDevice(device));
        registryStore.save();
        log.info(`HTTP API: imported ${devices.length} devices`);
        return respond(res, 200, { devices });
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
        registryStore.save();
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

      if (deleteFromHa && haDeleteError) {
        discoveryRegistry.queueDeletion({ ...device, switch_id: switchId });
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
        discovery_retained: true,
        pending_homeassistant_delete: Boolean(deleteFromHa && haDeleteError),
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
        await streamManager.streamImageToSwitch(switchId, {
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

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const match = requestUrl.pathname.match(/^\/api\/audio\/ws\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }
    const switchId = decodeURIComponent(match[1]);
    const mode = requestUrl.searchParams.get('mode') || 'receive';
    if (!['receive', 'send', 'duplex'].includes(mode)) {
      socket.destroy();
      return;
    }
    audioWebSocket.handleUpgrade(request, socket, head, (ws) => {
      audioWebSocket.emit('connection', ws, request, { switchId, mode });
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
