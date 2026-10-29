'use strict';

const { mqttDeviceKey } = require('../mqtt/topics');

/**
 * Handler for UMP VideoState (MessageID=0xA1) messages.
 *
 * Provides display video bounds and capabilities negotiated with the switch.
 *
 * @param {object} msg      - Parsed message object from parseTelegram()
 * @param {object} ctx      - Packet context {senderIp, senderPort, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, discoveryRegistry, log}
 */
function handleVideoState(msg, ctx, { config, haClient, mqttClient, discoveryRegistry, log }) {
  const { senderIp, switch: sw, timestamp } = ctx;
  const data = msg.data;

  if (data.length < 16) return;

  const flags = data.readUInt32LE(4);
  const videoActive = Boolean(flags & 0x01);
  const videoPossible = Boolean(flags & 0x02);

  const bounds = {
    left: data.readInt16LE(8),
    top: data.readInt16LE(10),
    right: data.readInt16LE(12),
    bottom: data.readInt16LE(14),
  };

  const width = Math.max(0, bounds.right - bounds.left);
  const height = Math.max(0, bounds.bottom - bounds.top);

  log.info(
    `VideoState from "${sw.name}" (${senderIp}): ` +
    `possible=${videoPossible} active=${videoActive} ` +
    `bounds=[${bounds.left},${bounds.top},${bounds.right},${bounds.bottom}] (${width}x${height})`
  );

  if (discoveryRegistry) {
    discoveryRegistry.updateVideoState?.(senderIp, {
      video_possible: videoPossible,
      video_active: videoActive,
      bounds,
      width,
      height,
    });
  }

  const payload = {
    switch_id: sw.switch_id,
    switch_name: sw.name,
    ip: senderIp,
    video_active: videoActive,
    video_possible: videoPossible,
    bounds,
    width,
    height,
    timestamp,
  };

  if (haClient && config?.mode?.ha_events) {
    haClient.fireEvent('ulux_video_state', payload).catch((err) =>
      log.error('Failed to fire HA event ulux_video_state:', err.message)
    );
  }

  if (mqttClient && config?.mode?.mqtt) {
    const topic = `${config.mqtt.base_topic}/${mqttDeviceKey(sw)}/video_state`;
    mqttClient.publish(topic, JSON.stringify(payload));
  }
}

module.exports = handleVideoState;

