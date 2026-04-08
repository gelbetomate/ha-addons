'use strict';

/**
 * u::Lux Message Protocol (UMP) telegram + message decoder.
 *
 * Reference: https://www.u-lux.com/fileadmin/user_upload/Downloads/PDF/Technische_Downloads/en/uLux_Switch_UMP_en.pdf
 *
 * Wire format (little-endian):
 *
 *   Telegram header (16 bytes):
 *     Bytes  0-1  : TotalLength (UInt16LE) — total size of telegram incl. header
 *     Bytes  2-3  : ProtocolVersion / reserved
 *     Bytes  4-9  : DeviceAddress (6-byte MAC of sender)
 *     Bytes 10-11 : PacketID (UInt16LE) — incrementing sequence counter
 *     Bytes 12-15 : Reserved
 *
 *   Then one or more messages, each:
 *     Byte  0     : MessageLength — total length of this message including this byte
 *     Byte  1     : MessageID
 *     Bytes 2-3   : ActorID (UInt16LE)
 *     Bytes 4+    : Payload (varies by MessageID)
 */

const { MessageIds, MessageIdNames } = require('./messageIds');

const TELEGRAM_HEADER_SIZE = 16;
const MIN_TELEGRAM_SIZE    = TELEGRAM_HEADER_SIZE + 2; // header + at least length+id bytes

/**
 * Parse a raw UMP telegram buffer.
 *
 * @param {Buffer} buf
 * @returns {{
 *   valid: boolean,
 *   error?: string,
 *   totalLength?: number,
 *   deviceAddressHex?: string,
 *   packetId?: number,
 *   messages?: Array<{
 *     msgId: number,
 *     msgName: string|null,
 *     actorId: number,
 *     length: number,
 *     data: Buffer,          // full message bytes (incl. length+id+actorId)
 *     payload: Buffer,       // bytes after actorId (offset 4+)
 *   }>
 * }}
 */
function parseTelegram(buf) {
  if (!Buffer.isBuffer(buf)) {
    return { valid: false, error: 'Input is not a Buffer' };
  }

  if (buf.length < MIN_TELEGRAM_SIZE) {
    return { valid: false, error: `Telegram too short: ${buf.length} < ${MIN_TELEGRAM_SIZE} bytes` };
  }

  const totalLength = buf.readUInt16LE(0);
  const deviceAddrBytes = buf.slice(4, 10);
  const deviceAddressHex = (deviceAddrBytes.toString('hex').toUpperCase().match(/.{2}/g) || []).join(':');
  const packetId = buf.readUInt16LE(10);

  const messages = [];
  let offset = TELEGRAM_HEADER_SIZE;

  while (offset < buf.length) {
    if (offset + 2 > buf.length) break; // need at least length + id bytes

    const msgLength = buf.readUInt8(offset);
    if (msgLength < 2) break; // malformed — protect against infinite loop
    if (offset + msgLength > buf.length) break; // truncated message

    const msgId   = buf.readUInt8(offset + 1);
    const actorId = msgLength >= 4 ? buf.readUInt16LE(offset + 2) : 0;
    const data    = buf.slice(offset, offset + msgLength);
    const payload = msgLength > 4 ? buf.slice(offset + 4, offset + msgLength) : Buffer.alloc(0);

    messages.push({
      msgId,
      msgName: MessageIdNames[msgId] || null,
      actorId,
      length: msgLength,
      data,
      payload,
    });

    offset += msgLength;
  }

  return {
    valid: true,
    totalLength,
    deviceAddressHex,
    packetId,
    messages,
  };
}

/**
 * Return a human-readable summary of a parsed telegram for logging.
 * @param {object} telegram - Result of parseTelegram()
 * @returns {string}
 */
function telegramSummary(telegram) {
  if (!telegram.valid) return `[invalid: ${telegram.error}]`;
  const ids = telegram.messages.map((m) => {
    const name = m.msgName || `0x${m.msgId.toString(16).padStart(2, '0')}`;
    return `${name}(actor=0x${m.actorId.toString(16)})`;
  }).join(', ');
  return `device=${telegram.deviceAddressHex} packetId=${telegram.packetId} messages=[${ids}]`;
}

// Keep legacy exports so existing code that imports MESSAGE_IDS doesn't break.
// MessageIdNames is already the correct { id → name } map; expose it as MESSAGE_IDS.
const MESSAGE_IDS = MessageIdNames;

module.exports = { parseTelegram, telegramSummary, MESSAGE_IDS, MessageIds };
