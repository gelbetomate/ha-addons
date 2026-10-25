'use strict';

const { mqttDeviceKey } = require('../mqtt/topics');

const { MessageIds } = require('../ump/messageIds');

/**
 * Handler for UMP page and actor navigation messages.
 *
 * Handles:
 *   - ID-PageIndex (0x2E): Current displayed page index (0..31)
 *   - ID-PageCount (0x0E): Number of projected pages
 *   - ID-IDList (0x0F): List of configured Actor IDs
 *
 * @param {object} msg      - Parsed message object from parseTelegram()
 * @param {object} ctx      - Packet context {senderIp, senderPort, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, discoveryRegistry, log}
 */
function handlePage(msg, ctx, { config, haClient, mqttClient, discoveryRegistry, log }) {
  const { senderIp, switch: sw, timestamp } = ctx;
  const data = msg.data;

  if (msg.msgId === MessageIds.PageIndex) {
    if (data.length < 5) return;
    const pageIndex = data.readUInt8(4);

    log.info(`PageIndex from "${sw.name}" (${senderIp}): ${pageIndex} (Page ${pageIndex + 1})`);

    if (discoveryRegistry) {
      discoveryRegistry.updateCurrentPage?.(senderIp, pageIndex);
    }

    const payload = {
      switch_id: sw.switch_id,
      switch_name: sw.name,
      ip: senderIp,
      page_index: pageIndex,
      page_number: pageIndex + 1,
      timestamp,
    };

    if (haClient && config?.mode?.ha_events) {
      haClient.fireEvent('ulux_page', payload).catch((err) =>
        log.error('Failed to fire HA event ulux_page:', err.message)
      );
    }

    if (mqttClient && config?.mode?.mqtt) {
      const topic = `${config.mqtt.base_topic}/${mqttDeviceKey(sw)}/page`;
      mqttClient.publish(topic, JSON.stringify(payload));
      mqttClient.publish(`${topic}/state`, String(pageIndex));
    }
  } else if (msg.msgId === MessageIds.PageCount) {
    if (data.length < 5) return;
    const pageCount = data.readUInt8(4);

    log.info(`PageCount from "${sw.name}" (${senderIp}): ${pageCount} pages`);

    if (discoveryRegistry) {
      discoveryRegistry.updatePageCount?.(senderIp, pageCount);
    }

    const payload = {
      switch_id: sw.switch_id,
      switch_name: sw.name,
      ip: senderIp,
      page_count: pageCount,
      timestamp,
    };

    if (haClient && config?.mode?.ha_events) {
      haClient.fireEvent('ulux_page_count', payload).catch((err) =>
        log.error('Failed to fire HA event ulux_page_count:', err.message)
      );
    }

    if (mqttClient && config?.mode?.mqtt) {
      const topic = `${config.mqtt.base_topic}/${mqttDeviceKey(sw)}/page_count`;
      mqttClient.publish(topic, JSON.stringify(payload));
      mqttClient.publish(`${topic}/state`, String(pageCount));
    }
  } else if (msg.msgId === MessageIds.IdList) {
    if (data.length < 6) return;
    const count = data.readUInt16LE(4);
    const actorIds = [];
    for (let i = 0; i < count; i++) {
      if (6 + (i * 2) + 2 <= data.length) {
        actorIds.push(data.readUInt16LE(6 + (i * 2)));
      }
    }

    log.info(`IDList from "${sw.name}" (${senderIp}): ${count} actors [${actorIds.join(', ')}]`);

    if (discoveryRegistry) {
      discoveryRegistry.updateActorIds?.(senderIp, actorIds);
    }

    const payload = {
      switch_id: sw.switch_id,
      switch_name: sw.name,
      ip: senderIp,
      actor_count: count,
      actor_ids: actorIds,
      timestamp,
    };

    if (haClient && config?.mode?.ha_events) {
      haClient.fireEvent('ulux_id_list', payload).catch((err) =>
        log.error('Failed to fire HA event ulux_id_list:', err.message)
      );
    }

    if (mqttClient && config?.mode?.mqtt) {
      const topic = `${config.mqtt.base_topic}/${mqttDeviceKey(sw)}/actors`;
      mqttClient.publish(topic, JSON.stringify(payload));
    }
  }
}

module.exports = handlePage;

