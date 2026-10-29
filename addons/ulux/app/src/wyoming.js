'use strict';

const net = require('net');

const AUDIO_FORMAT = Object.freeze({ rate: 16000, width: 2, channels: 1 });

/**
 * Minimal Wyoming satellite endpoint for one configured u::lux device.
 *
 * Wyoming is JSONL plus optional binary data. The endpoint advertises the
 * u::lux microphone and speaker to Home Assistant and bridges audio events to
 * the existing u::lux UDP transport.
 */
function createWyomingServer({ config, audioTransport, assistSession, log }) {
  const server = net.createServer((socket) => {
    const client = createClient(socket);
    log.info(`Wyoming client connected from ${socket.remoteAddress}`);
    socket.on('close', () => client.close());
    socket.on('error', (err) => log.warning(`Wyoming client error: ${err.message}`));
  });

  function createClient(socket) {
    const switchId = config.wyoming_switch_id || config.switches[0]?.switch_id;
    const state = {
      buffer: Buffer.alloc(0),
      inputActive: false,
      outputSender: null,
      outputStarted: false,
      unsubscribe: null,
      assistUnsubscribe: null,
      idleTimer: null,
      closed: false,
    };

    const target = () => (config.switches || []).find((item) => item.switch_id === switchId)
      || audioTransportTarget(switchId);

    function writeEvent(type, data = {}, payload = null) {
      if (state.closed) return;
      const header = { type, data, version: '1.10.2' };
      if (payload?.length) header.payload_length = payload.length;
      socket.write(`${JSON.stringify(header)}\n`);
      if (payload?.length) socket.write(payload);
    }

    function handleEvent(event) {
      switch (event.type) {
        case 'describe':
          writeEvent('info', {
            satellite: {
              name: config.wyoming_name || `u::lux ${switchId || 'satellite'}`,
              supports_trigger: true,
            },
            mic: { name: 'u::lux microphone', mic_format: AUDIO_FORMAT },
            snd: { name: 'u::lux speaker', snd_format: AUDIO_FORMAT },
          });
          break;
        case 'run-pipeline':
          startInput();
          break;
        case 'audio-start':
          startOutput(event.data);
          break;
        case 'audio-chunk':
          if (state.outputSender && event.payload) state.outputSender.push(event.payload);
          break;
        case 'audio-stop':
          stopOutput();
          writeEvent('played');
          break;
        case 'pause-satellite':
          stopInput();
          break;
        default:
          break;
      }
    }

    function startInput() {
      if (state.inputActive || !audioTransport || !switchId) return;
      state.inputActive = true;
      state.unsubscribe = audioTransport.subscribe(switchId, (frame) => {
        if (!state.inputActive) return;
        clearTimeout(state.idleTimer);
        if (!state.outputStarted) {
          writeEvent('audio-start', {
            rate: frame.sampleRate,
            width: frame.width,
            channels: frame.channels,
          });
          state.outputStarted = true;
        }
        writeEvent('audio-chunk', { rate: frame.sampleRate, width: frame.width, channels: frame.channels }, frame.pcm);
        state.idleTimer = setTimeout(() => stopInput(), 120);
      });
      writeEvent('streaming-started');
    }

    function stopInput() {
      if (!state.inputActive) return;
      state.inputActive = false;
      state.unsubscribe?.();
      state.unsubscribe = null;
      clearTimeout(state.idleTimer);
      state.idleTimer = null;
      if (state.outputStarted) writeEvent('audio-stop');
      state.outputStarted = false;
      writeEvent('streaming-stopped');
    }

    function startOutput(format = {}) {
      if (state.outputSender || !switchId) return;
      const device = target();
      if (!device?.ip) return;
      state.outputSender = audioTransport.createSender({
        remoteHost: device.ip,
        remotePort: config.audio_port || 35000,
      });
      state.outputSender.start();
      log.info(`Wyoming audio output started for ${switchId} (${format.rate || AUDIO_FORMAT.rate} Hz)`);
    }

    function stopOutput() {
      state.outputSender?.stop();
      state.outputSender = null;
    }

    function feed(data) {
      state.buffer = Buffer.concat([state.buffer, data]);
      while (true) {
        const newline = state.buffer.indexOf(0x0A);
        if (newline < 0) return;
        let header;
        try {
          header = JSON.parse(state.buffer.subarray(0, newline).toString('utf8'));
        } catch (err) {
          log.warning(`Invalid Wyoming header: ${err.message}`);
          state.buffer = state.buffer.subarray(newline + 1);
          continue;
        }
        const dataLength = header.data_length || 0;
        const payloadLength = header.payload_length || 0;
        const totalLength = newline + 1 + dataLength + payloadLength;
        if (state.buffer.length < totalLength) return;
        const dataStart = newline + 1;
        const eventData = { ...(header.data || {}) };
        if (dataLength) {
          Object.assign(eventData, JSON.parse(state.buffer.subarray(dataStart, dataStart + dataLength).toString('utf8')));
        }
        const payloadStart = dataStart + dataLength;
        handleEvent({
          type: header.type,
          data: eventData,
          payload: payloadLength ? state.buffer.subarray(payloadStart, payloadStart + payloadLength) : null,
        });
        state.buffer = state.buffer.subarray(totalLength);
      }
    }

    function close() {
      if (state.closed) return;
      state.closed = true;
      stopInput();
      stopOutput();
      state.assistUnsubscribe?.();
    }

    socket.on('data', feed);
    state.assistUnsubscribe = assistSession?.subscribe((sessionState) => {
      if (sessionState.switch_id !== switchId || state.closed) return;
      if (sessionState.state === 'started') {
        writeEvent('run-pipeline', { start_stage: 'stt', end_stage: 'tts' });
        startInput();
      } else if (sessionState.state === 'stopped') {
        stopInput();
      }
    });
    return { close };
  }

  function audioTransportTarget(switchId) {
    return (config.switches || []).find((item) => item.switch_id === switchId);
  }

  return {
    start() {
      server.listen(config.wyoming_port || 10700, config.listen_host || '0.0.0.0');
    },
    stop() {
      server.close();
    },
  };
}

module.exports = { createWyomingServer, AUDIO_FORMAT };
