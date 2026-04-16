'use strict';

/**
 * UMP outbound message builders.
 *
 * All messages are little-endian per the UMP spec.
 *
 * Telegram structure:
 *   16-byte header:
 *     Bytes  0-1  : TotalLength (UInt16LE) — header + all messages
 *     Bytes  2-3  : ProtocolVersion (0x0000)
 *     Bytes  4-9  : Source DeviceAddress (6 bytes, 0x000000000000 for our responses)
 *     Bytes 10-11 : PacketID (UInt16LE, incrementing)
 *     Bytes 12-15 : Reserved (0x00000000)
 *   Followed by one or more messages.
 *
 * Message structure:
 *   Byte  0    : MessageLength — total size of this message including this byte
 *   Byte  1    : MessageID
 *   Bytes 2-3  : ActorID (UInt16LE, 0x0000 for global messages)
 *   Bytes 4+   : Payload
 */

const { MessageIds } = require('./messageIds');

const FRAME_ID_MESSAGE = 0x8601;
const FRAME_ID_VIDEO = 0x8602;
const FRAME_VERSION = 0x0201;

// Per-module outbound packet counter; wraps at 0xFFFF.
let _packetId = 0;
function nextPacketId() {
  _packetId = (_packetId + 1) & 0xFFFF;
  return _packetId;
}

// ─── Message builders ───────────────────────────────────────────────────────

/**
 * Build an ID-Control message (MessageID=0x21, 8 bytes).
 *
 * ControlFlags is a 32-bit LE value that influences the switch behaviour.
 * Default 0x00000000 is safe — send it whenever InitRequest is set.
 *
 * @param {number} [controlFlags=0] - 32-bit control flags (from add-on config)
 * @returns {Buffer} 8-byte message buffer
 */
function buildIdControlMessage(controlFlags = 0) {
  const buf = Buffer.alloc(8, 0);
  buf.writeUInt8(0x08, 0);                         // MessageLength
  buf.writeUInt8(MessageIds.IdControl, 1);         // MessageID = 0x21
  buf.writeUInt16LE(0x0000, 2);                    // ActorID
  buf.writeUInt32LE(controlFlags >>> 0, 4);        // ControlFlags (UInt32LE)
  return buf;
}

/**
 * Build a DateTime message (MessageID=0x2F, 12 bytes).
 *
 * Payload layout (offsets relative to message start):
 *   Bytes 2-3  : ActorID (0x0000)
 *   Bytes 4-5  : Year (UInt16LE)
 *   Byte  6    : Month (1–12)
 *   Byte  7    : Day   (1–31)
 *   Byte  8    : Hour  (0–23)
 *   Byte  9    : Minute (0–59)
 *   Byte  10   : Second (0–59)
 *   Byte  11   : DayOfWeek (1=Monday … 7=Sunday, ISO 8601)
 *
 * @param {Date} [date=new Date()] - Date/time to encode (defaults to now)
 * @returns {Buffer} 12-byte message buffer
 */
function buildDateTimeMessage(date) {
  const d = date instanceof Date ? date : new Date();
  const buf = Buffer.alloc(12, 0);
  buf.writeUInt8(0x0C, 0);                          // MessageLength
  buf.writeUInt8(MessageIds.DateTime, 1);           // MessageID = 0x2F
  buf.writeUInt16LE(0x0000, 2);                     // ActorID
  buf.writeUInt16LE(d.getFullYear(), 4);            // Year
  buf.writeUInt8(d.getMonth() + 1, 6);              // Month (1-12)
  buf.writeUInt8(d.getDate(), 7);                   // Day
  buf.writeUInt8(d.getHours(), 8);                  // Hour
  buf.writeUInt8(d.getMinutes(), 9);                // Minute
  buf.writeUInt8(d.getSeconds(), 10);               // Second
  // ISO 8601: Mon=1 … Sun=7; JS getDay() returns Sun=0 … Sat=6
  const jsDay = d.getDay();
  buf.writeUInt8(jsDay === 0 ? 7 : jsDay, 11);      // DayOfWeek
  return buf;
}

