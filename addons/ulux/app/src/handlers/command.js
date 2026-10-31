'use strict';

const { mqttDeviceKey } = require('../mqtt/topics');

const { streamImageToSwitch } = require('../ump/videoStream');
const {
  buildTelegramForDevice,
  buildPageIndexMessage,
  buildActivateMessage,
  buildLedMessage,
  buildLedColorValue,
  sendLedMessagesPaced,
  buildTextMessage,
  buildEditValueMessage,
  buildRealValueMessage,
  buildValueMessage,
  buildAudioPlayLocalMessage,
  buildAudioStopMessage,
  buildAudioVolumeMessage,
} = require('../ump/builder');

const DISPLAY_IMAGE_COMMAND = 'display/image';

/**
 * Handle MQTT command payloads and dispatch UMP actions.
 *
 * Supported command topic suffixes:
 *   <base_topic>/<switch_id>/cmd/display/image
 *   <base_topic>/<switch_id>/cmd/page
 *   <base_topic>/<switch_id>/cmd/activate
 *   <base_topic>/<switch_id>/cmd/led
 *   <base_topic>/<switch_id>/cmd/text
 *   <base_topic>/<switch_id>/cmd/value
 *   <base_topic>/<switch_id>/cmd/audio/play
 *   <base_topic>/<switch_id>/cmd/audio/stop
 *   <base_topic>/<switch_id>/cmd/audio/volume
 *   <base_topic>/<switch_id>/cmd/raw
 */
