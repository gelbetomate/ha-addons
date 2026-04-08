'use strict';

/**
 * Button press handler for UMP key/touch events.
 *
 * Reference: UMP message type ID-Event (exact message ID TBD from spec PDF).
 *
 * TODO: Update payload parsing once the exact message ID and byte layout
 * are confirmed from the UMP PDF or a real packet capture:
 *   tcpdump -i <iface> -nn -s0 udp port 34988 -XX
 *
 * Expected payload fields (to be confirmed):
 *   - Key / button index
 *   - Page number
 *   - Action (press / release / hold)
 *
 * @param {object} frame    - Decoded UMP frame (from decoder.js)
 * @param {object} ctx      - Full packet context {raw, hex, senderIp, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, log}
 */
function handleButton(frame, ctx, { config, haClient, mqttClient, log }) {
  const { switch: sw, senderIp, timestamp, hex } = ctx;

  // TODO: Parse payload bytes once UMP spec is confirmed.
  //   const key    = frame.payload.readUInt8(0);
  //   const page   = frame.payload.readUInt8(1);
  //   const action = frame.payload.readUInt8(2); // 0=release, 1=press, 2=hold ?

  const event = {
    switch_id: sw.switch_id,
    switch_name: sw.name,
    ip: senderIp,
    raw_msg_id: frame.msgId,
    // key, page, action — TODO: add once payload structure is known
    raw_hex: hex,
    timestamp,
  };

  log.info(`Button event from switch "${sw.name}" (${senderIp}): ${JSON.stringify(event)}`);

  // Publish to HA
  if (haClient && config.mode.ha_events) {
    haClient.fireEvent('ulux_button', event).catch((err) =>
      log.error('Failed to fire HA event ulux_button:', err.message)
    );
  }

  // Publish to MQTT
  if (mqttClient && config.mode.mqtt) {
    const topic = `${config.mqtt.base_topic}/${sw.switch_id || senderIp}/event/button`;
    mqttClient.publish(topic, JSON.stringify(event));
  }
}

module.exports = handleButton;
