'use strict';

const dgram = require('dgram');

/**
 * Create a UDP server that receives UMP packets from u::Lux switches.
 *
 * @param {object} opts
 * @param {string}   opts.host     - Bind address (e.g. '0.0.0.0')
 * @param {number}   opts.port     - Bind port (default UMP: 34988)
 * @param {object[]} opts.switches - Configured switches [{name, switch_id, ip, port}]
 * @param {Function} opts.onPacket - Callback: onPacket(parsedContext) called for every datagram
 * @param {object}   opts.log      - Logger
 * @returns {{ start: Function, stop: Function }}
 */
function createUdpServer({ host, port, switches, onPacket, log }) {
  const socket = dgram.createSocket('udp4');

  socket.on('error', (err) => {
    log.error('UDP socket error:', err.message);
  });

  socket.on('message', (msg, rinfo) => {
    const hex = msg.toString('hex');
    log.debug(`UDP packet from ${rinfo.address}:${rinfo.port} (${msg.length} bytes): ${hex}`);

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

  return {
    start() {
      socket.bind(port, host);
    },
    stop() {
      socket.close();
    },
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