async function handleCommandMessage(cmd, { config, udpSend, discoveryRegistry, log }) {
  if (!cmd || !cmd.command) return;

  const sw = findSwitchTarget(cmd.switchId, config.switches, discoveryRegistry);
  if (!sw) {
    log.warning(`MQTT command "${cmd.command}" for unknown switch_id="${cmd.switchId}"`);
    return;
  }

  const remotePort = normalisePort(sw.port, config.listen_port);
  const deviceId = sw.ump_device_id || 0x5d;
  const frameVersion = sw.ump_frame_version || 0x0232;

  switch (cmd.command) {
    case DISPLAY_IMAGE_COMMAND: {
      const payload = normalisePayload(cmd.payload);
      const source = pickImageSource(payload);
      if (!source) {
        log.warning('display/image command missing image source (url, base64, or path)');
        return;
      }
      const streamConfig = config.stream || {};
      await streamImageToSwitch({
        source,
        remoteHost: sw.ip,
        remotePort,
        udpSend,
        log,
        width: coercePositiveInt(payload.width) || coercePositiveInt(streamConfig.width) || 86,
        height: coercePositiveInt(payload.height) || coercePositiveInt(streamConfig.height) || 90,
        actorId: coercePositiveInt(payload.actor_id) || coercePositiveInt(streamConfig.actor_id) || 23,
        linesPerPacket: coercePositiveInt(payload.lines_per_packet) || coercePositiveInt(streamConfig.lines_per_packet) || 5,
        interPacketDelayMs: coerceNonNegativeInt(payload.inter_packet_delay_ms)
          ?? coerceNonNegativeInt(streamConfig.inter_packet_delay_ms)
          ?? 5,
        sequenceId: coerceNonNegativeInt(payload.sequence_id),
      });
      break;
    }

    case 'page': {
      const pageIndex = typeof cmd.payload === 'object' && cmd.payload !== null
        ? Number(cmd.payload.page ?? cmd.payload.page_index ?? 0)
        : Number(cmd.payload ?? 0);
      const telegram = buildTelegramForDevice(
        deviceId,
        frameVersion,
        buildPageIndexMessage(pageIndex)
      );
      udpSend(sw.ip, remotePort, telegram);
      log.info(`MQTT: Sent PageIndex (${pageIndex}) to ${sw.ip}:${remotePort}`);
      break;
    }

    case 'activate': {
      let active = true;
      if (typeof cmd.payload === 'object' && cmd.payload !== null) {
        active = cmd.payload.active !== false && cmd.payload.activate !== false;
      } else if (typeof cmd.payload === 'string') {
        active = !['0', 'false', 'off', 'standby', 'deactivate'].includes(cmd.payload.toLowerCase().trim());
      } else if (typeof cmd.payload === 'boolean') {
        active = cmd.payload;
      }
      const telegram = buildTelegramForDevice(
        deviceId,
        frameVersion,
        buildActivateMessage({ activate: active, deactivate: !active })
      );
      udpSend(sw.ip, remotePort, telegram);
      log.info(`MQTT: Sent Activate (active=${active}) to ${sw.ip}:${remotePort}`);
      break;
    }

    case 'led': {
      const payload = normalisePayload(cmd.payload);
      const actorId = Number(payload.actor_id ?? 1);
      const leds = Array.isArray(payload.leds) ? payload.leds : [];
      await sendLedMessagesPaced({
        ip: sw.ip,
        port: remotePort,
        deviceId,
        frameVersion,
        actorId,
        leds,
        udpSend,
      });
      log.info(`MQTT: Sent ${leds.length} paced LED commands to ${sw.ip}:${remotePort} for actor ${actorId}`);
      break;
    }

    case 'text': {
      const payload = normalisePayload(cmd.payload);
      const actorId = Number(payload.actor_id ?? 1);
      const textId = Number(payload.text_id ?? 0);
      const text = String(payload.text ?? '');
      const color = payload.color || { r: 255, g: 255, b: 255 };
      const telegram = buildTelegramForDevice(
        deviceId,
        frameVersion,
        buildTextMessage(actorId, textId, text, {
          color,
          visible: payload.visible !== false,
          remove: Boolean(payload.remove),
        })
      );
      udpSend(sw.ip, remotePort, telegram);
      log.info(`MQTT: Sent Text command to ${sw.ip}:${remotePort} (actor=${actorId}, textId=${textId})`);
      break;
    }

    case 'value': {
      const payload = normalisePayload(cmd.payload);
      const actorId = Number(payload.actor_id ?? 1);
      let telegram;
      if (payload.edit_value !== undefined && payload.real_values !== undefined) {
        telegram = buildTelegramForDevice(
          deviceId,
          frameVersion,
          buildValueMessage(actorId, Number(payload.edit_value), payload.real_values)
        );
      } else if (payload.edit_value !== undefined) {
        telegram = buildTelegramForDevice(
          deviceId,
          frameVersion,
          buildEditValueMessage(actorId, Number(payload.edit_value))
        );
      } else if (payload.real_values !== undefined) {
        telegram = buildTelegramForDevice(
          deviceId,
          frameVersion,
          buildRealValueMessage(actorId, payload.real_values)
        );
      } else if (typeof payload.value === 'number') {
        telegram = buildTelegramForDevice(
          deviceId,
          frameVersion,
          buildEditValueMessage(actorId, payload.value)
        );
      }
      if (telegram) {
        udpSend(sw.ip, remotePort, telegram);
        log.info(`MQTT: Sent Value command to ${sw.ip}:${remotePort} for actor ${actorId}`);
      }
      break;
    }

    case 'audio/play': {
      const payload = normalisePayload(cmd.payload);
      const telegram = buildTelegramForDevice(
        deviceId,
        frameVersion,
        buildAudioPlayLocalMessage({
          soundIndex: Number(payload.sound_index ?? 1),
          volume: Number(payload.volume ?? 100),
          repeats: Number(payload.repeats ?? 0),
          delayBeforeRepeat: Number(payload.delay_before_repeat ?? 0),
          equalizer: Number(payload.equalizer ?? 0),
          alarm: Boolean(payload.alarm),
          incVolumeTime: Number(payload.inc_volume_time ?? 0),
        })
      );
      udpSend(sw.ip, remotePort, telegram);
      log.info(`MQTT: Sent AudioPlayLocal to ${sw.ip}:${remotePort}`);
      break;
    }

    case 'audio/stop': {
      const payload = normalisePayload(cmd.payload);
      const telegram = buildTelegramForDevice(
        deviceId,
        frameVersion,
        buildAudioStopMessage({
          stopNormal: payload.stop_normal !== false,
          stopAlarm: Boolean(payload.stop_alarm),
        })
      );
      udpSend(sw.ip, remotePort, telegram);
      log.info(`MQTT: Sent AudioStop to ${sw.ip}:${remotePort}`);
      break;
    }

    case 'audio/volume': {
      const volume = typeof cmd.payload === 'object' && cmd.payload !== null
        ? Number(cmd.payload.volume ?? 50)
        : Number(cmd.payload ?? 50);
      const telegram = buildTelegramForDevice(
        deviceId,
        frameVersion,
        buildAudioVolumeMessage(volume)
      );
      udpSend(sw.ip, remotePort, telegram);
      log.info(`MQTT: Sent AudioVolume (${volume}%) to ${sw.ip}:${remotePort}`);
      break;
    }

    case 'raw': {
      const payload = normalisePayload(cmd.payload);
      const hex = typeof payload === 'string' ? payload : (payload.hex || '');
      if (hex) {
        const buf = Buffer.from(hex.replace(/[^0-9a-fA-F]/g, ''), 'hex');
        if (buf.length > 0) {
          udpSend(sw.ip, remotePort, buf);
          log.info(`MQTT: Sent raw UMP telegram (${buf.length} bytes) to ${sw.ip}:${remotePort}`);
        }
      }
      break;
    }

    default:
      log.warning(`Unsupported MQTT command "${cmd.command}" on ${cmd.topic}`);
  }
}

