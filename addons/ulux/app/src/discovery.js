'use strict';

const dgram = require('dgram');

const DISCOVERY_PORT = 34984;
const DISCOVERY_INTERVAL_MS = 5000;

// Discovery request captured from the u::lux configuration software.
const DISCOVERY_REQUEST = Buffer.from(
  '3080010200009d07bd63f9668674c7c2429c0e998674c7c2429c0e998674c7c2429c0e998674c7c2429c0e998674c7c2',
  'hex'
);

function buildDiscoveryRequest(sequence) {
  const request = Buffer.from(DISCOVERY_REQUEST);
  request.writeUInt16LE(sequence & 0xffff, 6);
  return request;
}

function parseDiscoveryResponse(message, remote, discoveryPort = DISCOVERY_PORT) {
  if (!Buffer.isBuffer(message) || message.length < 14) return null;
  if (message[1] !== 0x80 || message[2] !== 0x01 || message[3] !== 0x02) return null;
  if (message[0] !== message.length || message.length < 0xe4) return null;

  return {
    ip: remote.address,
    port: remote.port || discoveryPort,
    protocol_id: message.subarray(8, 14).toString('hex').toUpperCase(),
    sequence: message.readUInt16LE(6),
    raw_hex: message.toString('hex'),
    last_seen: new Date().toISOString(),
    discovered: true,
  };
}

function createDiscoveryScanner({
  host,
  port = DISCOVERY_PORT,
  switches = [],
  intervalMs = DISCOVERY_INTERVAL_MS,
  onDevice,
  log,
}) {
  const socket = dgram.createSocket('udp4');
  let timer = null;
  let sequence = 0x9d07;

  function sendDiscovery() {
    const request = buildDiscoveryRequest(sequence++);
    socket.send(request, 0, request.length, port, '255.255.255.255', (err) => {
      if (err) log?.warning(`Discovery broadcast failed: ${err.message}`);
      else log?.debug(`Discovery broadcast sent on UDP ${DISCOVERY_PORT}`);
    });
  }

  socket.on('error', (err) => {
    log?.error(`Discovery socket error: ${err.message}`);
  });

  socket.on('message', (message, remote) => {
    const discovered = parseDiscoveryResponse(message, remote, port);
    if (!discovered) return;

    const configured = switches.find(
      (item) => String(item.ip || '') === discovered.ip
    );
    const switchId = configured?.switch_id || null;

    onDevice?.({
      ...discovered,
      senderIp: discovered.ip,
      senderPort: port,
      switchId,
      switchName: configured?.name,
      configured: Boolean(configured),
    });

    log?.info(
      `Discovery response from ${discovered.ip} ` +
      `(protocol_id=${discovered.protocol_id}, ${message.length} bytes)`
    );
  });

  return {
    start() {
      socket.bind(DISCOVERY_PORT, host, () => {
        socket.setBroadcast(true);
        log?.info(`u::lux discovery listening on UDP ${port}`);
        sendDiscovery();
        timer = setInterval(sendDiscovery, intervalMs);
      });
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      socket.close();
    },
  };
}

module.exports = {
  DISCOVERY_PORT,
  DISCOVERY_INTERVAL_MS,
  buildDiscoveryRequest,
  parseDiscoveryResponse,
  createDiscoveryScanner,
};
