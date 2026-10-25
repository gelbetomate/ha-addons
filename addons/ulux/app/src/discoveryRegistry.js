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
    const observedIp = ctx.senderIp || ctx.ip || '';
    const switchId = normaliseSwitchId(ctx.switchId);
    const existing = (switchId ? store.get(switchId) : null)
      || (discoveredMac ? store.findByMac(discoveredMac) : null)
      || (ctx.protocol_id ? store.findByProtocolId(ctx.protocol_id) : null)
      || store.findByIp(observedIp)
      || pendingDiscovery.get(observedIp);
    const discoveredMac = normaliseSwitchId(ctx.mac_address);
    const canonicalSwitchId = existing
      ? (discoveredMac || switchId || existing.switch_id)
      : (discoveredMac || switchId);

    // The UMP header contains a context ID, not necessarily the Ethernet MAC.
    // Pending discovery remains a preview until the user explicitly imports it.
    if (existing && !store.get(existing.switch_id)) {
      pendingDiscovery.set(observedIp, {
        ...existing,
        ...ctx,
        switch_id: isMacAddress(existing.switch_id) ? existing.switch_id : null,
        name: ctx.switchName && isGeneratedName(existing.name, existing)
          ? ctx.switchName
          : existing.name || ctx.switchName,
        mac_address: existing.mac_address || ctx.mac_address,
        serial_number: existing.serial_number || ctx.serial_number,
      });
      return pendingDiscovery.get(observedIp);
    }

    // Discovery is a preview. Only refresh records that were already imported;
    // new devices remain pending until the user explicitly imports them.
    if (!existing) {
      pendingDiscovery.set(observedIp, { ...ctx, ip: observedIp, switch_id: switchId });
      return;
    }

    if (!switchId) {
      pendingDiscovery.set(observedIp, { ...ctx, ip: observedIp });
      return;
    }

    // Merge discovery data into registry
    const nextName = ctx.switchName && isGeneratedName(existing.name, existing)
      ? ctx.switchName
      : existing.name;
    const existingSerial = existing.serial_number_source === 'mac_suffix_inference'
      ? null
      : existing.serial_number;
    const recordData = {
      switch_id: canonicalSwitchId,
      ip: observedIp || existing.ip || '',
      port: ctx.umpPort || existing.port || 34988,
      discovery_port: ctx.discovery_port || existing.discovery_port || 34984,
      name: nextName || ctx.switchName || `u::lux ${switchId}`,
      mac_address: ctx.mac_address || existing.mac_address || switchId,
      protocol_id: ctx.protocol_id || existing.protocol_id || '',
      ump_device_id: ctx.ump_device_id ?? existing.ump_device_id ?? null,
      serial_number: ctx.serial_number || existingSerial || null,
      serial_number_candidate: ctx.serial_number_candidate || existing.serial_number_candidate || null,
      serial_number_source: ctx.serial_number_source || (
        existing.serial_number_source === 'mac_suffix_inference' ? null : existing.serial_number_source
      ),
      sync_detail: ctx.sync_detail || existing.sync_detail || null,
      mqtt_discovery: ctx.mqtt_discovery ?? existing.mqtt_discovery ?? false,
      last_seen: ctx.last_seen || new Date().toISOString(),
    };
    const record = existing.switch_id === canonicalSwitchId
      ? store.upsert(recordData)
      : store.rekey(existing.switch_id, recordData);

    // Mark as online
    store.updateOnlineStatus(switchId, 'online');

    // Remove from pending if it was there
    pendingDiscovery.delete(observedIp);
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
      const key = record.ip || record.senderIp || record.switch_id;
      if (!key) continue;
      const current = unique.get(key);
      if (!current) {
        unique.set(key, record);
      } else if (record.mac_address && !current.mac_address) {
        unique.set(key, { ...record, sync_detail: record.sync_detail || current.sync_detail });
      } else if (record.sync_detail && !current.sync_detail) {
        unique.set(key, { ...current, sync_detail: record.sync_detail });
      }
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
    const switchId = String(data?.switch_id || '').toUpperCase();
    if (/^00:00:26:02:[0-9A-F]{2}:[0-9A-F]{2}$/.test(switchId)) {
      throw new Error('UMP protocol address cannot be used as switch_id; provide a MAC address or serial number');
    }
    const existing = data?.switch_id ? store.get(data.switch_id) : null;
    const pending = data?.ip ? pendingDiscovery.get(data.ip) : null;
    const record = store.upsert({
      ...pending,
      ...existing,
      ...data,
      sync_detail: data?.sync_detail || pending?.sync_detail || existing?.sync_detail || null,
    });
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

  function updateSensorReading(ip, sensorType, value, rawValue) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    const sensors = {
      ...(device.sensors || {}),
      [sensorType]: value,
      [`${sensorType}_raw`]: rawValue,
      [`${sensorType}_updated`]: new Date().toISOString(),
    };
    return store.upsert({ ...device, sensors, switch_id: device.switch_id });
  }

  function updateState(ip, decoded, stateFlags) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({
      ...device,
      state: { flags: stateFlags, ...decoded, updated_at: new Date().toISOString() },
      switch_id: device.switch_id,
    });
  }

  function updateCurrentPage(ip, pageIndex) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({
      ...device,
      current_page: pageIndex,
      switch_id: device.switch_id,
    });
  }

  function updatePageCount(ip, pageCount) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({
      ...device,
      page_count: pageCount,
      switch_id: device.switch_id,
    });
  }

  function updateActorIds(ip, actorIds) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({
      ...device,
      actor_ids: actorIds,
      switch_id: device.switch_id,
    });
  }

  function updateVideoState(ip, videoState) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({
      ...device,
      video_state: videoState,
      switch_id: device.switch_id,
    });
  }

  function updateLeds(ip, leds) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({ ...device, leds, switch_id: device.switch_id });
  }

  function updateKeys(ip, data) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({ ...device, keys: data, switch_id: device.switch_id });
  }

  function updateIr(ip, data) {
    const device = store.getAll().find((item) => item.ip === ip);
    if (!device) return null;
    return store.upsert({ ...device, ir: data, switch_id: device.switch_id });
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
    updateSensorReading,
    updateState,
    updateCurrentPage,
    updatePageCount,
    updateActorIds,
    updateVideoState,
    updateLeds,
    updateKeys,
    updateIr,
    queueDeletion,
    listPendingDeletions,
    clearPendingDeletion,
  };
}

module.exports = { createDiscoveryRegistry };
