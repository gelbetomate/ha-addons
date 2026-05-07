'use strict';

const { parseTelegram, telegramSummary } = require('../ump/decoder');
const { MessageIds } = require('../ump/messageIds');
const handleState = require('./state');
const handleEvent = require('./event');

/**
 * Map UMP message IDs to handler functions.
 * Handler signature: handler(msg, ctx, services) → void
 *   msg      — parsed message object from parseTelegram()
 *   ctx      — full packet context
 *   services — { config, haClient, mqttClient, udpSend, log }
 */
const HANDLERS = {
  [MessageIds.IdState]: handleState,
  [MessageIds.IdEvent]: handleEvent,
};

/**
 * Create the central packet dispatcher.
 *
 * @param {object} services
 * @param {object}      services.config      - Full add-on config
 * @param {object|null} services.haClient    - HA WebSocket client (or null)
 * @param {object|null} services.mqttClient  - MQTT client (or null)
 * @param {object|null} services.discoveryRegistry - In-memory discovery registry
 * @param {Function}    services.udpSend     - udpSend(host, port, buf) for replies
 * @param {object}      services.log         - Logger
 * @returns {Function} dispatch(ctx) — called for each received UDP packet
 */
function createDispatcher({ config, haClient, mqttClient, discoveryRegistry, udpSend, log }) {
  return function dispatch(ctx) {
    const { raw, hex, senderIp, senderPort, switch: sw, timestamp } = ctx;

    log.info(`Packet from ${senderIp}:${senderPort} switch="${sw.name}" (${raw.length} bytes)`);

    // Parse UMP telegram (16-byte header + messages)
    const telegram = parseTelegram(raw);

    if (!telegram.valid) {
      log.warning(`UMP parse failed: ${telegram.error} | hex=${hex}`);
      emitRawEvent({ hex, senderIp, sw, timestamp, haClient, mqttClient, config, log });
      return;
    }

    log.debug(`UMP telegram: ${telegramSummary(telegram)}`);

    // Resolve switch by device address embedded in the telegram header
    const resolvedSwitch = resolveByDeviceAddress(telegram.deviceAddressHex, config.switches) || sw;

    if (discoveryRegistry) {
      discoveryRegistry.upsert({
        senderIp,
        senderPort,
        switchId: resolvedSwitch.switch_id || telegram.deviceAddressHex,
        switchName: resolvedSwitch.name,
        configured: resolvedSwitch.name !== 'unknown' || Boolean(resolvedSwitch.switch_id),
      });
    }

    const enrichedCtx = { ...ctx, switch: resolvedSwitch, telegram };

    // Dispatch each message in the telegram
    for (const msg of telegram.messages) {
      const handler = HANDLERS[msg.msgId];
      if (handler) {
        try {
          handler(msg, enrichedCtx, { config, haClient, mqttClient, udpSend, log });
        } catch (err) {
          log.error(`Handler error for msgId=0x${msg.msgId.toString(16)}:`, err.message);
        }
      } else {
        log.debug(
          `No handler for msgId=0x${msg.msgId.toString(16).padStart(2, '0')}` +
          (msg.msgName ? ` (${msg.msgName})` : '') + ' — emitting raw event'
        );
        emitRawEvent({ hex, senderIp, sw: resolvedSwitch, timestamp, haClient, mqttClient, config, log, msgId: msg.msgId });
      }
    }
  };
}

/**
 * Emit a raw/unhandled packet event to HA and/or MQTT.
 */
function emitRawEvent({ hex, senderIp, sw, timestamp, haClient, mqttClient, config, log, msgId }) {
  const payload = {
    switch_id:   sw.switch_id,
    switch_name: sw.name,
    ip:          senderIp,
    raw_msg_id:  msgId !== undefined ? msgId : null,
    raw_hex:     hex,
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
 * Try to resolve a configured switch by the device address from the UMP telegram header.
 * Normalises the address to uppercase colon-separated hex before comparing.
 *
 * @param {string}   deviceAddressHex - e.g. "01:23:45:67:89:AB"
 * @param {object[]} switches
 * @returns {object|null}
 */
function resolveByDeviceAddress(deviceAddressHex, switches) {
  if (!deviceAddressHex) return null;
  const normalised = deviceAddressHex.toUpperCase();
  // All-zeros means the field is absent; don't match that
  if (normalised === '00:00:00:00:00:00') return null;
  return switches.find((sw) => {
    const swNorm = sw.switch_id ? sw.switch_id.toUpperCase() : '';
    return swNorm === normalised;
  }) || null;
}

module.exports = { createDispatcher };
