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
const AUDIO_CONTROL_HEADER = Buffer.from('ULUX', 'ascii');

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

/** Build the observed u::lux initialization message (ID-Init, 0x02). */
function buildIdInitMessage(initFlags = 0x0003, initCode = 0x5AA5) {
  const buf = Buffer.alloc(8, 0);
  buf.writeUInt8(0x08, 0);
  buf.writeUInt8(MessageIds.IdInit, 1);
  buf.writeUInt16LE(0x0000, 2);
  buf.writeUInt16LE(initFlags & 0xFFFF, 4);
  buf.writeUInt16LE(initCode & 0xFFFF, 6);
  return buf;
}

/**
 * Build a DateTime message (MessageID=0x2F, 12 bytes).
 *
 * u::lux UMP layout after the actor ID is: second, minute, hour, weekday,
 * day, month, and year (little-endian). This V2.32 device expects local clock
 * fields directly; sending UTC makes the displayed hour two hours behind.
 *
 * @param {Date} [date=new Date()] - Date/time to encode (defaults to now)
 * @returns {Buffer} 12-byte message buffer
 */
function buildDateTimeMessage(date, timeZone = undefined) {
  const d = date instanceof Date ? date : new Date();
  const parts = getDateParts(d, timeZone);
  const buf = Buffer.alloc(12, 0);
  buf.writeUInt8(0x0C, 0);                          // MessageLength
  buf.writeUInt8(MessageIds.DateTime, 1);           // MessageID = 0x2F
  buf.writeUInt16LE(0x0000, 2);                     // ActorID
  buf.writeUInt8(parts.second, 4);
  buf.writeUInt8(parts.minute, 5);
  buf.writeUInt8(parts.hour, 6);
  buf.writeUInt8(parts.weekday, 7);
  buf.writeUInt8(parts.day, 8);
  buf.writeUInt8(parts.month, 9);
  buf.writeUInt16LE(parts.year, 10);
  return buf;
}

