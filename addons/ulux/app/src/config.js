'use strict';

const fs = require('fs');
const path = require('path');

// Home Assistant passes add-on options as /data/options.json
const OPTIONS_PATH = process.env.OPTIONS_PATH || '/data/options.json';

const DEFAULTS = {
  switches: [],
  listen_host: '0.0.0.0',
  listen_port: 34988,
  audio_host: '0.0.0.0',
  audio_port: 35000,
  audio_control_port: 35004,
  audio_target_ip: '',
  audio_jitter_depth: 3,
  sensor_poll_interval_ms: 60000,
  assist_ptt_key: 1,
  assist_mic_gain: 80,
  assist_speaker_volume: 70,
  wyoming_port: 10700,
  wyoming_switch_id: '',
  wyoming_name: 'u::lux Assist Satellite',
  discovery_port: 34984,
  discovery_interval_ms: 0,
  control_flags: 0xBF08001F,
  timezone: 'Europe/Berlin',
  mode: {
    ha_events: true,
    ha_device_management: true,
    mqtt: false,
    mqtt_discovery: false,
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
  stream: {
    width: 176,
    height: 184,
    actor_id: 1,
    lines_per_packet: 4,
    inter_packet_delay_ms: 5,
  },
  api_port: 8099,
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

  // Migrate the former placeholder stream defaults to the HA Stream layout.
  if (
    config.stream.width === 86 &&
    config.stream.height === 90 &&
    config.stream.actor_id === 23
  ) {
    config.stream.width = 176;
    config.stream.height = 184;
    config.stream.actor_id = 1;
  }
  if (config.stream.width === 176 && config.stream.height === 184 && config.stream.lines_per_packet === 5) {
    config.stream.lines_per_packet = 4;
  }

  // Supervisor provides SUPERVISOR_TOKEN for Supervisor APIs and the
  // Home Assistant Core proxy when homeassistant_api is enabled.
  if (!config.ha.token) {
    config.ha.token = process.env.SUPERVISOR_TOKEN || '';
  }

  if (!config.ha.token) {
    console.warn('No Home Assistant token found via ha.token or SUPERVISOR_TOKEN. ' +
      'HA events/device management disabled.');
    config.mode.ha_events = false;
    config.mode.ha_device_management = false;
  }

  return config;
}

/**
 * Persist the runtime-selectable integration settings in the local options
 * file and, in an add-on, in the Supervisor-managed options store.
 */
async function persistRuntimeOptions(config) {
  let options = {};
  if (fs.existsSync(OPTIONS_PATH)) {
    options = JSON.parse(fs.readFileSync(OPTIONS_PATH, 'utf8'));
  }
  options.mode = {
    ...(options.mode || {}),
    ha_events: Boolean(config.mode?.ha_events),
    mqtt: Boolean(config.mode?.mqtt),
    mqtt_discovery: Boolean(config.mode?.mqtt_discovery),
  };
  options.mqtt = {
    ...(options.mqtt || {}),
    host: config.mqtt?.host || '',
    port: Number(config.mqtt?.port || 1883),
    username: config.mqtt?.username || '',
    password: config.mqtt?.password || '',
    base_topic: config.mqtt?.base_topic || 'ulux',
  };

  const temporaryPath = `${OPTIONS_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(options, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, OPTIONS_PATH);

  const supervisorToken = process.env.SUPERVISOR_TOKEN;
  if (!supervisorToken || typeof fetch !== 'function') return;

  const supervisorUrl = process.env.SUPERVISOR_API || 'http://supervisor';
  const response = await fetch(`${supervisorUrl}/addons/self/options`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supervisorToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ options }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supervisor options update failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
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

module.exports = { loadConfig, persistRuntimeOptions };
