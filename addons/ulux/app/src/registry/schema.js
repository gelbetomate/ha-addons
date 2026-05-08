'use strict';

/**
 * Device registry schema and record definition.
 * 
 * A device record represents a u::Lux Switch that has been discovered or
 * manually registered. Records persist across addon restarts and track both
 * device state (online/offline, last_seen) and Home Assistant linkage (linked_entry_id).
 *
 * Schema versioning: Allows safe migrations when the record structure changes.
 */

const REGISTRY_VERSION = 1;

/**
 * Create a new device record.
 * @param {object} data - Device data: { switch_id, name?, ip?, port? }
 * @returns {object} Device record with metadata
 */
function createDeviceRecord(data) {
  const now = new Date().toISOString();
  return {
    switch_id: (data.switch_id || '').toUpperCase(),
    name: data.name || `u::Lux Switch (${data.switch_id})`,
    ip: data.ip || '',
    port: data.port || 50000,
    online_status: 'unknown',
    last_seen: null,
    discovered_at: now,
    created_at: now,
    linked_entry_id: null, // Home Assistant config entry ID when linked
    metadata: {}, // Extensible for future fields (model, firmware, etc.)
  };
}

/**
 * Validate a device record.
 * @param {object} record
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDeviceRecord(record) {
  const errors = [];

  if (!record.switch_id) {
    errors.push('switch_id is required');
  } else if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/i.test(record.switch_id)) {
    errors.push('switch_id must be a valid MAC address (XX:XX:XX:XX:XX:XX)');
  }

  if (!record.name || typeof record.name !== 'string') {
    errors.push('name must be a non-empty string');
  }

  if (record.ip && !/^(\d{1,3}\.){3}\d{1,3}$/.test(record.ip)) {
    errors.push('ip must be a valid IPv4 address');
  }

  if (record.port && (typeof record.port !== 'number' || record.port < 1 || record.port > 65535)) {
    errors.push('port must be a number between 1 and 65535');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize a device record to the current schema version.
 * Used for migrations when the schema changes.
 * @param {object} record
 * @param {number} fromVersion
 * @returns {object} Migrated record
 */
function migrateDeviceRecord(record, fromVersion) {
  // For v1 → vN migrations, add handlers here
  // For now, just return as-is since we're on v1
  return record;
}

module.exports = {
  REGISTRY_VERSION,
  createDeviceRecord,
  validateDeviceRecord,
  migrateDeviceRecord,
};