/**
 * Build a VideoStart message (MessageID=0xA2, 12 bytes).
 *
 * Payload layout (8 bytes):
 *   Bytes 4-7   : Reserved (0)
 *   Bytes 8-11  : SequenceID (UInt32LE)
 *
 * @param {number} sequenceId - Stream sequence identifier
 * @returns {Buffer} 12-byte message buffer
 */
function buildVideoStartMessage(sequenceId) {
  const buf = Buffer.alloc(12, 0);
  buf.writeUInt8(0x0C, 0);                         // MessageLength
  buf.writeUInt8(MessageIds.VideoStart, 1);        // MessageID = 0xA2
  buf.writeUInt16LE(0x0000, 2);                    // ActorID
  buf.writeUInt32LE(0, 4);                         // Reserved
  buf.writeUInt32LE(sequenceId >>> 0, 8);          // SequenceID
  return buf;
}

// ─── Telegram builder ────────────────────────────────────────────────────────

/**
 * Wrap one or more message buffers inside a 16-byte UMP telegram header.
 *
 * @param {...Buffer} messageBuffers - One or more serialised message buffers
 * @returns {Buffer} Complete telegram ready to send over UDP
 */
function buildTelegram(...messageBuffers) {
  const messagesBuffer = Buffer.concat(messageBuffers);
  const totalLength = 16 + messagesBuffer.length;

  const header = Buffer.alloc(16, 0);
  header.writeUInt16LE(totalLength, 0);    // TotalLength
  // bytes 2-3: ProtocolVersion (0x0000 — already zeroed)
  // bytes 4-9: DeviceAddress (all zeros — our virtual sender address)
  header.writeUInt16LE(nextPacketId(), 10); // PacketID
  // bytes 12-15: Reserved (0x00000000 — already zeroed)

  return Buffer.concat([header, messagesBuffer]);
}

/**
 * Build a UMP video stream telegram (FrameID=0x8602).
 *
 * Frame layout (little-endian):
 *   16-byte frame header:
 *     0-1:  FrameID (0x8602)
 *     2-3:  FrameLength (header + stream payload)
 *     4-5:  FrameVersion (0x0201)
 *     6-7:  PacketID
 *     8-15: Project/Firmware/Switch/Design IDs (all zero)
 *   12-byte stream header:
 *     16-19: StreamFlags (bit0 = Acknowledge)
 *     20-23: SequenceID (UInt32LE)
 *     24-25: StartLine (UInt16LE)
 *     26-27: LineCount (UInt16LE)
 *   followed by RGB565LE video bytes.
 *
 * @param {object} opts
 * @param {number} opts.sequenceId
 * @param {number} opts.startLine
 * @param {number} opts.lineCount
 * @param {Buffer} opts.videoData
 * @param {boolean} [opts.acknowledge=false]
 * @returns {Buffer}
 */
function buildVideoStreamTelegram({ sequenceId, startLine, lineCount, videoData, acknowledge = false }) {
  const data = Buffer.isBuffer(videoData) ? videoData : Buffer.from(videoData || []);

  const streamHeader = Buffer.alloc(12, 0);
  if (acknowledge) {
    streamHeader.writeUInt8(0x01, 0);
  }
  streamHeader.writeUInt32LE(sequenceId >>> 0, 4);
  streamHeader.writeUInt16LE(startLine & 0xFFFF, 8);
  streamHeader.writeUInt16LE(lineCount & 0xFFFF, 10);

  const frameLength = 16 + streamHeader.length + data.length;
  const frameHeader = Buffer.alloc(16, 0);
  frameHeader.writeUInt16LE(FRAME_ID_VIDEO, 0);
  frameHeader.writeUInt16LE(frameLength, 2);
  frameHeader.writeUInt16LE(FRAME_VERSION, 4);
  frameHeader.writeUInt16LE(nextPacketId(), 6);

  return Buffer.concat([frameHeader, streamHeader, data]);
}

module.exports = {
  buildIdControlMessage,
  buildDateTimeMessage,
  buildVideoStartMessage,
  buildTelegram,
  buildVideoStreamTelegram,
  FRAME_ID_MESSAGE,
  FRAME_ID_VIDEO,
};
