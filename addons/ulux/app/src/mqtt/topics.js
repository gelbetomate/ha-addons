'use strict';

/**
 * Return the MQTT device key from the available serial number information.
 * Never use MAC, IP, or the UMP protocol address as MQTT identity.
 */
function mqttDeviceKey(sw = {}) {
  const serial = sw.serial_number ?? sw.serial_number_candidate;
  if (serial !== null && serial !== undefined && String(serial).trim()) {
    return `serial_${String(serial).trim()}`;
  }
  return 'unresolved';
}

module.exports = { mqttDeviceKey };