function findSwitchTarget(switchId, configuredSwitches = [], discoveryRegistry = null) {
  if (!switchId) return null;
  const store = discoveryRegistry?.getStore?.();
  const fromStore = store?.get?.(switchId)
    || store?.findByIp?.(switchId)
    || store?.getAll?.().find((device) => mqttDeviceKey(device) === String(switchId));
  if (fromStore) {
    return {
      switch_id: fromStore.switch_id,
      name: fromStore.name,
      ip: fromStore.ip,
      port: fromStore.port || 34988,
      ump_device_id: fromStore.ump_device_id || 0x5d,
      ump_frame_version: fromStore.ump_frame_version || 0x0232,
    };
  }

  const wanted = String(switchId).toUpperCase();
  const fromConfig = (configuredSwitches || []).find(
    (sw) => String(sw.switch_id || '').toUpperCase() === wanted || sw.ip === switchId
  );
  if (fromConfig) {
    return {
      switch_id: fromConfig.switch_id,
      name: fromConfig.name || `u::lux ${fromConfig.switch_id}`,
      ip: fromConfig.ip,
      port: fromConfig.port || 34988,
      ump_device_id: 0x5d,
      ump_frame_version: 0x0232,
    };
  }

  return null;
}

function normalisePayload(payload) {
  if (payload && typeof payload === 'object') {
    return payload;
  }

  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Fall through
      }
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return { url: trimmed };
    }
    return { path: trimmed };
  }

  return {};
}

function pickImageSource(payload) {
  if (typeof payload.url === 'string' && payload.url.trim()) {
    return { url: payload.url.trim() };
  }

  if (typeof payload.base64 === 'string' && payload.base64.trim()) {
    return { base64: payload.base64.trim() };
  }

  if (typeof payload.path === 'string' && payload.path.trim()) {
    return { path: payload.path.trim() };
  }

  return null;
}

function normalisePort(switchPort, fallbackPort) {
  const p = Number(switchPort || fallbackPort || 34988);
  return Number.isInteger(p) && p > 0 && p <= 65535 ? p : 34988;
}

function coercePositiveInt(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function coerceNonNegativeInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

module.exports = { handleCommandMessage, DISPLAY_IMAGE_COMMAND, findSwitchTarget };
