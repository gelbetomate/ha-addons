'use strict';

const fs = require('fs');
const path = require('path');
const { REGISTRY_VERSION, createDeviceRecord, validateDeviceRecord, migrateDeviceRecord } = require('./schema');

/**
 * Persistent device registry store.
 * Manages loading/saving device records from/to disk with versioning and migrations.
 *
 * Registry file format:
 * {
 *   "version": 1,
 *   "devices": [{ switch_id, name, ip, port, online_status, last_seen, ... }, ...]
 * }
 */

const DEFAULT_REGISTRY_PATH = process.env.REGISTRY_PATH || '/data/registry.json';

class RegistryStore {
  constructor(filePath = DEFAULT_REGISTRY_PATH, log) {
    this.filePath = filePath;
    this.log = log;
    this.devices = new Map(); // switch_id → record
    this.dirty = false;
    this.version = REGISTRY_VERSION;
  }

  /**
   * Load registry from disk.
   * Handles versioning and migrations automatically.
   * @returns {boolean} True if loaded successfully, false if file doesn't exist yet
   */
  load() {
    if (!fs.existsSync(this.filePath)) {
      this.log?.info(`Registry file not found at ${this.filePath}, starting fresh`);
      return false;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

      // Validate schema version and migrate if needed
      const fileVersion = data.version || 1;
      if (fileVersion > REGISTRY_VERSION) {
        this.log?.warning(
          `Registry file version ${fileVersion} is newer than app version ${REGISTRY_VERSION}. ` +
          'Some data may be lost.'
        );
      }

      // Load and migrate devices
      const devices = data.devices || [];
      for (const deviceData of devices) {
        const migrated = migrateDeviceRecord(deviceData, fileVersion);
        const validation = validateDeviceRecord(migrated);

        if (!validation.valid) {
          this.log?.warning(`Skipping invalid device record: ${migrated.switch_id} — ${validation.errors.join(', ')}`);
          continue;
        }

        this.devices.set(migrated.switch_id, migrated);
      }

      this.version = REGISTRY_VERSION;
      this.dirty = false;
      this.log?.info(`Registry loaded: ${this.devices.size} devices`);
      return true;
    } catch (err) {
      this.log?.error(`Failed to load registry from ${this.filePath}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Save registry to disk.
   * Overwrites the file with the current state.
   * @returns {void}
   */
  save() {
    if (!this.dirty) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: REGISTRY_VERSION,
        devices: Array.from(this.devices.values()),
      };

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      this.dirty = false;
      this.log?.debug(`Registry saved: ${this.devices.size} devices`);
    } catch (err) {
      this.log?.error(`Failed to save registry to ${this.filePath}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get a device by switch_id.
   * @param {string} switchId
   * @returns {object|null} Device record or null
   */
  get(switchId) {
    return this.devices.get(switchId.toUpperCase()) || null;
  }

  /**
   * Get all devices.
   * @returns {object[]} Array of device records
   */
  getAll() {
    return Array.from(this.devices.values());
  }

  /**
   * Add or update a device.
   * @param {object} data - Device data: { switch_id, name?, ip?, port?, ... }
   * @returns {object} Created/updated device record
   */
  upsert(data) {
    const switchId = (data.switch_id || '').toUpperCase();
    const existing = this.devices.get(switchId);

    let record;
    if (existing) {
      // Update existing record, preserving metadata fields
      record = {
        ...existing,
        ...data,
        switch_id: switchId, // Ensure uppercase
        created_at: existing.created_at, // Preserve creation timestamp
      };
    } else {
      // Create new record
      record = createDeviceRecord(data);
    }

    const validation = validateDeviceRecord(record);
    if (!validation.valid) {
      throw new Error(`Invalid device record: ${validation.errors.join(', ')}`);
    }

    this.devices.set(switchId, record);
    this.dirty = true;
    return record;
  }

  /**
   * Remove a device.
   * @param {string} switchId
   * @returns {boolean} True if removed, false if not found
   */
  remove(switchId) {
    const existed = this.devices.has(switchId.toUpperCase());
    if (existed) {
      this.devices.delete(switchId.toUpperCase());
      this.dirty = true;
    }
    return existed;
  }

  /**
   * Update device online status and last_seen.
   * @param {string} switchId
   * @param {string} status - "online" | "offline" | "unknown"
   * @returns {object|null} Updated device record or null if not found
   */
  updateOnlineStatus(switchId, status) {
    const record = this.get(switchId);
    if (!record) {
      return null;
    }

    record.online_status = status;
    record.last_seen = new Date().toISOString();
    this.dirty = true;
    return record;
  }

  /**
   * Link a device to a Home Assistant config entry.
   * @param {string} switchId
   * @param {string} entryId
   * @returns {object|null} Updated device record or null if not found
   */
  linkEntry(switchId, entryId) {
    const record = this.get(switchId);
    if (!record) {
      return null;
    }

    record.linked_entry_id = entryId;
    this.dirty = true;
    return record;
  }

  /**
   * Unlink a device from a Home Assistant config entry.
   * @param {string} switchId
   * @returns {object|null} Updated device record or null if not found
   */
  unlinkEntry(switchId) {
    const record = this.get(switchId);
    if (!record) {
      return null;
    }

    record.linked_entry_id = null;
    this.dirty = true;
    return record;
  }

  /**
   * Find all devices linked to a Home Assistant entry.
   * @param {string} entryId
   * @returns {object[]} Array of device records
   */
  getByEntryId(entryId) {
    return this.getAll().filter((r) => r.linked_entry_id === entryId);
  }

  /**
   * Find devices by online status.
   * @param {string} status - "online" | "offline" | "unknown"
   * @returns {object[]} Array of device records
   */
  getByStatus(status) {
    return this.getAll().filter((r) => r.online_status === status);
  }

  /**
   * Check if registry is dirty (has unsaved changes).
   * @returns {boolean}
   */
  isDirty() {
    return this.dirty;
  }
}

module.exports = { RegistryStore, DEFAULT_REGISTRY_PATH };
