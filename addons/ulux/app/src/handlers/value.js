'use strict';

const { MessageIds } = require('../ump/messageIds');

/**
 * Handler for UMP actor value messages (EditValue, RealValue, IdValue).
 *
 * Emits Home Assistant event: 'ulux_value'
 * Publishes MQTT topic: '<base_topic>/<switch_id>/actor/<actorId>/value'
 *
 * @param {object} msg      - Parsed message object from parseTelegram()
 * @param {object} ctx      - Packet context {senderIp, senderPort, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, log}
 */
function handleValue(msg, ctx, { config, haClient, mqttClient, log }) {
  const { senderIp, switch: sw, timestamp } = ctx;
  const data = msg.data;
  const actorId = msg.actorId;

  let editValue = null;
  const realValues = [];

  if (msg.msgId === MessageIds.EditValue) {
    if (data.length >= 6) {
      editValue = data.readInt16LE(4);
    }
  } else if (msg.msgId === MessageIds.RealValue) {
    for (let offset = 4; offset + 2 <= data.length; offset += 2) {
      realValues.push(data.readInt16LE(offset));
    }
  } else if (msg.msgId === MessageIds.IdValue) {
    if (data.length >= 6) {
      editValue = data.readInt16LE(4);
    }
    for (let offset = 6; offset + 2 <= data.length; offset += 2) {
      realValues.push(data.readInt16LE(offset));
    }
  }

  log.info(
    `Value from "${sw.name}" (${senderIp}) actor=0x${actorId.toString(16)} ` +
    `editValue=${editValue} realValues=[${realValues.join(', ')}]`
  );

  const payload = {
    switch_id: sw.switch_id,
    switch_name: sw.name,
    ip: senderIp,
    actor_id: actorId,
    edit_value: editValue,
    real_values: realValues,
    timestamp,
  };

  if (haClient && config?.mode?.ha_events) {
    haClient.fireEvent('ulux_value', payload).catch((err) =>
      log.error(`Failed to fire HA event ulux_value (actor=${actorId}):`, err.message)
    );
  }

  if (mqttClient && config?.mode?.mqtt) {
    const base = `${config.mqtt.base_topic}/${sw.switch_id || senderIp}/actor/${actorId}`;
    mqttClient.publish(`${base}/value`, JSON.stringify(payload));
    if (editValue !== null) {
      mqttClient.publish(`${base}/edit_value`, String(editValue));
    }
    if (realValues.length > 0) {
      mqttClient.publish(`${base}/real_value`, String(realValues[0]));
    }
  }
}

module.exports = handleValue;

