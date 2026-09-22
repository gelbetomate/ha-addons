'use strict';

const dgram = require('dgram');
const fs = require('fs');
const { execFileSync } = require('child_process');

const DISCOVERY_PORT = 34984;
const UMP_PORT = 34988;
const DISCOVERY_INTERVAL_MS = 0;
const probedIps = new Set();

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
    port: UMP_PORT,
    discovery_port: remote.port || discoveryPort,
    protocol_id: message.subarray(8, 14).toString('hex').toUpperCase(),
    sequence: message.readUInt16LE(6),
    raw_hex: message.toString('hex'),
    last_seen: new Date().toISOString(),
    discovered: true,
  };
}

function lookupMacAddress(ip) {
  try {
    const lines = fs.readFileSync('/proc/net/arp', 'utf8').split(/\r?\n/).slice(1);
    for (const line of lines) {
      const fields = line.trim().split(/\s+/);
      if (fields.length >= 4 && fields[0] === ip && /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i.test(fields[3])) {
        return fields[3].toUpperCase();
      }
    }
  } catch {
    // ARP lookup is best effort; discovery still works without it.
  }

  if (!probedIps.has(ip)) {
    probedIps.add(ip);
    try {
      execFileSync('ping', ['-c', '1', '-W', '1', ip], {
        encoding: 'utf8',
        timeout: 1500,
        stdio: 'ignore',
      });
    } catch {
      // A failed ping can still populate the neighbor table on some systems.
    }

    try {
      const arp = fs.readFileSync('/proc/net/arp', 'utf8').split(/\r?\n/).slice(1);
      for (const line of arp) {
        const fields = line.trim().split(/\s+/);
        if (fields.length >= 4 && fields[0] === ip && /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/i.test(fields[3])) {
          return fields[3].toUpperCase();
        }
      }
    } catch {
      // Continue without a MAC when the platform exposes no ARP table.
    }
  }

  for (const command of ['ip', 'arp']) {
    try {
      const args = command === 'ip' ? ['neigh', 'show', ip] : ['-n', ip];
      const output = execFileSync(command, args, { encoding: 'utf8', timeout: 500 });
      const match = output.match(/(?:lladdr\s+)?([0-9a-f]{2}(?::[0-9a-f]{2}){5})/i);
      if (match) return match[1].toUpperCase();
    } catch {
      // The command may not exist in the add-on image.
    }
  }

  return null;
}

function inferSerialNumber(macAddress) {
  if (!macAddress) return null;
  const octets = macAddress.split(':');
  if (octets.length !== 6) return null;
  return parseInt(`${octets[4]}${octets[5]}`, 16);
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

    const macAddress = lookupMacAddress(discovered.ip);
    const configured = switches.find(
      (item) => String(item.ip || '') === discovered.ip
    );
    const serialNumber = configured?.serial_number || inferSerialNumber(macAddress);
    const switchId = configured?.switch_id || macAddress || null;
    const name = configured?.name || (serialNumber ? `u::lux Switch (${serialNumber})` : null);

    onDevice?.({
      ...discovered,
      mac_address: macAddress,
      serial_number: serialNumber,
      serial_number_source: macAddress ? 'mac_suffix_inference' : null,
      senderIp: discovered.ip,
      senderPort: port,
      umpPort: UMP_PORT,
      switchId,
      switchName: name,
      configured: Boolean(configured),
    });

    log?.info(
      `Discovery response from ${discovered.ip} ` +
      `(protocol_id=${discovered.protocol_id}, ${message.length} bytes)`
    );
  });

  return {
    start() {
      socket.bind(port, host, () => {
        socket.setBroadcast(true);
        log?.info(`u::lux discovery listening on UDP ${port}`);
        sendDiscovery();
        if (intervalMs > 0) timer = setInterval(sendDiscovery, intervalMs);
      });
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      socket.close();
    },
    scan: sendDiscovery,
  };
}

module.exports = {
  DISCOVERY_PORT,
  DISCOVERY_INTERVAL_MS,
  buildDiscoveryRequest,
  parseDiscoveryResponse,
  lookupMacAddress,
  inferSerialNumber,
  createDiscoveryScanner,
};
