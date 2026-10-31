'use strict';

const { mqttDeviceKey } = require('../mqtt/topics');

/**
 * Handler for ID-State (MessageID=0x01) messages.
 *
 * Message layout (8 bytes, or 4 bytes when requested without flags):
 *   Byte 0    : MessageLength (0x08 or 0x04)
 *   Byte 1    : MessageID = 0x01
 *   Bytes 2-3 : ActorID (UInt16LE, always 0x0000)
 *   Bytes 4-7 : StateFlags (UInt32LE) — only present when MessageLength >= 8
 *
 * StateFlags bit meanings (from UMP spec / XAMControlUlux):
 *   Bit 5 : TimeRequest  — switch wants a DateTime sync reply
 *   Bit 6 : InitRequest  — switch needs an ID-Control initialisation reply
 *
 * When InitRequest is set we send back an ID-Control telegram.
 * When TimeRequest is set we send back a DateTime telegram.
 * Both replies go to remote.address:remote.port (dynamic reply-to-sender).
 */

const {
  buildCO2Request,
  buildDateTimeMessage,
  buildHumidityRequest,
  buildIdControlMessage,
  buildRequestMessage,
  buildIN2Request,
  buildIRRequest,
  buildLuxRequest,
  buildTemperatureRequest,
  buildTelegramForDevice,
  buildVOCRequest,
} = require('../ump/builder');

const STATE_FLAG_TIME_REQUEST = 1 << 5;  // bit 5
const STATE_FLAG_INIT_REQUEST = 1 << 6;  // bit 6
const DEFAULT_SENSOR_POLL_INTERVAL_MS = 60000;
const sensorPollers = new Map();
const timeSynced = new Set();

function startSensorPolling(senderIp, senderPort, deviceId, frameVersion, udpSend, log, intervalMs) {
  if (sensorPollers.has(senderIp)) return;
  const poll = () => {
    const telegram = buildTelegramForDevice(
      deviceId,
      frameVersion,
      buildRequestMessage(0x01),
      buildTemperatureRequest(),
      buildHumidityRequest(),
      buildCO2Request(),
      buildIN2Request(),
      buildVOCRequest(),
      buildLuxRequest(),
      buildIRRequest(),
    );
    udpSend(senderIp, senderPort, telegram);
    log.debug(`Requested UMP sensors from ${senderIp}:${senderPort}`);
  };
  poll();
  sensorPollers.set(senderIp, setInterval(poll, intervalMs));
}

/**
 * @param {object} msg      - Parsed message object from parseTelegram()
 * @param {object} ctx      - Packet context {senderIp, senderPort, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, udpSend, log}
 */
function handleState(msg, ctx, { config, haClient, mqttClient, discoveryRegistry, udpSend, log }) {
  const { senderIp, senderPort, switch: sw, timestamp } = ctx;

  let stateFlags = 0;
  const hasFlags = msg.length >= 8;
  if (hasFlags) {
    stateFlags = msg.data.readUInt32LE(4);
  }

  const timeRequest = (stateFlags & (1 << 5)) !== 0;
  const initRequest = (stateFlags & (1 << 6)) !== 0;

  const decodedState = {
    light_sensor:          Boolean(stateFlags & (1 << 0)),
    proximity_sensor:      Boolean(stateFlags & (1 << 1)),
    display_active:        Boolean(stateFlags & (1 << 2)),
    audio_active:          Boolean(stateFlags & (1 << 3)),
    intro_active:          Boolean(stateFlags & (1 << 4)),
    time_request:          timeRequest,
    init_request:          initRequest,
    internal_error:        Boolean(stateFlags & (1 << 7)),
    motion_detector:       Boolean(stateFlags & (1 << 11)),
    lux_valid:             Boolean(stateFlags & (1 << 12)),
    temperature_valid:     Boolean(stateFlags & (1 << 24)),
    humidity_valid:        Boolean(stateFlags & (1 << 25)),
    co2_valid:             Boolean(stateFlags & (1 << 26)),
    in2_valid:             Boolean(stateFlags & (1 << 27)),
    voc_valid:             Boolean(stateFlags & (1 << 28)),
    motion_detector_valid: Boolean(stateFlags & (1 << 29)),
  };

  discoveryRegistry?.updateState?.(senderIp, decodedState, stateFlags);
  startSensorPolling(
    senderIp,
    senderPort,
    ctx.telegram?.deviceId ?? 0x5D,
    ctx.telegram?.frameVersion ?? 0x0232,
    udpSend,
    log,
    Number(config.sensor_poll_interval_ms) || DEFAULT_SENSOR_POLL_INTERVAL_MS,
  );

  log.info(
    `ID-State from ${senderIp}:${senderPort} switch="${sw.name}" ` +
    `stateFlags=0x${stateFlags.toString(16).padStart(8, '0')} ` +
    `displayActive=${decodedState.display_active} proximity=${decodedState.proximity_sensor} ` +
    `initRequest=${initRequest} timeRequest=${timeRequest}`
  );

  // ── Emit HA event ──────────────────────────────────────────────────────────
  const event = {
    switch_id:    sw.switch_id,
    switch_name:  sw.name,
    ip:           senderIp,
    actor_id:     msg.actorId,
    state_flags:  stateFlags,
    decoded:      decodedState,
    init_request: initRequest,
    time_request: timeRequest,
    timestamp,
  };

  if (haClient && config.mode.ha_events) {
    haClient.fireEvent('ulux_state', event).catch((err) =>
      log.error('Failed to fire HA event ulux_state (state):', err.message)
    );
  }

  if (mqttClient && config.mode.mqtt) {
    const topic = `${config.mqtt.base_topic}/${mqttDeviceKey(sw)}/event/state`;
    mqttClient.publish(topic, JSON.stringify(event));
  }

  // ── Protocol responses ─────────────────────────────────────────────────────
  if (!hasFlags) return; // no flags → nothing to respond to

  if (initRequest) {
    const controlFlags = typeof config.control_flags === 'number'
      ? config.control_flags
      : 0xBF08001F;
    const telegram = buildTelegramForDevice(
      ctx.telegram?.deviceId ?? 0x5D,
      ctx.telegram?.frameVersion ?? 0x0232,
      buildIdControlMessage(controlFlags),
    );
    log.info(`Sending ID-Control (flags=0x${controlFlags.toString(16)}) to ${senderIp}:${senderPort}`);
    udpSend(senderIp, senderPort, telegram);
  }

  if (timeRequest || !timeSynced.has(senderIp)) {
    const telegram = buildTelegramForDevice(
      ctx.telegram?.deviceId ?? 0x5D,
      ctx.telegram?.frameVersion ?? 0x0232,
      buildDateTimeMessage(undefined, config.timezone),
    );
    log.info(`Sending DateTime to ${senderIp}:${senderPort}`);
    udpSend(senderIp, senderPort, telegram);
    timeSynced.add(senderIp);
  }
}

module.exports = handleState;
