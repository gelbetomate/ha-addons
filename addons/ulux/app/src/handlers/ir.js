'use strict';

const { mqttDeviceKey } = require('../mqtt/topics');

/** Preserve unknown IR response payloads until the V2.32 layout is confirmed. */
function handleIR(msg, ctx, { config, haClient, mqttClient, discoveryRegistry, log }) {
  const { senderIp, switch: sw, timestamp } = ctx;
  const payload = {
    switch_id: sw.switch_id,
    switch_name: sw.name,
    ip: senderIp,
    actor_id: msg.actorId,
    raw_hex: msg.data.toString('hex'),
    timestamp,
  };
  discoveryRegistry?.updateIr?.(senderIp, payload);
  log.info(`IR response from "${sw.name}": ${payload.raw_hex}`);
  if (haClient && config?.mode?.ha_events) {
    haClient.fireEvent('ulux_ir', payload).catch((err) =>
      log.error('Failed to fire HA event ulux_ir:', err.message)
    );
  }
  if (mqttClient && config?.mode?.mqtt) {
    mqttClient.publish(
      `${config.mqtt.base_topic}/${mqttDeviceKey(sw)}/ir`,
      JSON.stringify(payload),
    );
  }
}

module.exports = handleIR;