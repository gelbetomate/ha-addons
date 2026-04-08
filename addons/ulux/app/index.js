'use strict';

const { loadConfig } = require('./src/config');
const { createUdpServer } = require('./src/udp');
const { createHaWebSocket } = require('./src/ha/websocket');
const { createMqttClient } = require('./src/mqtt/client');
const { createDispatcher } = require('./src/handlers/index');

async function main() {
  const config = loadConfig();
  const log = makeLogger(config.log_level);

  log.info('u::Lux UMP Bridge starting');
  log.info(`Configured switches: ${config.switches.length}`);
  log.info(`Listen: ${config.listen_host}:${config.listen_port}`);
  log.info(`Mode — HA events: ${config.mode.ha_events}, MQTT: ${config.mode.mqtt}`);

  // --- HA WebSocket client ---
  let haClient = null;
  if (config.mode.ha_events) {
    haClient = createHaWebSocket(config.ha, log);
    haClient.connect(); // non-blocking; reconnects on failure
  }

  // --- MQTT client ---
  let mqttClient = null;
  if (config.mode.mqtt) {
    mqttClient = createMqttClient(config.mqtt, config.switches, log);
    mqttClient.connect(); // non-blocking; reconnects on failure
  }

  // --- Build message dispatcher ---
  // Create the UDP server first so its send() function is available immediately
  // when the dispatcher needs to reply to the switch.
  // Use a late-bound wrapper so we can wire dispatch → udpServer in one step.
  let dispatchFn = null;

  // --- Start UDP server ---
  const udpServer = createUdpServer({
    host: config.listen_host,
    port: config.listen_port,
    switches: config.switches,
    onPacket: (ctx) => dispatchFn && dispatchFn(ctx),
    log,
  });

  dispatchFn = createDispatcher({
    config,
    haClient,
    mqttClient,
    udpSend: udpServer.send,
    log,
  });

  udpServer.start();
  log.info(`UDP server listening on ${config.listen_host}:${config.listen_port}`);
}

/**
 * Create a simple logger respecting the configured level.
 * @param {'debug'|'info'|'warning'|'error'|'fatal'} level
 */
function makeLogger(level) {
  const levels = { debug: 0, info: 1, warning: 2, error: 3, fatal: 4 };
  const threshold = levels[level] ?? levels.info;
  const ts = () => new Date().toISOString();

  const logger = {};
  for (const [name, num] of Object.entries(levels)) {
    const label = name.toUpperCase().padEnd(7);
    logger[name] = num >= threshold
      ? (...args) => console.log(`${ts()} [${label}]`, ...args)
      : () => {};
  }
  return logger;
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
