'use strict';

const { RegistryStore } = require('./registry/store');

/**
 * Device discovery and registry manager.
 *
 * Observes u::lux devices on UDP traffic, merges discovery data into the
 * persistent registry store, and tracks online status.
 */
function createDiscoveryRegistry(registryStore, log) {
  // If no store provided, create a default one (in-memory or file-based)
  const store = registryStore || new RegistryStore(undefined, log);
  const pendingDiscovery = new Map(); // switchId → discovery data (not yet in registry)

  function normaliseSwitchId(switchId) {
    if (!switchId) return null;
    const upper = String(switchId).toUpperCase();
    if (upper === '00:00:00:00:00:00') return null;
    return upper;
  }

  /**
   * Update registry when a device is observed on UDP traffic.
   * Merges discovery data (IP, port, name) into the persistent registry.
   * @param {object} ctx - { senderIp, senderPort, switchId, switchName, configured }
   */
  function upsert(ctx) {
    const switchId = normaliseSwitchId(ctx.switchId);
    const existing = switchId ? store.get(switchId) : null;

    // Discovery is a preview. Only refresh records that were already imported;
    // new devices remain pending until the user explicitly imports them.
    if (!existing) {
      pendingDiscovery.set(ctx.senderIp, { ...ctx, switch_id: switchId });
      return;
    }

    if (!switchId) {
      pendingDiscovery.set(ctx.senderIp, ctx);
      return;
    }

    // Merge discovery data into registry
    store.upsert({
      switch_id: switchId,
      ip: ctx.senderIp || existing.ip || '',
      port: ctx.senderPort || existing.port || 50000,
      name: ctx.switchName || existing.name || `u::lux ${switchId}`,
      mac_address: ctx.mac_address || existing.mac_address || switchId,
      protocol_id: ctx.protocol_id || existing.protocol_id || '',
      serial_number: ctx.serial_number || existing.serial_number || null,
      serial_number_source: ctx.serial_number_source || existing.serial_number_source || null,
      last_seen: ctx.last_seen || new Date().toISOString(),
    });

    // Mark as online
    store.updateOnlineStatus(switchId, 'online');

    // Remove from pending if it was there
    pendingDiscovery.delete(ctx.senderIp);
  }

  /**
   * Get all discovered devices (from persistent registry).
   * @returns {object[]} Sorted array of device records
   */
  function list() {
    const records = [...store.getAll(), ...pendingDiscovery.values()];
    const unique = new Map();
    for (const record of records) {
      const key = record.switch_id || record.ip || record.senderIp;
      if (key) unique.set(key, record);
    }

    return Array.from(unique.values()).sort((a, b) => {
      const aId = a.switch_id || a.ip;
      const bId = b.switch_id || b.ip;
      return aId.localeCompare(bId);
    });
  }

  /**
   * Get all pending discovery entries (devices seen but not yet registered).
   * @returns {object[]}
   */
  function listPending() {
    return Array.from(pendingDiscovery.values());
  }

  /**
   * Manually add a device to the registry (e.g., from config or manual setup).
   * @param {object} data - { switch_id, name?, ip?, port? }
   * @returns {object} Created device record
   */
  function registerDevice(data) {
    const record = store.upsert(data);
    if (record.ip) pendingDiscovery.delete(record.ip);
    if (data.switch_id) pendingDiscovery.delete(data.switch_id);
    return record;
  }

  /**
   * Remove a device from the registry.
   * @param {string} switchId
   * @returns {boolean} True if removed
   */
  function unregisterDevice(switchId) {
    return store.remove(switchId);
  }

  /**
   * Get the underlying persistent store (for advanced operations).
   * @returns {RegistryStore}
   */
  function getStore() {
    return store;
  }

  return {
    upsert,
    list,
    listPending,
    registerDevice,
    unregisterDevice,
    getStore,
  };
}

module.exports = { createDiscoveryRegistry };
