'use strict';

/**
 * Return a stable MQTT device key.
 * Never use the transient IP address or the UMP protocol address as identity.
 */
function mqttDeviceKey(sw = {}) {
  if (sw.serial_number !== null && sw.serial_number !== undefined && String(sw.serial_number).trim()) {
    return `serial_${String(sw.serial_number).trim()}`;
  }
  if (sw.switch_id && /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/i.test(String(sw.switch_id))) {
    return String(sw.switch_id).toUpperCase();
  }
  if (sw.switch_id) return String(sw.switch_id);
  return 'unresolved';
}

module.exports = { mqttDeviceKey };
