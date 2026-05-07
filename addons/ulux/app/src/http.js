'use strict';

const { createServer } = require('http');
const { streamImageToSwitch } = require('./ump/videoStream');

/**
 * Create the bridge HTTP API server.
 *
 * Exposes a REST API so that the u::lux Display custom integration can
 * delegate image streaming to the bridge, keeping all UMP/UDP logic in one place.
 *
 * Endpoints:
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
 *   GET /api/health
 *     Response 200: { "ok": true }
 *
 * @param {object}   opts
 * @param {object}   opts.config   - Full add-on config
 * @param {Function} opts.udpSend  - udpSend(host, port, buf) from the UDP server
 * @param {object}   opts.log      - Logger
 * @returns {{ start: Function, close: Function }}
 */
function createApiServer({ config, udpSend, log }) {
  const apiPort = config.api_port || 8099;
  const streamCfg = config.stream || {};

  function respond(res, status, body) {
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

  async function handleRequest(req, res) {
    const { method, url } = req;

    // --- GET /api/health ---
    if (method === 'GET' && url === '/api/health') {
      return respond(res, 200, { ok: true });
    }

    // --- POST /api/display/image/:switchId ---
    const imageMatch = url && url.match(/^\/api\/display\/image\/([^/?]+)/);
    if (method === 'POST' && imageMatch) {
      const switchId = decodeURIComponent(imageMatch[1]);

      const sw = (config.switches || []).find(
        (s) => String(s.switch_id || '').toLowerCase() === switchId.toLowerCase()
      );
      if (!sw) {
        log.warning(`HTTP API: unknown switch_id="${switchId}"`);
        return respond(res, 404, { error: `Unknown switch_id: ${switchId}` });
      }

      let payload;
      try {
        const body = await readBody(req);
        payload = JSON.parse(body);
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
      log.error(`HTTP API unhandled error: ${err.message}`);
      if (!res.headersSent) {
        respond(res, 500, { error: 'Internal server error' });
      }
    });
  });

  return {
    start() {
      server.listen(apiPort, '0.0.0.0', () => {
        log.info(`HTTP API server listening on port ${apiPort}`);
      });
      server.on('error', (err) => {
        log.error(`HTTP API server error: ${err.message}`);
      });
    },
    close() {
      server.close();
    },
  };
}

module.exports = { createApiServer };
