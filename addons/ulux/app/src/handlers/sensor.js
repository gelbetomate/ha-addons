'use strict';

const { MessageIds } = require('../ump/messageIds');

/**
 * Handler for UMP sensor messages (Temperature, Humidity, CO2, VOC, IN2, Lux).
 *
 * Emits Home Assistant event: 'ulux_sensor'
 * Publishes MQTT topic: '<base_topic>/<switch_id>/sensor/<type>'
 *
 * @param {object} msg      - Parsed message object from parseTelegram()
 * @param {object} ctx      - Packet context {senderIp, senderPort, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, discoveryRegistry, log}
 */
function handleSensor(msg, ctx, { config, haClient, mqttClient, discoveryRegistry, log }) {
  const { senderIp, switch: sw, timestamp } = ctx;
  const data = msg.data;

  let sensorType = 'unknown';
  let value = null;
  let rawValue = null;
  let valid = false;
  let unit = '';
  let extra = {};

  switch (msg.msgId) {
    case MessageIds.I2C_Temperature: { // 0x71
      sensorType = 'temperature';
      unit = '°C';
      if (data.length >= 6) {
        rawValue = data.readInt16LE(4);
        valid = data.length < 7 || data.readUInt8(6) === 0x01;
        value = valid ? Math.round((rawValue / 10) * 10) / 10 : null;
      }
      break;
    }

    case MessageIds.I2C_Humidity: { // 0x72
      sensorType = 'humidity';
      unit = '%';
      if (data.length >= 6) {
        rawValue = data.readUInt16LE(4);
        valid = data.length < 7 || data.readUInt8(6) === 0x01;
        value = valid ? Math.round((rawValue / 10) * 10) / 10 : null;
      }
      break;
    }

    case MessageIds.I2C_CO2: { // 0x73
      sensorType = 'co2';
      unit = 'ppm';
      if (data.length >= 6) {
        rawValue = data.readInt16LE(4);
        valid = data.length < 7 || data.readUInt8(6) === 0x01;
        if (valid) {
          if (rawValue === -1) {
            extra.status = 'warming_up';
            value = null;
          } else if (rawValue === -2) {
            extra.status = 'error';
            value = null;
          } else {
            value = rawValue;
          }
        }
      }
      break;
    }

    case MessageIds.I2C_IN2: { // 0x74
      sensorType = 'in2';
      if (data.length >= 6) {
        rawValue = data.readUInt16LE(4);
        valid = data.length < 7 || data.readUInt8(6) === 0x01;
        extra.input1 = Boolean(rawValue & 0x01);
        extra.input2 = Boolean(rawValue & 0x02);
        value = extra;
      }
      break;
    }

    case MessageIds.I2C_VOC: { // 0x75
      sensorType = 'voc';
      unit = 'ppm';
      if (data.length >= 6) {
        rawValue = data.readInt16LE(4);
        valid = data.length < 7 || data.readUInt8(6) === 0x01;
        if (valid) {
          if (rawValue === -1) {
            extra.status = 'warming_up';
            value = null;
          } else if (rawValue === -2) {
            extra.status = 'error';
            value = null;
          } else {
            value = rawValue;
          }
        }
      }
      break;
    }

    case MessageIds.IdLux: { // 0x03
      sensorType = 'lux';
      unit = 'lx';
      if (data.length >= 6) {
        rawValue = data.readUInt16LE(4);
        valid = data.length < 7 || data.readUInt8(6) === 0x01;
        value = valid ? rawValue : null;
      }
      break;
    }

    default:
      return;
  }

  const displayValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : `${value} ${unit}`.trim();
  log.info(`Sensor ${sensorType} from "${sw.name}" (${senderIp}): ${displayValue} (valid=${valid})`);

  // Update persistent registry store with live sensor reading
  if (valid && discoveryRegistry) {
    discoveryRegistry.updateSensorReading?.(senderIp, sensorType, value, rawValue);
  }

  const payload = {
    switch_id: sw.switch_id,
    switch_name: sw.name,
    ip: senderIp,
    sensor_type: sensorType,
    value,
    raw_value: rawValue,
    unit,
    valid,
    extra,
    timestamp,
  };

  // Emit to Home Assistant
  if (haClient && config?.mode?.ha_events) {
    haClient.fireEvent('ulux_sensor', payload).catch((err) =>
      log.error(`Failed to fire HA event ulux_sensor (${sensorType}):`, err.message)
    );
  }

  // Publish to MQTT
  if (mqttClient && config?.mode?.mqtt) {
    const topic = `${config.mqtt.base_topic}/${sw.switch_id || senderIp}/sensor/${sensorType}`;
    mqttClient.publish(topic, JSON.stringify(payload));
    if (value !== null && typeof value !== 'object') {
      // Also publish simple numeric state topic for direct sensor integration
      mqttClient.publish(`${topic}/state`, String(value));
    }
  }
}

module.exports = handleSensor;

