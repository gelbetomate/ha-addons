'use strict';

const mqtt = require('mqtt');

const RECONNECT_DELAY_MS = 5000;

/**
 * Create an MQTT client for the ulux bridge.
 *
 * Publishes inbound UMP events and subscribes for outbound commands.
 * Command handling is stubbed — implement UMP command encoding before enabling.
 *
 * Topic scheme:
 *   Publish:   <base_topic>/<switch_id>/event/<type>   (JSON payload)
 *   Subscribe: <base_topic>/<switch_id>/cmd/#          (TODO: encode → UMP UDP)
 *
 * If the connection fails the client retries automatically so the rest of the
 * add-on keeps running.
 *
 * @param {object}   mqttConfig - { host, port, username, password, base_topic }
 * @param {object[]} switches   - Configured switch list (used to set up cmd subscriptions)
 * @param {object}   log        - Logger
 * @returns {{ connect: Function, publish: Function, disconnect: Function }}
 */
function createMqttClient(mqttConfig, switches, log) {
  let client = null;
  let connected = false;

  const brokerUrl = `mqtt://${mqttConfig.host}:${mqttConfig.port}`;

  function connect() {
    log.info(`Connecting to MQTT broker: ${brokerUrl}`);

    const options = {
      clientId: `ulux-bridge-${Date.now()}`,
      reconnectPeriod: RECONNECT_DELAY_MS,
    };

    if (mqttConfig.username) {
      options.username = mqttConfig.username;
      options.password = mqttConfig.password || '';
    }

    try {
      client = mqtt.connect(brokerUrl, options);
    } catch (err) {
      log.error('Failed to create MQTT client:', err.message);
      return;
    }

    client.on('connect', () => {
      connected = true;
      log.info('MQTT broker connected');
      subscribeCommandTopics();
    });

    client.on('reconnect', () => {
      log.info('MQTT reconnecting...');
    });

    client.on('error', (err) => {
      log.error('MQTT error:', err.message);
    });

    client.on('close', () => {
      connected = false;
      log.warning('MQTT connection closed');
    });

    client.on('message', (topic, message) => {
      handleCommand(topic, message);
    });
  }

  /**
   * Publish a message to an MQTT topic.
   * @param {string} topic
   * @param {string} payload - JSON string
   */
  function publish(topic, payload) {
    if (!connected || !client) {
      log.warning(`MQTT not connected — dropping message to ${topic}`);
      return;
    }
    client.publish(topic, payload, { qos: 0, retain: false }, (err) => {
      if (err) log.error(`MQTT publish error on ${topic}:`, err.message);
    });
  }

  /**
   * Subscribe to command topics for all configured switches.
   */
  function subscribeCommandTopics() {
    for (const sw of switches) {
      if (!sw.switch_id) continue;
      const topic = `${mqttConfig.base_topic}/${sw.switch_id}/cmd/#`;
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) {
          log.error(`Failed to subscribe to ${topic}:`, err.message);
        } else {
          log.info(`Subscribed to MQTT command topic: ${topic}`);
        }
      });
    }
  }

  /**
   * Handle an inbound MQTT command message.
   *
   * TODO: Decode the command payload and encode + send the appropriate UMP UDP
   *       datagram to the target switch.
   *
   * @param {string} topic
   * @param {Buffer} message
   */
  function handleCommand(topic, message) {
    log.info(`MQTT command received on ${topic}: ${message.toString()}`);
    // TODO: Parse topic to extract switch_id and command type
    // TODO: Encode UMP command datagram
    // TODO: Send UDP datagram to switch IP:port
    log.warning(`Command handling not yet implemented for topic: ${topic}`);
  }

  function disconnect() {
    if (client) {
      client.end();
      client = null;
    }
  }

  return { connect, publish, disconnect };
}

module.exports = { createMqttClient };
