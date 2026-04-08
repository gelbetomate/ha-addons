'use strict';

const fs = require('fs');
const path = require('path');

// Home Assistant passes add-on options as /data/options.json
const OPTIONS_PATH = process.env.OPTIONS_PATH || '/data/options.json';

const DEFAULTS = {
  switches: [],
  listen_host: '0.0.0.0',
  listen_port: 34988,
  mode: {
    ha_events: true,
    mqtt: false,
  },
  ha: {
    ws_url: 'ws://supervisor/core/websocket',
    token: '',
  },
  mqtt: {
    host: 'core-mosquitto',
    port: 1883,
    username: '',
    password: '',
    base_topic: 'ulux',
  },
  log_level: 'info',
};

/**
 * Load and validate the add-on configuration.
 * Deep-merges DEFAULTS with the options file so partial configs still work.
 * @returns {object} Resolved configuration
 */
function loadConfig() {
  let options = {};

  if (fs.existsSync(OPTIONS_PATH)) {
    try {
      options = JSON.parse(fs.readFileSync(OPTIONS_PATH, 'utf8'));
    } catch (err) {
      console.error(`Failed to parse options file at ${OPTIONS_PATH}:`, err.message);
      process.exit(1);
    }
  } else {
    console.warn(`Options file not found at ${OPTIONS_PATH}, using defaults`);
  }

  const config = deepMerge(DEFAULTS, options);

  // If no token supplied, use the Supervisor-provided token
  if (!config.ha.token) {
    config.ha.token = process.env.SUPERVISOR_TOKEN || '';
  }

  return config;
}

/**
 * Recursively merge source into target (plain-object only).
 * Arrays are replaced (not merged) so "switches" lists work correctly.
 */
function deepMerge(target, source) {
  const result = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = { loadConfig };