function getDateParts(date, timeZone) {
  if (!timeZone) {
    return {
      second: date.getSeconds(), minute: date.getMinutes(), hour: date.getHours(),
      weekday: date.getDay(), day: date.getDate(), month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  }
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    second: Number(values.second), minute: Number(values.minute), hour: Number(values.hour),
    weekday: weekdays[values.weekday] ?? 0, day: Number(values.day), month: Number(values.month),
    year: Number(values.year),
  };
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

/**
 * Build a VideoStop message (MessageID=0xA3, 12 bytes).
 *
 * @param {number} [sequenceId=1] - Stream sequence identifier to stop
 * @returns {Buffer} 12-byte message buffer
 */
function buildVideoStopMessage(sequenceId = 1) {
  const buf = Buffer.alloc(12, 0);
  buf.writeUInt8(0x0C, 0);                         // MessageLength = 12
  buf.writeUInt8(MessageIds.VideoStop, 1);        // MessageID = 0xA3
  buf.writeUInt16LE(0x0000, 2);                    // ActorID = 0
  buf.writeUInt32LE(0, 4);                         // StopFlags = 0
  buf.writeUInt32LE(sequenceId >>> 0, 8);          // SequenceID
  return buf;
}

/** Build a passive VideoState capability request (MessageID=0xA1). */
function buildVideoStateRequest() {
  const buf = Buffer.alloc(4, 0);
  buf.writeUInt8(0x04, 0);
  buf.writeUInt8(MessageIds.VideoState, 1);
  buf.writeUInt16LE(0x0016, 2);
  return buf;
}

/**
 * Build a PageIndex message (MessageID=0x2E, 6 bytes).
 * Changes the active displayed page on the switch (0=page 1, 1=page 2, ...).
 *
 * @param {number} pageIndex - Target page index (0..31)
 * @returns {Buffer} 6-byte message buffer
 */
function buildPageIndexMessage(pageIndex = 0) {
  const buf = Buffer.alloc(6, 0);
  buf.writeUInt8(0x06, 0);                         // MessageLength = 6
  buf.writeUInt8(MessageIds.PageIndex, 1);        // MessageID = 0x2E
  buf.writeUInt16LE(0x0000, 2);                    // ActorID = 0
  buf.writeUInt8(Math.max(0, Math.min(31, pageIndex & 0xFF)), 4);
  buf.writeUInt8(0, 5);                            // Reserved
  return buf;
}

/**
 * Build an ID-Activate message (MessageID=0x2D, 6 bytes).
 * Activates (display on) or deactivates (standby/screensaver) the switch.
 *
 * @param {object} opts
 * @param {boolean} [opts.activate=true]   - If true, display is switched on
 * @param {boolean} [opts.deactivate=false] - If true, display goes into standby
 * @returns {Buffer} 6-byte message buffer
 */
function buildActivateMessage({ activate = true, deactivate = false } = {}) {
  const buf = Buffer.alloc(6, 0);
  buf.writeUInt8(0x06, 0);                         // MessageLength = 6
  buf.writeUInt8(MessageIds.IdActivate, 1);       // MessageID = 0x2D
  buf.writeUInt16LE(0x0000, 2);                    // ActorID = 0
  let flags = 0;
  if (activate) flags |= 0x01;                     // bit 0 = DisplayActivate
  if (deactivate) flags |= 0x02;                   // bit 1 = DisplayDeactivate
  buf.writeUInt8(flags, 4);
  buf.writeUInt8(0, 5);                            // Reserved
  return buf;
}

/**
 * Build an EditValue message (MessageID=0x42, 6 bytes).
 * Sets the user-editable value of an actor (e.g. setpoint, brightness).
 *
 * @param {number} actorId - Target actor ID
 * @param {number} editValue - 16-bit signed integer value
 * @returns {Buffer} 6-byte message buffer
 */
function buildEditValueMessage(actorId = 1, editValue = 0) {
  const buf = Buffer.alloc(6, 0);
  buf.writeUInt8(0x06, 0);                         // MessageLength = 6
  buf.writeUInt8(MessageIds.EditValue, 1);        // MessageID = 0x42
  buf.writeUInt16LE(actorId & 0xFFFF, 2);          // ActorID
  buf.writeInt16LE(editValue, 4);                  // EditValue
  return buf;
}

/**
 * Build a RealValue message (MessageID=0x43, variable length).
 * Sends real values (read-only feedbacks from central control) to an actor.
 *
 * @param {number} actorId - Target actor ID
 * @param {number[]|number} realValues - 1 to 4 16-bit signed values
 * @returns {Buffer} message buffer
 */
function buildRealValueMessage(actorId = 1, realValues = [0]) {
  const vals = Array.isArray(realValues) ? realValues.slice(0, 4) : [Number(realValues) || 0];
  const length = 4 + (vals.length * 2);
  const buf = Buffer.alloc(length, 0);
  buf.writeUInt8(length, 0);                       // MessageLength
  buf.writeUInt8(MessageIds.RealValue, 1);         // MessageID = 0x43
  buf.writeUInt16LE(actorId & 0xFFFF, 2);          // ActorID
  for (let i = 0; i < vals.length; i++) {
    buf.writeInt16LE(vals[i] || 0, 4 + (i * 2));
  }
  return buf;
}

/**
 * Build an ID-Value message (MessageID=0x41, variable length).
 * Sends EditValue and up to 4 RealValues in one message.
 *
 * @param {number} actorId - Target actor ID
 * @param {number} editValue - EditValue (Int16)
 * @param {number[]} [realValues=[0]] - Up to 4 RealValues (Int16)
 * @returns {Buffer} message buffer
 */
function buildValueMessage(actorId = 1, editValue = 0, realValues = [0]) {
  const vals = Array.isArray(realValues) ? realValues.slice(0, 4) : [Number(realValues) || 0];
  const length = 6 + (vals.length * 2);
  const buf = Buffer.alloc(length, 0);
  buf.writeUInt8(length, 0);                       // MessageLength
  buf.writeUInt8(MessageIds.IdValue, 1);           // MessageID = 0x41
  buf.writeUInt16LE(actorId & 0xFFFF, 2);          // ActorID
  buf.writeInt16LE(editValue || 0, 4);             // EditValue
  for (let i = 0; i < vals.length; i++) {
    buf.writeInt16LE(vals[i] || 0, 6 + (i * 2));
  }
  return buf;
}

/**
 * Build an ID-LED message (MessageID=0x44, 8 bytes).
 * Controls up to 4 corner LEDs of an actor.
 *
 * @param {number} actorId - Target actor ID
 * @param {Array<{ color?: number, blinkMode?: number, override?: boolean }>} leds - Config for up to 4 LEDs
 * @returns {Buffer} 8-byte message buffer
 */
function buildLedMessage(actorId = 1, leds = []) {
  const buf = Buffer.alloc(8, 0);
  buf.writeUInt8(0x08, 0);                         // MessageLength = 8
  buf.writeUInt8(MessageIds.IdLed, 1);             // MessageID = 0x44
  buf.writeUInt16LE(actorId & 0xFFFF, 2);          // ActorID
  for (let i = 0; i < 4; i++) {
    const led = leds[i];
    if (!led) continue;
    let b = 0;
    b |= (led.color ?? 0) & 0x07;                  // bits 0-2: off, red, green, yellow, blue, magenta, cyan, white
    b |= ((led.blinkMode ?? 0) & 0x07) << 4;       // bits 4-6: 0, 16, 32, 48, 64, 80, 96, 112
    if (led.override !== false) {
      b |= 0x80;                                   // bit 7: Override UMP control
    }
    buf.writeUInt8(b, 4 + i);
  }
  return buf;
}

/**
 * Build an ID-Text message (MessageID=0x45, variable length).
 * Sets or removes custom text for an actor.
 *
 * @param {number} actorId - Target actor ID
 * @param {number} textId - Text index (0..9)
 * @param {string} text - Text string to display
 * @param {object} [options]
 * @param {object} [options.color] - { r: 0..255, g: 0..255, b: 0..255 }, encoded as RGB565
 * @param {boolean} [options.visible=true]
 * @param {boolean} [options.remove=false]
 * @param {boolean} [options.updateColor=true]
 * @param {boolean} [options.updateText=true]
 * @param {boolean} [options.useColor=true]
 * @returns {Buffer} message buffer
 */
function buildTextMessage(actorId = 1, textId = 0, text = '', options = {}) {
  const {
    color = { r: 255, g: 255, b: 255 },
    visible = true,
    remove = false,
    updateColor = true,
    updateText = true,
    useColor = true,
  } = options;

  if (remove) {
    const buf = Buffer.alloc(12, 0);
    buf.writeUInt8(0x0C, 0);
    buf.writeUInt8(MessageIds.IdText, 1);
    buf.writeUInt16LE(actorId & 0xFFFF, 2);
    buf.writeUInt8(textId & 0x0F, 8);
    buf.writeUInt8(0x20, 9);                       // bit 5 = Remove flag alone
    return buf;
  }

  const textBuf = Buffer.from(String(text || ''), 'utf8');
  const length = 13 + textBuf.length + 1;          // Null-terminated text plus protocol padding
  const buf = Buffer.alloc(length, 0);
  buf.writeUInt8(length, 0);
  buf.writeUInt8(MessageIds.IdText, 1);
  buf.writeUInt16LE(actorId & 0xFFFF, 2);

  const red = (color.r ?? 255) & 0xFF;
  const green = (color.g ?? 255) & 0xFF;
  const blue = (color.b ?? 255) & 0xFF;
  const rgb565 = ((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3);
  buf.writeUInt16LE(rgb565, 4);                    // Color: RGB565 (white = 0xFFFF)
  buf.writeUInt16LE(0, 6);                         // Reserved

  buf.writeUInt8(textId & 0x0F, 8);

  let flags = 0;
  if (useColor) flags |= 0x01;                     // bit 0: UseColor
  if (updateColor) flags |= 0x02;                  // bit 1: UpdateColor
  if (updateText) flags |= 0x04;                   // bit 2: UpdateText
  flags |= 0x08;                                   // bit 3: UpdateVisibility
  if (visible) flags |= 0x10;                      // bit 4: Visible
  buf.writeUInt8(flags, 9);

  buf.writeUInt16LE(0, 10);                        // Reserved
  textBuf.copy(buf, 12);
  buf.writeUInt8(0, 12 + textBuf.length);          // Null terminator

  return buf;
}

/**
 * Build an ID-AudioVolume message (MessageID=0x91, 6 bytes).
 *
 * @param {number} [volume=50] - Volume (0..100)
 * @returns {Buffer} 6-byte message buffer
 */
function buildAudioVolumeMessage(volume = 50) {
  const buf = Buffer.alloc(6, 0);
  buf.writeUInt8(0x06, 0);
  buf.writeUInt8(MessageIds.AudioVolume, 1);
  buf.writeUInt16LE(0x0000, 2);
  buf.writeUInt8(Math.max(0, Math.min(100, volume & 0xFF)), 4);
  buf.writeUInt8(0, 5);
  return buf;
}

/**
 * Build an ID-AudioStop message (MessageID=0x92, 6 bytes).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.stopNormal=true] - Stop normal playback / recording
 * @param {boolean} [opts.stopAlarm=false]  - Stop alarm playback
 * @returns {Buffer} 6-byte message buffer
 */
function buildAudioStopMessage({ stopNormal = true, stopAlarm = false } = {}) {
  const buf = Buffer.alloc(6, 0);
  buf.writeUInt8(0x06, 0);
  buf.writeUInt8(MessageIds.AudioStop, 1);
  buf.writeUInt16LE(0x0000, 2);
  let flags = 0;
  if (stopNormal) flags |= 0x01;
  if (stopAlarm) flags |= 0x02;
  buf.writeUInt8(flags, 4);
  buf.writeUInt8(0, 5);
  return buf;
}

/**
 * Build an ID-AudioPlayLocal message (MessageID=0x98, 16 bytes).
 *
 * @param {object} [opts]
 * @param {number} [opts.soundIndex=1]         - 1-based index of saved sound file
 * @param {number} [opts.volume=100]           - Volume (0..100)
 * @param {number} [opts.repeats=0]            - Number of repeats (0 = once)
 * @param {number} [opts.delayBeforeRepeat=0]  - Delay between repeats (100ms units)
 * @param {number} [opts.equalizer=0]          - 0=Normal, 1=Rock, 2=Jazz, 3=Classic, 4=Pop
 * @param {boolean} [opts.alarm=false]         - If true, plays at max volume as alarm
 * @param {number} [opts.incVolumeTime=0]      - Fade-in time (100ms units)
 * @returns {Buffer} 16-byte message buffer
 */
function buildAudioPlayLocalMessage({
  soundIndex = 1,
  volume = 100,
  repeats = 0,
  delayBeforeRepeat = 0,
  equalizer = 0,
  alarm = false,
  incVolumeTime = 0,
} = {}) {
  const buf = Buffer.alloc(16, 0);
  buf.writeUInt8(0x10, 0);
  buf.writeUInt8(MessageIds.AudioPlayLocal, 1);
  buf.writeUInt16LE(0x0000, 2);
  buf.writeUInt8(Math.max(0, Math.min(100, volume & 0xFF)), 4);
  buf.writeUInt8(equalizer & 0x07, 5);
  let playFlags = 0;
  if (alarm) playFlags |= 0x01;
  buf.writeUInt16LE(playFlags, 6);
  buf.writeUInt16LE(incVolumeTime & 0xFFFF, 8);
  buf.writeUInt16LE(repeats & 0xFFFF, 10);
  buf.writeUInt16LE(delayBeforeRepeat & 0xFFFF, 12);
  buf.writeUInt16LE(soundIndex & 0xFFFF, 14);
  return buf;
}

/**
 * Build the 16-byte ULUX audio control frame for UDP port 35004.
 *
 * The control frame is not a regular UMP telegram: its fields are network
 * byte order and its final byte is an XOR checksum over bytes 0..14.
 *
 * @param {object} opts
 * @param {string} opts.targetIp - IPv4 destination for the audio stream
 * @param {number} [opts.targetPort=35000]
 * @param {boolean} [opts.micOn=false]
 * @param {number} [opts.micGain=0]
 * @param {boolean} [opts.speakerOn=true]
 * @param {number} [opts.speakerVolume=100]
 * @returns {Buffer}
 */
function buildAudioControlMessage({
  targetIp,
  targetPort = 35000,
  micOn = false,
  micGain = 0,
  speakerOn = true,
  speakerVolume = 100,
} = {}) {
  if (typeof targetIp !== 'string') {
    throw new TypeError('targetIp must be an IPv4 address');
  }

  const octets = targetIp.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    throw new TypeError(`Invalid IPv4 targetIp: ${targetIp}`);
  }

  const buf = Buffer.alloc(16, 0);
  AUDIO_CONTROL_HEADER.copy(buf, 0);
  buf.writeUInt8(0x01, 4);
  octets.forEach((octet, index) => buf.writeUInt8(octet, 5 + index));
  buf.writeUInt16BE(clampByteRange(targetPort, 0, 65535), 9);
  buf.writeUInt8(micOn ? 1 : 0, 11);
  buf.writeUInt8(clampByteRange(micGain, 0, 100), 12);
  buf.writeUInt8(speakerOn ? 1 : 0, 13);
  buf.writeUInt8(clampByteRange(speakerVolume, 0, 100), 14);

  let checksum = 0;
  for (let index = 0; index < 15; index += 1) checksum ^= buf[index];
  buf.writeUInt8(checksum, 15);
  return buf;
}

function clampByteRange(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

/** Build a 4-byte read/request message without data. */
function buildRequestMessage(messageId, actorId = 0) {
  const message = Buffer.alloc(4, 0);
  message.writeUInt8(0x04, 0);
  message.writeUInt8(messageId, 1);
  message.writeUInt16LE(actorId & 0xFFFF, 2);
  return message;
}

function buildPageIndexRequest() {
  return buildRequestMessage(MessageIds.PageIndex);
}

function buildPageCountRequest() {
  return buildRequestMessage(MessageIds.PageCount);
}

function buildIdListRequest() {
  return buildRequestMessage(MessageIds.IdList);
}

function buildTemperatureRequest() {
  return buildRequestMessage(MessageIds.I2C_Temperature);
}

function buildHumidityRequest() {
  return buildRequestMessage(MessageIds.I2C_Humidity);
}

function buildCO2Request() {
  return buildRequestMessage(MessageIds.I2C_CO2);
}

function buildVOCRequest() {
  return buildRequestMessage(MessageIds.I2C_VOC);
}

function buildIN2Request() {
  return buildRequestMessage(MessageIds.I2C_IN2);
}

function buildLuxRequest() {
  return buildRequestMessage(MessageIds.IdLux);
}

function buildIRRequest(actorId = 1) {
  return buildRequestMessage(MessageIds.IdIR, actorId);
}

function buildInitializationRequest() {
  return Buffer.concat([
    buildRequestMessage(MessageIds.IdState),
    buildRequestMessage(MessageIds.IdControl),
    buildRequestMessage(MessageIds.PageCount),
    buildRequestMessage(MessageIds.PageIndex),
  ]);
}

// ─── Telegram builder ────────────────────────────────────────────────────────

/**
 * Wrap one or more message buffers inside a 16-byte UMP telegram header.
 *
 * @param {...Buffer} messageBuffers - One or more serialised message buffers
 * @returns {Buffer} Complete telegram ready to send over UDP
 */
function buildTelegramForDevice(deviceId = 0x5d, frameVersion = 0x0232, ...messageBuffers) {
  const messagesBuffer = Buffer.concat(messageBuffers);
  const totalLength = 16 + messagesBuffer.length;

  const header = Buffer.from('01861000320225000000000001000100', 'hex');
  header.writeUInt16LE(totalLength, 2);
  header.writeUInt16LE(nextPacketId(), 6);
  header.writeUInt16LE(frameVersion & 0xffff, 4);
  header.writeUInt16LE(deviceId & 0xffff, 12);

  return Buffer.concat([header, messagesBuffer]);
}

function buildTelegram(...messageBuffers) {
  return buildTelegramForDevice(0x5d, ...messageBuffers);
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
  buildIdInitMessage,
  buildDateTimeMessage,
  buildVideoStartMessage,
  buildVideoStopMessage,
  buildVideoStateRequest,
  buildPageIndexMessage,
  buildPageIndexRequest,
  buildPageCountRequest,
  buildIdListRequest,
  buildActivateMessage,
  buildEditValueMessage,
  buildRealValueMessage,
  buildValueMessage,
  buildLedMessage,
  buildTextMessage,
  buildAudioVolumeMessage,
  buildAudioStopMessage,
  buildAudioPlayLocalMessage,
  buildAudioControlMessage,
  buildRequestMessage,
  buildTemperatureRequest,
  buildHumidityRequest,
  buildCO2Request,
  buildVOCRequest,
  buildIN2Request,
  buildLuxRequest,
  buildIRRequest,
  buildInitializationRequest,
  buildTelegram,
  buildTelegramForDevice,
  buildVideoStreamTelegram,
  FRAME_ID_MESSAGE,
  FRAME_ID_VIDEO,
};
