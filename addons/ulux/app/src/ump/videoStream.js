'use strict';

const fs = require('fs/promises');
const path = require('path');
const Jimp = require('jimp');
const {
  buildVideoStartMessage,
  buildTelegram,
  buildVideoStreamTelegram,
} = require('./builder');

const DEFAULT_WIDTH = 86;
const DEFAULT_HEIGHT = 90;
const DEFAULT_LINES_PER_PACKET = 5;
const DEFAULT_INTER_PACKET_DELAY_MS = 5;

async function streamImageToSwitch({
  source,
  remoteHost,
  remotePort,
  udpSend,
  log,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  linesPerPacket = DEFAULT_LINES_PER_PACKET,
  interPacketDelayMs = DEFAULT_INTER_PACKET_DELAY_MS,
  sequenceId,
}) {
  if (!remoteHost || typeof udpSend !== 'function') {
    throw new Error('streamImageToSwitch requires remoteHost and udpSend');
  }

  const imageData = await resolveImageBuffer(source);
  const image = await Jimp.read(imageData);
  image.resize(width, height, Jimp.RESIZE_BILINEAR);

  const seqId = Number.isInteger(sequenceId)
    ? sequenceId >>> 0
    : ((Date.now() >>> 0) & 0x7FFFFFFF);

  // Start stream session first so the switch can prepare its framebuffer.
  const startTelegram = buildTelegram(buildVideoStartMessage(seqId));
  udpSend(remoteHost, remotePort, startTelegram);

  const rgb565 = toRgb565LE(image, width, height);
  const bytesPerLine = width * 2;

  log.info(
    `Streaming image to ${remoteHost}:${remotePort} ` +
    `(sequenceId=${seqId}, ${width}x${height}, chunkLines=${linesPerPacket})`
  );

  for (let startLine = 0; startLine < height; startLine += linesPerPacket) {
    const lineCount = Math.min(linesPerPacket, height - startLine);
    const chunkStart = startLine * bytesPerLine;
    const chunkEnd = chunkStart + (lineCount * bytesPerLine);
    const chunk = rgb565.subarray(chunkStart, chunkEnd);

    const streamTelegram = buildVideoStreamTelegram({
      sequenceId: seqId,
      startLine,
      lineCount,
      videoData: chunk,
      acknowledge: false,
    });

    udpSend(remoteHost, remotePort, streamTelegram);

    if (interPacketDelayMs > 0) {
      // The switch display pipeline is slow; pace packets to avoid drops.
      await sleep(interPacketDelayMs);
    }
  }

  log.info(`Image stream finished for ${remoteHost}:${remotePort} (sequenceId=${seqId})`);
}

async function resolveImageBuffer(source) {
  if (!source) {
    throw new Error('Missing image source');
  }

  if (source.buffer && Buffer.isBuffer(source.buffer)) {
    return source.buffer;
  }

  if (source.base64 && typeof source.base64 === 'string') {
    const clean = source.base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    return Buffer.from(clean, 'base64');
  }

  if (source.url && typeof source.url === 'string') {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`Image download failed: HTTP ${response.status}`);
    }
    const arr = await response.arrayBuffer();
    return Buffer.from(arr);
  }

  if (source.path && typeof source.path === 'string') {
    const absPath = path.isAbsolute(source.path)
      ? source.path
      : path.resolve(source.path);
    return fs.readFile(absPath);
  }

  if (typeof source === 'string') {
    if (/^https?:\/\//i.test(source)) {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Image download failed: HTTP ${response.status}`);
      }
      const arr = await response.arrayBuffer();
      return Buffer.from(arr);
    }

    return fs.readFile(path.resolve(source));
  }

  throw new Error('Unsupported image source format');
}

function toRgb565LE(image, width, height) {
  const out = Buffer.alloc(width * height * 2);
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rgba = Jimp.intToRGBA(image.getPixelColor(x, y));
      const v565 = rgb888To565(rgba.r, rgba.g, rgba.b);
      out.writeUInt16LE(v565, offset);
      offset += 2;
    }
  }

  return out;
}

function rgb888To565(r, g, b) {
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  streamImageToSwitch,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_LINES_PER_PACKET,
  DEFAULT_INTER_PACKET_DELAY_MS,
};
