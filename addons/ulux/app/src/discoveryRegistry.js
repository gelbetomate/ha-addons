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
  const pendingDeletions = new Map();

  function normaliseSwitchId(switchId) {
    if (!switchId) return null;
    const upper = String(switchId).toUpperCase();
    if (upper === '00:00:00:00:00:00') return null;
    return upper;
  }

  function isGeneratedName(name, record) {
    if (!name) return true;
    const value = String(name).toLowerCase();
    const ids = [record?.switch_id, record?.mac_address, record?.ip]
      .filter(Boolean)
      .map((item) => String(item).toLowerCase());
    return value === 'u::lux device' || value.startsWith('u::lux device (') ||
      value.startsWith('u::lux switch (') || ids.some((id) => value === `u::lux ${id}`);
  }

  function isMacAddress(value) {
    return /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/i.test(String(value || ''));
  }

  /**
   * Update registry when a device is observed on UDP traffic.
   * Merges discovery data (IP, port, name) into the persistent registry.
   * @param {object} ctx - { senderIp, senderPort, switchId, switchName, configured }
   */
  function upsert(ctx) {
    const switchId = normaliseSwitchId(ctx.switchId);
    const existing = (switchId ? store.get(switchId) : null)
      || store.findByIp(ctx.senderIp)
      || pendingDiscovery.get(ctx.senderIp);

    // The UMP header contains a context ID, not necessarily the Ethernet MAC.
    // Pending discovery remains a preview until the user explicitly imports it.
    if (existing && !store.get(existing.switch_id)) {
      pendingDiscovery.set(ctx.senderIp, {
        ...existing,
        ...ctx,
        switch_id: isMacAddress(existing.switch_id) ? existing.switch_id : null,
        name: existing.name || ctx.switchName,
        mac_address: existing.mac_address || ctx.mac_address,
        serial_number: existing.serial_number || ctx.serial_number,
      });
      return pendingDiscovery.get(ctx.senderIp);
    }

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
    const nextName = ctx.switchName && isGeneratedName(existing.name, existing)
      ? ctx.switchName
      : existing.name;
    const recordData = {
      switch_id: switchId,
      ip: ctx.senderIp || existing.ip || '',
      port: ctx.umpPort || existing.port || 34988,
      discovery_port: ctx.discovery_port || existing.discovery_port || 34984,
      name: nextName || ctx.switchName || `u::lux ${switchId}`,
      mac_address: ctx.mac_address || existing.mac_address || switchId,
      protocol_id: ctx.protocol_id || existing.protocol_id || '',
      ump_device_id: ctx.ump_device_id ?? existing.ump_device_id ?? null,
      serial_number: ctx.serial_number || existing.serial_number || null,
      serial_number_source: ctx.serial_number_source || existing.serial_number_source || null,
      mqtt_discovery: ctx.mqtt_discovery ?? existing.mqtt_discovery ?? false,
      last_seen: ctx.last_seen || new Date().toISOString(),
    };
    const record = existing.switch_id === switchId
      ? store.upsert(recordData)
      : store.rekey(existing.switch_id, recordData);

    // Mark as online
    store.updateOnlineStatus(switchId, 'online');

    // Remove from pending if it was there
    pendingDiscovery.delete(ctx.senderIp);
    return record;
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

  function queueDeletion(device) {
    if (!device?.switch_id) return;
    pendingDeletions.set(device.switch_id.toUpperCase(), { ...device, ha_delete_requested: true });
    if (device.ip) pendingDiscovery.set(device.ip, { ...device, switch_id: device.switch_id });
  }

  function listPendingDeletions() {
    return Array.from(pendingDeletions.values());
  }

  function clearPendingDeletion(switchId) {
    return pendingDeletions.delete(String(switchId).toUpperCase());
  }

  /**
   * Get the underlying persistent store (for advanced operations).
   * @returns {RegistryStore}
   */
  function getStore() {
    return store;
  }

  function updateDiagnostics(ip, data) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({
      ...device,
      ...data,
      switch_id: device.switch_id,
    });
  }

  function updateDiagnosticsBySwitchId(switchId, data) {
    const device = store.get(switchId);
    if (!device) return null;
    return store.upsert({ ...device, ...data, switch_id: device.switch_id });
  }

  return {
    upsert,
    list,
    listPending,
    registerDevice,
    unregisterDevice,
    getStore,
    updateDiagnostics,
    updateDiagnosticsBySwitchId,
    queueDeletion,
    listPendingDeletions,
    clearPendingDeletion,
  };
}

module.exports = { createDiscoveryRegistry };
