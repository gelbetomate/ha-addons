'use strict';

const { loadConfig } = require('./src/config');
const { createUdpServer } = require('./src/udp');
const { createAudioTransport } = require('./src/audio');
const { createHaWebSocket } = require('./src/ha/websocket');
const { createMqttClient } = require('./src/mqtt/client');
const { createDispatcher } = require('./src/handlers/index');
const { handleCommandMessage } = require('./src/handlers/command');
const { createApiServer } = require('./src/http');
const { createAssistSessionManager } = require('./src/assistSession');
const { createWyomingServer } = require('./src/wyoming');
const { createDiscoveryRegistry } = require('./src/discoveryRegistry');
const { createDiscoveryScanner } = require('./src/discovery');
const { RegistryStore } = require('./src/registry/store');

async function main() {
  const config = loadConfig();
  if (config.timezone) {
    process.env.TZ = config.timezone;
  }
  const log = makeLogger(config.log_level);

  log.info('u::Lux UMP Bridge starting');
  log.info(`Configured switches: ${config.switches.length}`);
  log.info(`Listen: ${config.listen_host}:${config.listen_port}`);
  log.info(`Audio: ${config.audio_host}:${config.audio_port} (control ${config.audio_control_port})`);
  log.info(`Mode — HA events: ${config.mode.ha_events}, MQTT: ${config.mode.mqtt}`);

  // --- Persistent registry store ---
  const registryStore = new RegistryStore(undefined, log);
  try {
    registryStore.load();
  } catch (err) {
    log.warning(`Failed to load registry; starting fresh. Error: ${err.message}`);
  }

  // Pre-populate registry from configured switches (for backwards compatibility)
  for (const sw of config.switches) {
    if (!registryStore.get(sw.switch_id)) {
      registryStore.upsert({
        switch_id: sw.switch_id,
        name: sw.name || `u::lux ${sw.switch_id}`,
        ip: sw.ip || '',
        port: sw.port || 50000,
      });
    }
  }

  // --- HA WebSocket client ---
  let haClient = null;
  if (config.mode.ha_events || config.mode.ha_device_management) {
    haClient = createHaWebSocket(config.ha, log);
    haClient.connect(); // non-blocking; reconnects on failure
  }

  // --- Build message dispatcher ---
  // Create the UDP server first so its send() function is available immediately
  // when the dispatcher needs to reply to the switch.
  // Use a late-bound wrapper so we can wire dispatch → udpServer in one step.
  let dispatchFn = null;
  const discoveryRegistry = createDiscoveryRegistry(registryStore, log);

  const discoveryScanner = createDiscoveryScanner({
    host: config.listen_host,
    port: config.discovery_port,
    intervalMs: config.discovery_interval_ms,
    switches: config.switches,
    onDevice: (device) => {
      discoveryRegistry.upsert(device);
      if (config.mode.mqtt && config.mode.mqtt_discovery) {
        mqttClient?.publishDiscovery(device);
      }
    },
    log,
  });

  // --- Start UDP server ---
  const udpServer = createUdpServer({
    host: config.listen_host,
    port: config.listen_port,
    switches: config.switches,
    onPacket: (ctx) => dispatchFn && dispatchFn(ctx),
    log,
  });

  const audioTransport = createAudioTransport({
    host: config.audio_host,
    port: config.audio_port,
    switches: config.switches,
    log,
    onPacket: (ctx) => {
      log.debug(
        `Received opaque audio packet for switch "${ctx.switch.name}" ` +
        `from ${ctx.senderIp}:${ctx.senderPort}`,
      );
    },
    onFrame: (frame) => {
      log.debug(
        `Decoded audio frame for switch "${frame.switch.name}" ` +
        `(${frame.sampleRate} Hz, ${frame.pcm.length} PCM bytes${frame.missing ? ', missing' : ''})`,
      );
    },
    jitterDepth: config.audio_jitter_depth || 3,
  });

  const assistSession = createAssistSessionManager({
    config,
    udpSend: udpServer.send,
    haClient,
    log,
  });

  const wyomingServer = createWyomingServer({
    config,
    audioTransport,
    assistSession,
    log,
  });

  // --- MQTT client ---
  let mqttClient = null;
  {
    /**
     * Handle registry commands from MQTT.
     * Topics: <base_topic>/registry/add_device, update_device, delete_device
     */
    async function handleMqttRegistryCommand({ action, payload }) {
      const store = discoveryRegistry.getStore();
      try {
        if (action === 'add_device' || action === 'update_device') {
          const device = store.upsert(payload);
          log.info(`MQTT: registered device "${device.switch_id}"`);
        } else if (action === 'delete_device') {
          if (payload.switch_id) {
            store.remove(payload.switch_id);
            log.info(`MQTT: deleted device "${payload.switch_id}"`);
          }
        }
      } catch (err) {
        log.error(`MQTT registry command failed: ${err.message}`);
      }
    }

    mqttClient = createMqttClient(
      config.mqtt,
      config.switches,
      log,
      (cmd) => handleCommandMessage(cmd, { config, udpSend: udpServer.send, discoveryRegistry, log }),
      handleMqttRegistryCommand
    );
    if (config.mode.mqtt) mqttClient.connect(); // non-blocking; reconnects on failure
  }

  dispatchFn = createDispatcher({
    config,
    haClient,
    mqttClient,
    assistSession,
    discoveryRegistry,
    udpSend: udpServer.send,
    log,
  });

  udpServer.start();
  audioTransport.start();
  wyomingServer.start();
  log.info(`UDP server listening on ${config.listen_host}:${config.listen_port}`);
  log.info(`Audio UDP listener on ${config.audio_host}:${config.audio_port}`);
  log.info(`Wyoming server listening on ${config.listen_host}:${config.wyoming_port}`);
  discoveryScanner.start();

  // --- HTTP API server ---
  // Allows the u::lux Display integration to delegate image streaming to the bridge.
  const apiServer = createApiServer({
    config,
    udpSend: udpServer.send,
    audioTransport,
    discoveryRegistry,
    discoveryScanner,
    haClient,
    mqttClient,
    log,
  });
  apiServer.start();

  // --- Graceful shutdown ---
  // Save registry on SIGTERM, SIGINT
  const cleanupFn = () => {
    log.info('Bridge shutting down, saving registry...');
    discoveryScanner.stop();
    udpServer.stop();
    audioTransport.stop();
    wyomingServer.stop();
    assistSession.stopAll();
    try {
      registryStore.save();
      log.info('Registry saved successfully');
    } catch (err) {
      log.error(`Failed to save registry on shutdown: ${err.message}`);
    }
    process.exit(0);
  };

  process.on('SIGTERM', cleanupFn);
  process.on('SIGINT', cleanupFn);

  // Also save periodically every 60 seconds if dirty
  setInterval(() => {
    if (registryStore.isDirty()) {
      try {
        registryStore.save();
      } catch (err) {
        log.error(`Failed to auto-save registry: ${err.message}`);
      }
    }
  }, 60000);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

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
