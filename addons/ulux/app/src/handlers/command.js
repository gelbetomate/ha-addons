'use strict';

const { streamImageToSwitch } = require('../ump/videoStream');

const DISPLAY_IMAGE_COMMAND = 'display/image';

/**
 * Handle MQTT command payloads and dispatch UMP actions.
 *
 * Supported command topic suffix:
 *   <base_topic>/<switch_id>/cmd/display/image
 */
async function handleCommandMessage(cmd, { config, udpSend, log }) {
  if (!cmd || !cmd.command) return;

  if (cmd.command !== DISPLAY_IMAGE_COMMAND) {
    log.warning(`Unsupported MQTT command "${cmd.command}" on ${cmd.topic}`);
    return;
  }

  const sw = findSwitch(config.switches, cmd.switchId);
  if (!sw) {
    log.warning(`display/image command for unknown switch_id="${cmd.switchId}"`);
    return;
  }

  const payload = normalisePayload(cmd.payload);
  const source = pickImageSource(payload);
  if (!source) {
    log.warning('display/image command missing image source (url, base64, or path)');
    return;
  }

  const remotePort = normalisePort(sw.port, config.listen_port);
  const streamConfig = config.stream || {};

  await streamImageToSwitch({
    source,
    remoteHost: sw.ip,
    remotePort,
    udpSend,
    log,
    width: coercePositiveInt(payload.width) || coercePositiveInt(streamConfig.width) || 86,
    height: coercePositiveInt(payload.height) || coercePositiveInt(streamConfig.height) || 90,
    linesPerPacket: coercePositiveInt(payload.lines_per_packet) || coercePositiveInt(streamConfig.lines_per_packet) || 5,
    interPacketDelayMs: coerceNonNegativeInt(payload.inter_packet_delay_ms)
      ?? coerceNonNegativeInt(streamConfig.inter_packet_delay_ms)
      ?? 5,
    sequenceId: coerceNonNegativeInt(payload.sequence_id),
  });
}

function findSwitch(switches, switchId) {
  if (!switchId) return null;
  const wanted = String(switchId).toUpperCase();
  return switches.find((sw) => String(sw.switch_id || '').toUpperCase() === wanted) || null;
}

function normalisePayload(payload) {
  if (payload && typeof payload === 'object') {
    return payload;
  }

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return { url: trimmed };
    }
    return { path: trimmed };
  }

  return {};
}

function pickImageSource(payload) {
  if (typeof payload.url === 'string' && payload.url.trim()) {
    return { url: payload.url.trim() };
  }

  if (typeof payload.base64 === 'string' && payload.base64.trim()) {
    return { base64: payload.base64.trim() };
  }

  if (typeof payload.path === 'string' && payload.path.trim()) {
    return { path: payload.path.trim() };
  }

  return null;
}

function normalisePort(switchPort, fallbackPort) {
  const p = Number(switchPort || fallbackPort || 34988);
  return Number.isInteger(p) && p > 0 && p <= 65535 ? p : 34988;
}

function coercePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function coerceNonNegativeInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

module.exports = { handleCommandMessage, DISPLAY_IMAGE_COMMAND };
