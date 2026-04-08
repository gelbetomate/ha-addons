'use strict';

/**
 * UMP message IDs.
 *
 * Source: evondevelop/XAMControlUlux — Ulux/XAMUmp/Ump/XAMUmpMessageIDs.cs (UmpMessageID enum)
 * Also includes ID-Event (0x51) from the UMP protocol PDF.
 */
const MessageIds = {
  IdState:          0x01,
  IdControl:        0x21,
  IdList:           0x0F,
  PageCount:        0x0E,
  PageIndex:        0x2E,
  EditValue:        0x42,
  IdEvent:          0x51,
  DateTime:         0x2F,
  I2C_Temperature:  0x71,
  AudioPlayRemote:  0x99,
  VideoState:       0xA1,
  VideoStart:       0xA2,
};

/** Reverse map: ID value → name string (for logging). */
const MessageIdNames = Object.fromEntries(
  Object.entries(MessageIds).map(([name, id]) => [id, name])
);

module.exports = { MessageIds, MessageIdNames };
