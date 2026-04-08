'use strict';

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

const { buildIdControlMessage, buildDateTimeMessage, buildTelegram } = require('../ump/builder');

const STATE_FLAG_TIME_REQUEST = 1 << 5;  // bit 5
const STATE_FLAG_INIT_REQUEST = 1 << 6;  // bit 6

/**
 * @param {object} msg      - Parsed message object from parseTelegram()
 * @param {object} ctx      - Packet context {senderIp, senderPort, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, udpSend, log}
 */
function handleState(msg, ctx, { config, haClient, mqttClient, udpSend, log }) {
  const { senderIp, senderPort, switch: sw, timestamp } = ctx;

  let stateFlags = 0;
  const hasFlags = msg.length >= 8;
  if (hasFlags) {
    stateFlags = msg.data.readUInt32LE(4);
  }

  const timeRequest = (stateFlags & STATE_FLAG_TIME_REQUEST) !== 0;
  const initRequest = (stateFlags & STATE_FLAG_INIT_REQUEST) !== 0;

  log.info(
    `ID-State from ${senderIp}:${senderPort} switch="${sw.name}"` +
    ` stateFlags=0x${stateFlags.toString(16).padStart(8, '0')}` +
    ` initRequest=${initRequest} timeRequest=${timeRequest}`
  );

  // ── Emit HA event ──────────────────────────────────────────────────────────
  const event = {
    switch_id:    sw.switch_id,
    switch_name:  sw.name,
    ip:           senderIp,
    actor_id:     msg.actorId,
    state_flags:  stateFlags,
    init_request: initRequest,
    time_request: timeRequest,
    timestamp,
  };

  if (haClient && config.mode.ha_events) {
    haClient.fireEvent('ulux_event', event).catch((err) =>
      log.error('Failed to fire HA event ulux_event (state):', err.message)
    );
  }

  if (mqttClient && config.mode.mqtt) {
    const topic = `${config.mqtt.base_topic}/${sw.switch_id || senderIp}/event/state`;
    mqttClient.publish(topic, JSON.stringify(event));
  }

  // ── Protocol responses ─────────────────────────────────────────────────────
  if (!hasFlags) return; // no flags → nothing to respond to

  if (initRequest) {
    const controlFlags = typeof config.control_flags === 'number'
      ? config.control_flags
      : 0;
    const telegram = buildTelegram(buildIdControlMessage(controlFlags));
    log.info(`Sending ID-Control (flags=0x${controlFlags.toString(16)}) to ${senderIp}:${senderPort}`);
    udpSend(senderIp, senderPort, telegram);
  }

  if (timeRequest) {
    const telegram = buildTelegram(buildDateTimeMessage());
    log.info(`Sending DateTime to ${senderIp}:${senderPort}`);
    udpSend(senderIp, senderPort, telegram);
  }
}

module.exports = handleState;
