'use strict';

const dgram = require('dgram');
const {
  CODECS,
  FRAME_DURATION_MS,
  codecInfo,
  createJitterBuffer,
  parseAudioDatagram,
} = require('./audioCodec');

const DEFAULT_AUDIO_PORT = 35000;

/**
 * Create the raw u::lux audio transport.
 *
 * The audio socket is deliberately separate from the UMP control socket. The
 * payload is kept opaque until the device-specific PCM/G.711 framing has been
 * confirmed; callers receive and send complete UDP datagrams.
 *
 * @param {object} opts
 * @param {string} opts.host - Bind address
 * @param {number} opts.port - Audio UDP port
 * @param {object[]} opts.switches - Configured switches
 * @param {Function} [opts.onPacket] - Audio packet callback
 * @param {Function} [opts.onFrame] - Normalized PCM frame callback
 * @param {number} [opts.jitterDepth=3] - Frames buffered before release
 * @param {object} opts.log - Logger
 * @returns {{ start: Function, stop: Function, send: Function }}
 */
function createAudioTransport({
  host = '0.0.0.0',
  port = DEFAULT_AUDIO_PORT,
  switches = [],
  onPacket,
  onFrame,
  jitterDepth = 3,
  log,
}) {
  const socket = dgram.createSocket('udp4');
  const jitterBuffers = new Map();
  const subscribers = new Map();

  socket.on('error', (err) => {
    log.error('Audio UDP socket error:', err.message);
  });

  socket.on('message', (data, rinfo) => {
    const matchedSwitch = resolveSwitch(switches, rinfo.address);
    log.debug(
      `Audio packet from ${rinfo.address}:${rinfo.port} ` +
      `(${data.length} bytes)`,
    );

    onPacket?.({
      raw: data,
      senderIp: rinfo.address,
      senderPort: rinfo.port,
      switch: matchedSwitch,
      timestamp: new Date().toISOString(),
    });

    if (!onFrame && subscribers.size === 0) return;
    try {
      const frame = parseAudioDatagram(data);
      if (frame.sequence === null) {
        deliverFrame({ ...frame, senderIp: rinfo.address, switch: matchedSwitch });
        return;
      }
      const key = matchedSwitch.switch_id || rinfo.address;
      let jitter = jitterBuffers.get(key);
      if (!jitter) {
        jitter = createJitterBuffer({
          depth: jitterDepth,
          onFrame: (released) => deliverFrame({
            ...released,
            senderIp: rinfo.address,
            switch: matchedSwitch,
          }),
        });
        jitterBuffers.set(key, jitter);
      }
      jitter.push(frame);
    } catch (err) {
      log.warning(`Invalid audio packet from ${rinfo.address}: ${err.message}`);
    }
  });

  function send(remoteHost, data, remotePort = port) {
    if (!remoteHost || !Buffer.isBuffer(data)) {
      throw new TypeError('Audio send requires a remote host and Buffer payload');
    }

    socket.send(data, 0, data.length, remotePort, remoteHost, (err) => {
      if (err) {
        log.error(`Audio UDP send error to ${remoteHost}:${remotePort}: ${err.message}`);
      } else {
        log.debug(`Audio UDP sent ${data.length} bytes to ${remoteHost}:${remotePort}`);
      }
    });
  }

  function deliverFrame(frame) {
    onFrame?.(frame);
    const key = frame.switch.switch_id || frame.senderIp;
    for (const listener of subscribers.get(key) || []) listener(frame);
  }

  function subscribe(switchKey, listener) {
    const key = String(switchKey);
    const listeners = subscribers.get(key) || new Set();
    listeners.add(listener);
    subscribers.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) subscribers.delete(key);
    };
  }

  return {
    start() {
      socket.bind(port, host);
    },
    stop() {
      for (const jitter of jitterBuffers.values()) jitter.stop();
      jitterBuffers.clear();
      subscribers.clear();
      socket.close();
    },
    send,
    subscribe,
    createSender({ remoteHost, remotePort = port, codec = CODECS.PCM_16K }) {
      return createPcmSender({ send, remoteHost, remotePort, codec, log });
    },
  };
}

function createPcmSender({ send, remoteHost, remotePort, codec, log }) {
  const info = codecInfo(codec);
  if (!info || codec === CODECS.G711_ALAW) {
    throw new Error('Outbound sender currently supports PCM 16-bit codecs only');
  }

  let sequence = 0;
  let pending = Buffer.alloc(0);
  let timer = null;

  function flush() {
    if (pending.length < info.payloadBytes) return;
    const payload = pending.subarray(0, info.payloadBytes);
    pending = pending.subarray(info.payloadBytes);
    const packet = Buffer.alloc(4 + payload.length);
    packet.writeUInt16BE(sequence, 0);
    packet.writeUInt8(codec, 2);
    packet.writeUInt8(0, 3);
    payload.copy(packet, 4);
    sequence = (sequence + 1) & 0xFFFF;
    send(remoteHost, packet, remotePort);
  }

  return {
    push(pcm) {
      if (!Buffer.isBuffer(pcm)) throw new TypeError('PCM frame must be a Buffer');
      pending = Buffer.concat([pending, pcm]);
    },
    start() {
      if (!timer) timer = setInterval(flush, FRAME_DURATION_MS);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      pending = Buffer.alloc(0);
      log.debug(`Stopped outbound audio stream to ${remoteHost}:${remotePort}`);
    },
  };
}

function resolveSwitch(switches, senderIp) {
  return switches.find((sw) => sw.ip === senderIp) || {
    name: 'unknown',
    switch_id: null,
    ip: senderIp,
    port: null,
  };
}

module.exports = { createAudioTransport, DEFAULT_AUDIO_PORT };
