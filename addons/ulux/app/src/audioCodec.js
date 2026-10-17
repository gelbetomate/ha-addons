'use strict';

const CODECS = Object.freeze({
  PCM_16K: 0x01,
  PCM_8K: 0x02,
  G711_ALAW: 0x03,
});

const FRAME_DURATION_MS = 20;

function codecInfo(codec) {
  switch (codec) {
    case CODECS.PCM_16K:
      return { codec, sampleRate: 16000, bytesPerSample: 2, payloadBytes: 640 };
    case CODECS.PCM_8K:
      return { codec, sampleRate: 8000, bytesPerSample: 2, payloadBytes: 320 };
    case CODECS.G711_ALAW:
      return { codec, sampleRate: 8000, bytesPerSample: 1, payloadBytes: 160 };
    default:
      return null;
  }
}

/**
 * Decode one u::lux audio UDP datagram into a normalized PCM frame.
 * Supports the optional network-order 4-byte header and raw payload mode.
 */
function parseAudioDatagram(data) {
  if (!Buffer.isBuffer(data)) throw new TypeError('Audio datagram must be a Buffer');

  let codec;
  let sequence = null;
  let payload = data;
  if (data.length >= 4) {
    const candidate = codecInfo(data.readUInt8(2));
    if (candidate && data.readUInt8(3) === 0 && data.length === candidate.payloadBytes + 4) {
      sequence = data.readUInt16BE(0);
      codec = candidate.codec;
      payload = data.subarray(4);
    }
  }

  if (codec === undefined) {
    if (data.length === 640) codec = CODECS.PCM_16K;
    else if (data.length === 320) codec = CODECS.PCM_8K;
    else if (data.length === 160) codec = CODECS.G711_ALAW;
    else throw new Error(`Unsupported audio datagram length: ${data.length}`);
  }

  const info = codecInfo(codec);
  const pcm = codec === CODECS.G711_ALAW ? decodeALaw(payload) : Buffer.from(payload);
  return {
    sequence,
    codec,
    sampleRate: info.sampleRate,
    channels: 1,
    width: 2,
    pcm,
    durationMs: FRAME_DURATION_MS,
  };
}

function decodeALaw(data) {
  const pcm = Buffer.alloc(data.length * 2);
  for (let index = 0; index < data.length; index += 1) {
    pcm.writeInt16LE(decodeALawSample(data[index]), index * 2);
  }
  return pcm;
}

function decodeALawSample(value) {
  let sample = value ^ 0x55;
  let magnitude = (sample & 0x0F) << 4;
  const exponent = (sample & 0x70) >> 4;
  if (exponent === 0) magnitude += 8;
  else {
    magnitude += 0x108;
    magnitude <<= exponent - 1;
  }
  return (sample & 0x80) ? magnitude : -magnitude;
}

function createJitterBuffer({ depth = 3, onFrame, frameDurationMs = FRAME_DURATION_MS }) {
  const frames = new Map();
  let expected = null;
  let timer = null;
  let lastFrame = null;

  function start() {
    if (!timer) timer = setInterval(flush, frameDurationMs);
  }

  function push(frame) {
    if (frame.sequence === null) {
      onFrame(frame);
      return;
    }
    frames.set(frame.sequence, frame);
    if (expected === null && frames.size >= depth) {
      expected = lowestSequence(frames.keys());
      start();
    }
  }

  function flush() {
    if (expected === null) return;
    const frame = frames.get(expected);
    frames.delete(expected);
    expected = (expected + 1) & 0xFFFF;
    if (frame) {
      lastFrame = frame;
      onFrame(frame);
    } else if (lastFrame) {
      onFrame({ ...lastFrame, pcm: Buffer.alloc(lastFrame.pcm.length), missing: true });
    }
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    frames.clear();
    expected = null;
    lastFrame = null;
  }

  return { push, start, stop };
}

function lowestSequence(values) {
  return [...values].sort((left, right) => left - right)[0];
}

module.exports = {
  CODECS,
  FRAME_DURATION_MS,
  codecInfo,
  parseAudioDatagram,
  decodeALaw,
  createJitterBuffer,
};
