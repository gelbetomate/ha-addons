'use strict';

const { mqttDeviceKey } = require('../mqtt/topics');

const LED_COLORS = ['off', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const LED_BLINK_MODES = [
  'permanent',
  'slow',
  'medium',
  'fast',
  'asymmetric_1_2s_on_1_4s_off',
  'asymmetric_1_2s_on_4s_off',
  'asymmetric_1_2s_on_16s_off',
  'asymmetric_1_2s_on_32s_off',
];

/** Handle inbound ID-LED (0x44) status messages. */
function handleLed(msg, ctx, { config, haClient, mqttClient, discoveryRegistry, log }) {
  const { senderIp, switch: sw, timestamp } = ctx;
  if (msg.data.length < 8) return;

  const leds = Array.from({ length: 4 }, (_, index) => {
    const raw = msg.data.readUInt8(4 + index);
    return {
      raw,
      color: raw & 0x07,
      color_name: LED_COLORS[raw & 0x07],
      blink_mode: (raw >> 4) & 0x07,
      blink_value: raw & 0x70,
      blink_mode_name: LED_BLINK_MODES[(raw >> 4) & 0x07],
      override: Boolean(raw & 0x80),
      active: (raw & 0x07) !== 0,
    };
  });

  discoveryRegistry?.updateLeds?.(senderIp, leds);
  const payload = {
    switch_id: sw.switch_id,
    switch_name: sw.name,
    ip: senderIp,
    leds,
    timestamp,
  };

  if (haClient && config?.mode?.ha_events) {
    haClient.fireEvent('ulux_led', payload).catch((err) =>
      log.error('Failed to fire HA event ulux_led:', err.message)
    );
  }
  if (mqttClient && config?.mode?.mqtt) {
    mqttClient.publish(
      `${config.mqtt.base_topic}/${mqttDeviceKey(sw)}/led`,
      JSON.stringify(payload),
    );
  }
}

module.exports = handleLed;
