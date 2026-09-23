'use strict';

const dgram = require('dgram');
const fs = require('fs');
const crypto = require('crypto');
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

function inferUmpDeviceId(serialNumber) {
  return { 131: 17, 1893: 92, 2888: 93, 3721: 94 }[serialNumber] || null;
}

function decodeSyncPacket(message) {
  if (!Buffer.isBuffer(message) || message.length < 8) return null;
  const decoded = {
    declared_length: message[0],
    actual_length: message.length,
    family: `0x${message[1].toString(16).padStart(2, '0')}`,
    message_id: `0x${message[2].toString(16).padStart(2, '0')}`,
    variant: `0x${message[3].toString(16).padStart(2, '0')}`,
    reserved_hex: message.subarray(4, 6).toString('hex'),
    sequence: message.readUInt16LE(6),
    payload_length: Math.max(0, message.length - 8),
    payload_hex: message.subarray(8).toString('hex'),
  };
  if (message[2] === 0x83 && message[3] === 0x01 && message.length >= 16) {
    decoded.challenge_echo_hex = message.subarray(8, 16).toString('hex');
    decoded.device_info_payload_hex = message.subarray(16).toString('hex');
  }
  return decoded;
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
  const syncSessions = new Map();

  function sendDiscovery() {
    const request = buildDiscoveryRequest(sequence++);
    socket.send(request, 0, request.length, port, '255.255.255.255', (err) => {
      if (err) log?.warning(`Discovery broadcast failed: ${err.message}`);
      else log?.debug(`Discovery broadcast sent on UDP ${DISCOVERY_PORT}`);
    });
  }

  let scanQuietFinish = null;

  function scanAndWait(waitMs = 10000) {
    sendDiscovery();
    return new Promise((resolve) => {
      let settled = false;
      let quietTimer;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(quietTimer);
        scanQuietFinish = null;
        resolve();
      };
      const timer = setTimeout(finish, waitMs);
      quietTimer = setTimeout(finish, 1500);
      scanQuietFinish = () => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(finish, 1500);
      };
    });
  }

  function sendSyncRequest(ip, messageId, variant, payload = []) {
    const session = syncSessions.get(ip) || { next: 0 };
    session.next = (session.next + 1) & 0xffff;
    syncSessions.set(ip, session);
    const tail = Buffer.from(payload);
    const request = Buffer.alloc(8 + tail.length, 0);
    request[0] = 0x08;
    request[1] = 0x80;
    request[2] = messageId;
    request[3] = variant;
    request.writeUInt16LE(session.next, 6);
    tail.copy(request, 8);
    request[0] = request.length;
    socket.send(request, 0, request.length, port, ip);
    return request;
  }

  function sendSyncRequestWithPayload(ip, messageId, variant, payload) {
    const session = syncSessions.get(ip) || { next: 0 };
    session.next = (session.next + 1) & 0xffff;
    syncSessions.set(ip, session);
    const tail = Buffer.from(payload || []);
    const request = Buffer.alloc(8 + tail.length, 0);
    request[0] = request.length;
    request[1] = 0x80;
    request[2] = messageId;
    request[3] = variant;
    request.writeUInt16LE(session.next, 6);
    tail.copy(request, 8);
    socket.send(request, 0, request.length, port, ip);
    return request;
  }

  function sendDeviceInfoRequest(ip, sync) {
    if (sync.device_info_request_8301_hex) return;
    sync.device_info_request_8301_hex = sendSyncRequestWithPayload(
      ip,
      0x83,
      0x01,
      crypto.randomBytes(8)
    ).toString('hex');
  }

  function scheduleDirectDeviceInfoFallback(ip, sync) {
    clearTimeout(sync.device_info_fallback_timer);
    sync.device_info_fallback_timer = setTimeout(() => {
      if (sync.detail_response_01_hex || sync.device_info_response_83_hex) return;
      // Some firmware skips 0x80/0x01 and starts at 0x83/0x01.
      sync.next = sync.discovery_response?.readUInt16LE(6) || sync.next;
      sendDeviceInfoRequest(ip, sync);
    }, 750);
  }

  socket.on('error', (err) => {
    log?.error(`Discovery socket error: ${err.message}`);
  });

  socket.on('message', (message, remote) => {
    const discovered = parseDiscoveryResponse(message, remote, port);
    if (!discovered) {
      const sync = syncSessions.get(remote.address);
      if (sync && message.length >= 8 && message[1] === 0x80) {
        sync.responses = sync.responses || [];
        sync.responses.push({
          length: message.length,
          hex: message.toString('hex'),
          decoded: decodeSyncPacket(message),
        });
        if (message[2] === 0x01 && message.length >= 168) {
          clearTimeout(sync.device_info_fallback_timer);
          sync.detail_response_01_hex = message.toString('hex');
          sync.detail_response_01 = decodeSyncPacket(message);
          sync.detail_request_0204_hex = sendSyncRequest(remote.address, 0x02, 0x04).toString('hex');
        } else if (message[2] === 0x02 && message[3] === 0x04) {
          sync.detail_response_0204_hex = message.toString('hex');
          sync.detail_response_0204 = decodeSyncPacket(message);
          sync.detail_request_0200_hex = sendSyncRequest(
            remote.address,
            0x02,
            0x00,
            crypto.randomBytes(8)
          ).toString('hex');
        } else if (message[2] === 0x02 && message[3] === 0x00) {
          sync.detail_response_0200_hex = message.toString('hex');
          sync.detail_response_0200 = decodeSyncPacket(message);
          sendDeviceInfoRequest(remote.address, sync);
        } else if (message[2] === 0x83 && message[3] === 0x01) {
          sync.device_info_response_83_hex = message.toString('hex');
          sync.device_info_response_83 = decodeSyncPacket(message);
          const requestHex = sync.device_info_request_8301_hex;
          const request = requestHex ? Buffer.from(requestHex, 'hex') : null;
          const echoedChallenge = message.subarray(8, 16);
          sync.device_info_challenge_echo_matches = Boolean(
            request && request.length >= 16 && echoedChallenge.equals(request.subarray(8, 16))
          );
          if (!sync.detail_response_0204_hex) {
            sync.detail_request_0204_hex = sendSyncRequest(remote.address, 0x02, 0x04).toString('hex');
          }
        }
        const { discovery_response: _discoveryResponse, ...publicSync } = sync;
        onDevice?.({ ip: remote.address, sync_detail: publicSync, last_seen: new Date().toISOString() });
        scanQuietFinish?.();
      }
      return;
    }

    const macAddress = lookupMacAddress(discovered.ip);
    const configured = switches.find(
      (item) => String(item.ip || '') === discovered.ip
    );
    const serialNumber = configured?.serial_number || inferSerialNumber(macAddress);
    const switchId = configured?.switch_id || macAddress || null;
    const name = configured?.name || (serialNumber ? `u::lux Switch (${serialNumber})` : null);

    const sync = syncSessions.get(discovered.ip) || { next: discovered.sequence };
    sync.discovery_response = message;
    sync.next = discovered.sequence;
    sync.discovery_response_decoded = {
      ...discovered,
      payload_hex: message.subarray(14).toString('hex'),
      payload_length: message.length - 14,
    };
    syncSessions.set(discovered.ip, sync);
    scheduleDirectDeviceInfoFallback(discovered.ip, sync);

    onDevice?.({
      ...discovered,
      mac_address: macAddress,
      serial_number: serialNumber,
      serial_number_source: macAddress ? 'mac_suffix_inference' : null,
      ump_device_id: inferUmpDeviceId(serialNumber),
      senderIp: discovered.ip,
      senderPort: port,
      umpPort: UMP_PORT,
      switchId,
      switchName: name,
      configured: Boolean(configured),
      sync_detail: {
        discovery_response_hex: message.toString('hex'),
        detail_request_01_hex: sendSyncRequest(discovered.ip, 0x01, 0x00).toString('hex'),
      },
    });

    log?.info(
      `Discovery response from ${discovered.ip} ` +
      `(protocol_id=${discovered.protocol_id}, ${message.length} bytes)`
    );
    scanQuietFinish?.();
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
    scanAndWait,
  };
}

module.exports = {
  DISCOVERY_PORT,
  DISCOVERY_INTERVAL_MS,
  buildDiscoveryRequest,
  parseDiscoveryResponse,
  decodeSyncPacket,
  lookupMacAddress,
  inferSerialNumber,
  createDiscoveryScanner,
};
