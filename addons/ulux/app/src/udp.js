'use strict';

const dgram = require('dgram');

/**
 * Create a UDP server that receives UMP packets from u::Lux switches
 * and can send reply datagrams back to the originating device.
 *
 * @param {object} opts
 * @param {string}   opts.host     - Bind address (e.g. '0.0.0.0')
 * @param {number}   opts.port     - Bind port (default UMP: 34988)
 * @param {object[]} opts.switches - Configured switches [{name, switch_id, ip, port}]
 * @param {Function} opts.onPacket - Callback: onPacket(parsedContext) called for every datagram
 * @param {object}   opts.log      - Logger
 * @returns {{ start: Function, stop: Function, send: Function }}
 */
function createUdpServer({ host, port, switches, onPacket, log }) {
  const socket = dgram.createSocket('udp4');
  const videoAckWaiters = new Map();

  socket.on('error', (err) => {
    log.error('UDP socket error:', err.message);
  });

  socket.on('message', (msg, rinfo) => {
    const hex = msg.toString('hex');
    log.debug(`UDP packet from ${rinfo.address}:${rinfo.port} (${msg.length} bytes): ${hex}`);

    // The legacy video sender receives non-UMP replies as per-chunk ACKs.
    if (msg[0] !== 0x01) {
      const waiters = videoAckWaiters.get(rinfo.address);
      if (waiters?.length) {
        const waiter = waiters.shift();
        clearTimeout(waiter.timer);
        if (!waiters.length) videoAckWaiters.delete(rinfo.address);
        waiter.resolve(msg);
        return;
      }
    }

    // Identify which configured switch sent this packet
    const matchedSwitch = resolveSwitch(switches, rinfo.address);

    const ctx = {
      raw: msg,
      hex,
      senderIp: rinfo.address,
      senderPort: rinfo.port,
      switch: matchedSwitch,
      timestamp: new Date().toISOString(),
    };

    try {
      onPacket(ctx);
    } catch (err) {
      log.error('Error processing packet:', err.message);
    }
  });

  /**
   * Send a datagram to a remote host (reply-to-sender).
   * @param {string} remoteHost
   * @param {number} remotePort
   * @param {Buffer} buf
   */
  function send(remoteHost, remotePort, buf) {
    socket.send(buf, 0, buf.length, remotePort, remoteHost, (err) => {
      if (err) {
        log.error(`UDP send error to ${remoteHost}:${remotePort}: ${err.message}`);
      } else {
        log.debug(`UDP sent ${buf.length} bytes to ${remoteHost}:${remotePort}`);
      }
    });
  }

  function waitForVideoAck(remoteHost, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        timer: setTimeout(() => {
          const waiters = videoAckWaiters.get(remoteHost) || [];
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          if (!waiters.length) videoAckWaiters.delete(remoteHost);
          reject(new Error(`Video ACK timeout from ${remoteHost}`));
        }, timeoutMs),
      };
      const waiters = videoAckWaiters.get(remoteHost) || [];
      waiters.push(waiter);
      videoAckWaiters.set(remoteHost, waiters);
    });
  }

  return {
    start() {
      socket.bind(port, host);
    },
    stop() {
      socket.close();
    },
    send,
    waitForVideoAck,
  };
}

/**
 * Resolve a configured switch entry by sender IP.
 * Returns the matching switch config or a synthetic entry if unknown.
 *
 * @param {object[]} switches
 * @param {string}   senderIp
 * @returns {object}
 */
function resolveSwitch(switches, senderIp) {
  const match = switches.find((sw) => sw.ip === senderIp);
  if (match) return match;

  // Unknown sender — return a placeholder so downstream code always has a switch object
  return { name: 'unknown', switch_id: null, ip: senderIp, port: null };
}

module.exports = { createUdpServer };
