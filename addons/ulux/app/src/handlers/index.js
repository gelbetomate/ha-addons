'use strict';

const { decodeFrame, frameSummary } = require('../ump/decoder');
const handleButton = require('./button');

/**
 * Map UMP message IDs to handler functions.
 * Add entries here as new message types are supported.
 *
 * Handler signature: handler(frame, ctx, services) → void
 */
const HANDLERS = {
  // TODO: Add message IDs once confirmed from UMP spec / packet captures
  // 0x0001: handleButton,
};

/**
 * Create the central packet dispatcher.
 *
 * @param {object} services
 * @param {object}   services.config     - Full add-on config
 * @param {object|null} services.haClient  - HA WebSocket client (or null)
 * @param {object|null} services.mqttClient - MQTT client (or null)
 * @param {object}   services.log        - Logger
 * @returns {Function} dispatch(ctx) — called for each received UDP packet
 */
function createDispatcher({ config, haClient, mqttClient, log }) {
  return function dispatch(ctx) {
    const { raw, hex, senderIp, senderPort, switch: sw, timestamp } = ctx;

    log.info(`Packet from ${senderIp}:${senderPort} switch="${sw.name}" (${raw.length} bytes)`);

    // Decode UMP frame
    const frame = decodeFrame(raw);

    if (!frame.valid) {
      log.warning(`UMP decode failed: ${frame.error} | hex=${hex}`);
      // Still emit a raw event so nothing is silently dropped
      emitRawEvent({ hex, senderIp, sw, timestamp, haClient, mqttClient, config, log });
      return;
    }

    log.debug(`UMP frame: ${frameSummary(frame)}`);

    // Prefer switch ID from frame if it looks like a known switch
    const resolvedSwitch = resolveByFrameSwitchId(frame.switchIdHex, config.switches) || sw;

    const enrichedCtx = { ...ctx, switch: resolvedSwitch, frame };

    // Dispatch to specific handler
    const handler = HANDLERS[frame.msgId];
    if (handler) {
      handler(frame, enrichedCtx, { config, haClient, mqttClient, log });
    } else {
      log.debug(`No handler registered for message ID 0x${frame.msgId.toString(16).padStart(4, '0')} — emitting raw event`);
      emitRawEvent({ hex, senderIp, sw: resolvedSwitch, timestamp, haClient, mqttClient, config, log, frame });
    }
  };
}

/**
 * Emit a raw/unhandled packet event to HA and/or MQTT.
 */
function emitRawEvent({ hex, senderIp, sw, timestamp, haClient, mqttClient, config, log, frame }) {
  const payload = {
    switch_id: sw.switch_id,
    switch_name: sw.name,
    ip: senderIp,
    raw_msg_id: frame ? frame.msgId : null,
    raw_hex: hex,
    timestamp,
  };

  if (haClient && config.mode.ha_events) {
    haClient.fireEvent('ulux_raw', payload).catch((err) =>
      log.error('Failed to fire HA event ulux_raw:', err.message)
    );
  }

  if (mqttClient && config.mode.mqtt) {
    const topic = `${config.mqtt.base_topic}/${sw.switch_id || senderIp}/event/raw`;
    mqttClient.publish(topic, JSON.stringify(payload));
  }
}

/**
 * Try to resolve a configured switch by its hardware switch ID (from the UMP frame).
 * Normalises the ID to uppercase colon-separated hex before comparing.
 *
 * @param {string}   switchIdHex - e.g. "01:23:45:67:89:AB"
 * @param {object[]} switches
 * @returns {object|null}
 */
function resolveByFrameSwitchId(switchIdHex, switches) {
  if (!switchIdHex) return null;
  const normalised = switchIdHex.toUpperCase();
  return switches.find((sw) => {
    const swNorm = sw.switch_id ? sw.switch_id.toUpperCase() : '';
    return swNorm === normalised;
  }) || null;
}

module.exports = { createDispatcher };
