'use strict';

const WebSocket = require('ws');

const RECONNECT_DELAY_MS = 5000;

/**
 * Create a Home Assistant WebSocket API client.
 *
 * Implements the HA WebSocket authentication handshake and exposes a
 * `fireEvent()` method for publishing events.
 *
 * If the connection fails the client logs the error and retries automatically
 * so the rest of the add-on keeps running.
 *
 * Reference: https://developers.home-assistant.io/docs/api/websocket
 *
 * @param {object} haConfig  - { ws_url, token }
 * @param {object} log       - Logger
 * @returns {{ connect: Function, fireEvent: Function, disconnect: Function }}
 */
function createHaWebSocket(haConfig, log) {
  let ws = null;
  let authenticated = false;
  let msgId = 1;
  let pendingCalls = new Map(); // msgId → { resolve, reject }
  let reconnectTimer = null;
  let stopped = false;

  function connect() {
    if (stopped) return;

    log.info(`Connecting to HA WebSocket: ${haConfig.ws_url}`);

    try {
      ws = new WebSocket(haConfig.ws_url);
    } catch (err) {
      log.error('Failed to create WebSocket:', err.message);
      scheduleReconnect();
      return;
    }

    ws.on('open', () => {
      log.debug('HA WebSocket connection opened, waiting for auth_required');
    });

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        log.warning('Received non-JSON message from HA WS');
        return;
      }
      handleMessage(msg);
    });

    ws.on('close', (code) => {
      authenticated = false;
      log.warning(`HA WebSocket closed (code ${code})`);
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      log.error('HA WebSocket error:', err.message);
      // 'close' event will follow; reconnect handled there
    });
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'auth_required':
        log.debug('HA WS: auth_required — sending token');
        send({ type: 'auth', access_token: haConfig.token });
        break;

      case 'auth_ok':
        log.info('HA WebSocket authenticated successfully');
        authenticated = true;
        break;

      case 'auth_invalid':
        log.error('HA WebSocket authentication failed — check your token');
        ws.close();
        break;

      case 'result':
        if (pendingCalls.has(msg.id)) {
          const { resolve, reject } = pendingCalls.get(msg.id);
          pendingCalls.delete(msg.id);
          if (msg.success) {
            resolve(msg.result);
          } else {
            reject(new Error(msg.error?.message || 'Unknown HA WS error'));
          }
        }
        break;

      default:
        log.debug(`HA WS message type "${msg.type}" (ignored)`);
    }
  }

  /**
   * Fire a Home Assistant event.
   * @param {string} eventType
   * @param {object} eventData
   * @returns {Promise<object>} Resolves with the HA result
   */
  function fireEvent(eventType, eventData) {
    return sendCommand({
      type: 'fire_event',
      event_type: eventType,
      event_data: eventData,
    });
  }

  /**
   * Send a command and wait for its result.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  function sendCommand(payload) {
    return new Promise((resolve, reject) => {
      if (!authenticated || !ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('HA WebSocket not connected / authenticated'));
        return;
      }
      const id = msgId++;
      pendingCalls.set(id, { resolve, reject });
      send({ ...payload, id });
    });
  }

  function send(payload) {
    try {
      ws.send(JSON.stringify(payload));
    } catch (err) {
      log.error('Failed to send to HA WS:', err.message);
    }
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY_MS);
  }

  function disconnect() {
    stopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  }

  return { connect, fireEvent, disconnect };
}

module.exports = { createHaWebSocket };
