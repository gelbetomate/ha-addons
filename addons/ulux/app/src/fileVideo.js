'use strict';

const { spawn } = require('child_process');
const path = require('path');
const { CODECS } = require('./audioCodec');
const {
  buildAudioPlayRemoteMessage,
  buildAudioStopMessage,
  buildTelegramForDevice,
  buildVideoStopMessage,
} = require('./ump/builder');

const DEFAULT_WIDTH = 176;
const DEFAULT_HEIGHT = 184;

function createVideoStreamer({ streamManager, udpSend, log, streamConfig, audioTransport, audioPort = 35000 }) {
  const active = new Map();

  return {
    start(switchId, options) {
      this.stop(switchId);
      const state = { stop: false, process: null };
      active.set(String(switchId), state);
      runVideo({
        switchId,
        state,
        streamManager,
        udpSend,
        log,
        streamConfig,
        audioTransport,
        audioPort,
        ...options,
      })
        .catch((err) => {
          if (!state.stop) log.error(`File video failed for ${switchId}: ${err.message}`);
        })
        .finally(() => {
          if (active.get(String(switchId)) === state) active.delete(String(switchId));
        });
    },

    stop(switchId) {
      const state = active.get(String(switchId));
      if (!state) return;
      state.stop = true;
      state.process?.kill('SIGTERM');
      active.delete(String(switchId));
    },
  };
}

async function runVideo({
  switchId,
  state,
  streamManager,
  udpSend,
  log,
  streamConfig,
  filePath,
  source,
  remoteHost,
  remotePort,
  deviceId,
  frameVersion,
  actorId,
  loop = true,
  audio = true,
}) {
  const width = streamConfig.width || DEFAULT_WIDTH;
  const height = streamConfig.height || DEFAULT_HEIGHT;
  const input = filePath || source?.path || source?.url || source;
  if (!input || typeof input !== 'string') {
    throw new Error('Video source must be a file path or URL');
  }

  let sequenceId = (Date.now() >>> 0) & 0x7FFFFFFF;
  let videoSessionStarted = false;

  while (!state.stop) {
    const isFile = !/^[a-z][a-z\d+\-.]*:\/\//i.test(input);
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-nostdin',
      ...(isFile ? ['-re'] : []),
      ...(isFile && loop ? ['-stream_loop', '-1'] : []),
      '-i', input,
      '-map', '0:v:0',
      '-vf', `scale=${width}:${height}`,
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-q:v', '5',
      'pipe:1',
      ...(audio && audioTransport ? [
        '-map', '0:a?',
        '-vn',
        '-f', 's16le',
        '-ar', '22050',
        '-ac', '1',
        'pipe:3',
      ] : []),
    ], {
      windowsHide: true,
      stdio: audio && audioTransport
        ? ['ignore', 'pipe', 'pipe', 'pipe']
        : ['ignore', 'pipe', 'pipe'],
    });
    state.process = ffmpeg;
    const audioSender = audio && audioTransport
      ? audioTransport.createSender({
        remoteHost,
        remotePort: audioPort,
        codec: CODECS.PCM_22K,
        includeHeader: false,
      })
      : null;
    if (audioSender) {
      const control = buildTelegramForDevice(
        deviceId,
        frameVersion,
        buildAudioPlayRemoteMessage({
          sequenceId: 3,
          bytesPerFrame: 882,
          delayBetweenFrames: 20000,
        }),
      );
      udpSend(remoteHost, remotePort, control);
    }
    audioSender?.start();
    ffmpeg.stdio[3]?.on('data', (chunk) => audioSender?.push(chunk));

    let buffer = Buffer.alloc(0);
    for await (const chunk of ffmpeg.stdout) {
      if (state.stop) break;
      buffer = Buffer.concat([buffer, chunk]);
      let end;
      while ((end = findJpegEnd(buffer)) >= 0) {
        const frame = buffer.subarray(0, end + 2);
        buffer = buffer.subarray(end + 2);
        await streamManager.streamImageToSwitch(switchId, {
          source: { buffer: frame },
          remoteHost,
          remotePort,
          deviceId,
          frameVersion,
          actorId,
          width,
          height,
          sequenceId,
          udpSend,
          log,
          linesPerPacket: streamConfig.lines_per_packet || 4,
          interPacketDelayMs: streamConfig.inter_packet_delay_ms ?? 5,
          waitForAck: false,
          skipSessionReset: videoSessionStarted,
        });
        videoSessionStarted = true;
        if (state.stop) break;
      }
    }

    audioSender?.stop();
    if (audioSender) {
      udpSend(
        remoteHost,
        remotePort,
        buildTelegramForDevice(deviceId, frameVersion, buildAudioStopMessage()),
      );
    }
    state.process = null;
    if (!state.stop && ffmpeg.exitCode === null) {
      await new Promise((resolve) => ffmpeg.once('close', resolve));
    }
    if (!loop) break;
  }

  if (videoSessionStarted) {
    udpSend(
      remoteHost,
      remotePort,
      buildTelegramForDevice(deviceId, frameVersion, buildVideoStopMessage(sequenceId)),
    );
  }
}

function findJpegEnd(buffer) {
  const start = buffer.indexOf(Buffer.from([0xFF, 0xD8]));
  if (start < 0) return -1;
  const end = buffer.indexOf(Buffer.from([0xFF, 0xD9]), start + 2);
  return end;
}

function defaultVideoPath() {
  return path.join(__dirname, '..', 'assets', 'centaur_1.mpg');
}

module.exports = {
  createVideoStreamer,
  createFileVideoStreamer: createVideoStreamer,
  defaultVideoPath,
};
