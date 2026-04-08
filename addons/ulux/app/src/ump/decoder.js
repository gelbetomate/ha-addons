'use strict';

/**
 * u::Lux Message Protocol (UMP) frame decoder.
 *
 * Reference: https://www.u-lux.com/fileadmin/user_upload/Downloads/PDF/Technische_Downloads/en/uLux_Switch_UMP_en.pdf
 *
 * Protocol overview (little-endian):
 *   Byte 0-1 : Descriptor / frame type (uint16 LE)
 *   Byte 2-3 : Message ID (uint16 LE)
 *   Byte 4-9 : Switch ID (6-byte hardware identifier, e.g. MAC)
 *   Byte 10+ : Payload (varies by message ID)
 *
 * NOTE: The exact byte layout is inferred from the UMP documentation and common
 * u::Lux integration examples. Update FRAME_OFFSETS once sample packet captures
 * are available to confirm the exact structure.
 */

const MIN_FRAME_SIZE = 10; // Minimum bytes needed to read header fields

const FRAME_OFFSETS = {
  DESCRIPTOR: 0, // uint16 LE
  MESSAGE_ID: 2, // uint16 LE
  SWITCH_ID: 4,  // 6 bytes
  PAYLOAD: 10,   // variable length
};

// Known UMP message IDs
// TODO: populate from UMP spec PDF once exact IDs are confirmed
const MESSAGE_IDS = {
  // 0x0001: 'ID-Event',       // Key / button event
  // 0x0002: 'ID-EditValue',   // Value edited on touch surface
  // 0x0003: 'ID-RealValue',   // Sensor / real value broadcast
  // ... add more as confirmed
};

/**
 * Decode a raw UMP datagram buffer.
 *
 * @param {Buffer} buf - Raw UDP payload
 * @returns {{ valid: boolean, descriptor?: number, msgId?: number, msgName?: string, switchIdHex?: string, payload?: Buffer, error?: string }}
 */
function decodeFrame(buf) {
  if (!Buffer.isBuffer(buf)) {
    return { valid: false, error: 'Input is not a Buffer' };
  }

  if (buf.length < MIN_FRAME_SIZE) {
    return {
      valid: false,
      error: `Frame too short: ${buf.length} < ${MIN_FRAME_SIZE} bytes`,
    };
  }

  const descriptor = buf.readUInt16LE(FRAME_OFFSETS.DESCRIPTOR);
  const msgId = buf.readUInt16LE(FRAME_OFFSETS.MESSAGE_ID);
  const switchIdBytes = buf.slice(FRAME_OFFSETS.SWITCH_ID, FRAME_OFFSETS.SWITCH_ID + 6);
  const switchIdHex = (switchIdBytes.toString('hex').toUpperCase().match(/.{2}/g) || []).join(':');
  const payload = buf.slice(FRAME_OFFSETS.PAYLOAD);
  const msgName = MESSAGE_IDS[msgId] || null;

  return {
    valid: true,
    descriptor,
    msgId,
    msgName,
    switchIdHex,
    payload,
  };
}

/**
 * Return a human-readable summary of a decoded frame for logging.
 * @param {object} frame - Result of decodeFrame()
 * @returns {string}
 */
function frameSummary(frame) {
  if (!frame.valid) return `[invalid: ${frame.error}]`;
  const idLabel = frame.msgName ? `${frame.msgName} (0x${frame.msgId.toString(16).padStart(4, '0')})` : `0x${frame.msgId.toString(16).padStart(4, '0')}`;
  return `descriptor=0x${frame.descriptor.toString(16).padStart(4, '0')} msgId=${idLabel} switchId=${frame.switchIdHex} payloadBytes=${frame.payload.length}`;
}

module.exports = { decodeFrame, frameSummary, MESSAGE_IDS, FRAME_OFFSETS };
