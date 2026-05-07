'use strict';

/**
 * In-memory registry of u::lux devices observed on UDP traffic.
 *
 * A device is considered discoverable once at least one valid UMP telegram
 * has been seen from it. Entries are updated on each packet.
 */
function createDiscoveryRegistry() {
  // Key preference: switch_id (device address) when known, otherwise sender IP.
  const devices = new Map();

  function normaliseSwitchId(switchId) {
    if (!switchId) return null;
    const upper = String(switchId).toUpperCase();
    if (upper === '00:00:00:00:00:00') return null;
    return upper;
  }

  function upsert({ senderIp, senderPort, switchId, switchName, configured }) {
    const normalisedId = normaliseSwitchId(switchId);
    const key = normalisedId || senderIp;

    const prev = devices.get(key) || {};
    const now = new Date().toISOString();

    devices.set(key, {
      switch_id: normalisedId,
      ip: senderIp,
      port: senderPort,
      name: switchName || prev.name || (normalisedId ? `u::lux ${normalisedId}` : `u::lux ${senderIp}`),
      configured: Boolean(configured),
      first_seen: prev.first_seen || now,
      last_seen: now,
    });
  }

  function list() {
    return Array.from(devices.values())
      .sort((a, b) => {
        const aId = a.switch_id || a.ip;
        const bId = b.switch_id || b.ip;
        return aId.localeCompare(bId);
      });
  }

  return { upsert, list };
}

module.exports = { createDiscoveryRegistry };
