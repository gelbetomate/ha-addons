'use strict';

/**
 * Handler for ID-Event (MessageID=0x51) messages.
 *
 * Message layout (6 bytes):
 *   Byte 0    : MessageLength = 0x06
 *   Byte 1    : MessageID = 0x51
 *   Bytes 2-3 : ActorID (UInt16LE)
 *   Byte 4    : KeyState bitfield
 *                 bit 0 → Key 1 (1=pressed, 0=released)
 *                 bit 1 → Key 2
 *                 bit 2 → Key 3
 *                 bit 3 → Key 4
 *                 bits 4-7: reserved
 *   Byte 5    : Reserved
 *
 * Two event types are emitted to Home Assistant:
 *
 *   ulux_event  — snapshot of current key state (fired on every ID-Event)
 *   ulux_key    — edge event per key that changed (fired only after first packet
 *                 for a given context so restarts don't produce spurious presses)
 */

const NUM_KEYS = 4;

/**
 * In-memory map tracking the last known KeyState per sender context.
 * Key:   "<senderIp>:<senderPort>:<actorId>"
 * Value: number (0–15) — last observed KeyState
 *
 * A value of -1 means "first packet; don't emit edges yet".
 * @type {Map<string, number>}
 */
const _keyStateCache = new Map();

/** TTL for cache entries (30 minutes idle = stale). */
const CACHE_TTL_MS = 30 * 60 * 1000;

/** Map<cacheKey, timestamp of last access> for TTL eviction. */
const _cacheLastSeen = new Map();

function cacheKey(senderIp, senderPort, actorId) {
  return `${senderIp}:${senderPort}:${actorId}`;
}

/**
 * Evict cache entries that have not been updated for CACHE_TTL_MS.
 * Called lazily on each ID-Event so memory stays bounded without a timer.
 */
function evictStaleEntries() {
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const [key, ts] of _cacheLastSeen) {
    if (ts < cutoff) {
      _keyStateCache.delete(key);
      _cacheLastSeen.delete(key);
    }
  }
}

/**
 * Derive the list of key numbers (1–4) that are currently pressed.
 * @param {number} keyState
 * @returns {number[]}
 */
function keysDown(keyState) {
  const down = [];
  for (let i = 0; i < NUM_KEYS; i++) {
    if (keyState & (1 << i)) down.push(i + 1);
  }
  return down;
}

/**
 * @param {object} msg      - Parsed message object from parseTelegram()
 * @param {object} ctx      - Packet context {senderIp, senderPort, switch, timestamp, ...}
 * @param {object} services - {config, haClient, mqttClient, udpSend, log}
 */
function handleEvent(msg, ctx, { config, haClient, mqttClient, log }) {
  const { senderIp, senderPort, switch: sw, timestamp } = ctx;

  // KeyState is at offset 4 of the raw message data
  const keyState = msg.data.length >= 5 ? msg.data.readUInt8(4) & 0x0F : 0;
  const actorId  = msg.actorId;

  evictStaleEntries();

  const key = cacheKey(senderIp, senderPort, actorId);
  const prevState = _keyStateCache.get(key);        // undefined = first packet
  const isFirstPacket = prevState === undefined;

  // Update cache
  _keyStateCache.set(key, keyState);
  _cacheLastSeen.set(key, Date.now());

  log.info(
    `ID-Event from ${senderIp}:${senderPort} switch="${sw.name}"` +
    ` actor=0x${actorId.toString(16)} keyState=0x${keyState.toString(16)}` +
    ` keys_down=[${keysDown(keyState).join(',')}]`
  );

  // ── Snapshot event (always) ────────────────────────────────────────────────
  const snapshotPayload = {
    switch_id:     sw.switch_id,
    switch_name:   sw.name,
    ip:            senderIp,
    actor_id:      actorId,
    key_state_raw: keyState,
    keys_down:     keysDown(keyState),
    timestamp,
  };

  if (haClient && config.mode.ha_events) {
    haClient.fireEvent('ulux_event', snapshotPayload).catch((err) =>
      log.error('Failed to fire HA event ulux_event (key):', err.message)
    );
  }

  if (mqttClient && config.mode.mqtt) {
    const topic = `${config.mqtt.base_topic}/${sw.switch_id || senderIp}/event/key`;
    mqttClient.publish(topic, JSON.stringify(snapshotPayload));
  }

  // ── Edge events (only after first packet for this context) ─────────────────
  if (isFirstPacket) {
    log.debug(`First ID-Event for context ${key} — skipping edge events`);
    return;
  }

  const changed = (prevState ^ keyState) & 0x0F;
  if (changed === 0) return; // no key state change

  for (let i = 0; i < NUM_KEYS; i++) {
    const bit = 1 << i;
    if (!(changed & bit)) continue;

    const keyNum = i + 1;
    const action = (keyState & bit) ? 'pressed' : 'released';

    const edgePayload = {
      switch_id:         sw.switch_id,
      switch_name:       sw.name,
      ip:                senderIp,
      actor_id:          actorId,
      key:               keyNum,
      action,
      key_state_raw:     keyState,
      prev_key_state_raw: prevState,
      timestamp,
    };

    log.info(`Key ${keyNum} ${action} on switch "${sw.name}" (${senderIp})`);

    if (haClient && config.mode.ha_events) {
      haClient.fireEvent('ulux_key', edgePayload).catch((err) =>
        log.error(`Failed to fire HA event ulux_key (key${keyNum}):`, err.message)
      );
    }

    if (mqttClient && config.mode.mqtt) {
      const topic = `${config.mqtt.base_topic}/${sw.switch_id || senderIp}/event/key_edge`;
      mqttClient.publish(topic, JSON.stringify(edgePayload));
    }
  }
}

module.exports = handleEvent;
