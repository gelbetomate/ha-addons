'use strict';

/**
 * UMP message IDs.
 *
 * Source: evondevelop/XAMControlUlux — Ulux/XAMUmp/Ump/XAMUmpMessageIDs.cs (UmpMessageID enum)
 * Also includes ID-Event (0x51) from the UMP protocol PDF.
 */
const MessageIds = {
  IdState:          0x01,
  IdInit:           0x02,
  IdLux:            0x03,
  IdIR:             0x81,
  IdSignature:      0x04,
  PageCount:        0x0E,
  IdList:           0x0F,
  IdControl:        0x21,
  IdActivate:       0x2D,
  PageIndex:        0x2E,
  DateTime:         0x2F,
  IdValue:          0x41,
  EditValue:        0x42,
  RealValue:        0x43,
  IdLed:            0x44,
  IdText:           0x45,
  IdEvent:          0x51,
  I2C_Temperature:  0x71,
  I2C_Humidity:     0x72,
  I2C_CO2:          0x73,
  I2C_IN2:          0x74,
  I2C_VOC:          0x75,
  AudioVolume:      0x91,
  AudioStop:        0x92,
  AudioPlayLocal:   0x98,
  AudioPlayRemote:  0x99,
  AudioRecord:      0x9A,
  VideoState:       0xA1,
  VideoStart:       0xA2,
  VideoStop:        0xA3,
};

/** Reverse map: ID value → name string (for logging). */
const MessageIdNames = Object.fromEntries(
  Object.entries(MessageIds).map(([name, id]) => [id, name])
);

module.exports = { MessageIds, MessageIdNames };
