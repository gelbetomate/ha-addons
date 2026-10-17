'use strict';

const { buildAudioControlMessage } = require('./ump/builder');

/**
 * Manage push-to-talk microphone sessions for u::lux switches.
 *
 * The session manager owns only the UMP control transition. Audio payloads are
 * delivered independently through the audio UDP/WebSocket transport.
 */
function createAssistSessionManager({ config, udpSend, haClient, log }) {
  const sessions = new Map();
  const listeners = new Set();
  const keyNumber = config.assist_ptt_key || 1;

  function handleKey(edge) {
    if (edge.key !== keyNumber) return;
    if (edge.action === 'pressed') return start(edge);
    if (edge.action === 'released') return stop(edge);
  }

  function start(edge) {
    const switchId = edge.switch_id || edge.ip;
    if (sessions.has(switchId)) return;
    const targetIp = String(config.audio_target_ip || '').trim();
    if (!targetIp) {
      log.warning(`Cannot start u::lux Assist session for ${switchId}: audio_target_ip is not configured`);
      return;
    }

    sendControl(edge, targetIp, true);
    sessions.set(switchId, { startedAt: new Date().toISOString(), targetIp });
    for (const listener of listeners) listener({ state: 'started', switch_id: switchId });
    fireSessionEvent('started', edge, targetIp);
    log.info(`Started u::lux push-to-talk session for ${switchId}`);
  }

  function stop(edge) {
    const switchId = edge.switch_id || edge.ip;
    const session = sessions.get(switchId);
    if (!session) return;
    sendControl(edge, session.targetIp, false);
    sessions.delete(switchId);
    for (const listener of listeners) listener({ state: 'stopped', switch_id: switchId });
    fireSessionEvent('stopped', edge, session.targetIp);
    log.info(`Stopped u::lux push-to-talk session for ${switchId}`);
  }

  function sendControl(edge, targetIp, micOn) {
    const message = buildAudioControlMessage({
      targetIp,
      targetPort: config.audio_port || 35000,
      micOn,
      micGain: config.assist_mic_gain ?? 80,
      speakerOn: true,
      speakerVolume: config.assist_speaker_volume ?? 70,
    });
    udpSend(edge.ip, config.audio_control_port || 35004, message);
  }

  function fireSessionEvent(state, edge, targetIp) {
    if (!haClient || !config.mode.ha_events) return;
    haClient.fireEvent('ulux_assist_session', {
      state,
      switch_id: edge.switch_id,
      switch_name: edge.switch_name,
      key: edge.key,
      target_ip: targetIp,
      timestamp: new Date().toISOString(),
    }).catch((err) => log.error('Failed to fire ulux_assist_session:', err.message));
  }

  function stopAll() {
    for (const [switchId, session] of sessions) {
      log.info(`Stopping u::lux Assist session during shutdown for ${switchId}`);
      sessions.delete(switchId);
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { handleKey, stopAll, subscribe };
}

module.exports = { createAssistSessionManager };
