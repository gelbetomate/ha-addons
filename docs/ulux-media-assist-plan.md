- [x] Wyoming-TCP-Satellit mit `describe`, `run-pipeline`, Audioeingang und Audioausgang bereitstellen.
- [ ] `assist_satellite`-Entitaet in HA als zusaetzliche native Darstellung anbinden.
# u::lux Media, Streaming und Assist

## Ziel

Der u::lux soll in Home Assistant als Medienausgabe und als Push-to-talk-Assist-Satellit nutzbar werden:

- Audio und Radio ueber eine `media_player`-Entitaet.
- Video- und Kamerastreams ueber denselben Medienpfad, sofern das UMP-Videoformat unterstuetzt wird.
- Mikrofonsteuerung ueber eine `assist_satellite`-Entitaet.
- Aktivierung des Mikrofons per u::lux-Taste oder Home-Assistant-Ereignis, nicht dauerhaft.
- Seitengebundene Streams: Beim Wechsel auf eine konfigurierte Seite startet ein Stream; beim Verlassen endet er.
- Die normale Dashboard-Renderpipeline und der UMP-Stream duerfen sich nicht gegenseitig ueberschreiben.

## Zielarchitektur

```text
Home Assistant Assist / Music Assistant
                |
       media_player / assist_satellite
                |
        u::lux Display Integration
                |
         HTTP/WebSocket Bridge API
                |
          u::lux UMP Bridge
                |
       UMP audio/video over UDP
                |
              u::lux
```

Die Bridge bleibt der einzige Besitzer der UMP-/UDP-Kommunikation. Die Home-Assistant-Integration steuert Entitaeten, Services und Zustandsabbildung.

## Bestaetigte Audio-Netzwerkarchitektur

- UMP-Steuerkanal: UDP `35004` (`0x88AC`) fuer Mikrofon-/Lautsprecherfreigabe,
      Lautstaerke, Empfindlichkeit und Ziel-IP.
- Audio-Datenkanal: UDP `35000` (`0x88A4`) fuer rohe Audiodatagramme in beide
      Richtungen.
- Der bestehende UMP-/Geraetekanal auf UDP `34988` bleibt fuer die bisherige
      Geraetekommunikation erhalten.

Der Bridge-Audiotransport ist jetzt als separater UDP-Socket auf Port `35000`
vorhanden. Er erkennt Header- und Raw-Payloads, dekodiert PCM beziehungsweise
G.711 A-Law in normierte 16-Bit-PCM-Frames, puffert sequenzierte Frames 60 ms
und stellt einen getakteten PCM-Ausgang mit 20-ms-Paketen bereit.

Die ControlMessage ist inzwischen implementiert:

```text
00..03  ASCII ULUX
04      MessageType = 0x01
05..08  Target IPv4
09..0A  Target UDP port, Big-Endian
0B      Microphone state
0C      Microphone gain, 0..100
0D      Speaker state
0E      Speaker volume, 0..100
0F      XOR checksum ueber Byte 00..0E
```

Home Assistant kann sie ueber `ulux_display.configure_audio` ausloesen. Die
Bridge sendet sie an den u::lux-Controlport `35004`.

## Umsetzungsstand

### Erledigt: erster Media-Player-Schnitt

Die Integration stellt jetzt pro u::lux eine `media_player`-Entitaet bereit. Sie nutzt die vorhandenen Bridge-Endpunkte fuer:

- `sound://<index>` zur Wiedergabe eines lokal im u::lux gespeicherten Sounds.
- Stop der normalen Audiowiedergabe.
- Master-Lautstaerke von 0 bis 100 Prozent.

Beliebige URLs, `AudioPlayRemote`, Mikrofonaufnahme und Video werden in diesem ersten Schritt absichtlich abgelehnt. Dadurch wird kein unbestaetigtes UMP-Payloadformat als funktionierend dargestellt.

### Erledigt: selektives GeekMagic-Update und u::lux-Seitenstream

Kompatible Upstream-Verbesserungen wurden ohne Austausch des bestehenden
Pillow-Renderers uebernommen. Dazu gehoeren das Date/Time-Widget sowie
zusaetzliche Konfigurations-/Entity-Muster und die neuen Themes watchOS,
StandBy, Night, Blueprint, Ink, Aurora und Brutal. Der u::lux kann nun eine physische
`Stream Page` mit einer begrenzten Bildrate von bis zu 5 FPS bedienen.

## Home-Assistant-Geraet

Pro u::lux werden schrittweise folgende Plattformen ergaenzt:

- `media_player`: Wiedergabe, Lautstaerke, Stop und spaeter Pause/Resume.
- `assist_satellite`: Push-to-talk-Aufnahme und Audioantwort.
- `sensor`: Seitenindex, Seitenanzahl, Audio-/Videostatus und erkannte Videodimensionen.
- `binary_sensor`: Video verfuegbar, Stream aktiv und Mikrofon aktiv.
- `number`: Lautstaerke und gegebenenfalls Helligkeit.
- `button`: Stream stoppen, Push-to-talk starten/stoppen und Seitennavigation.
- `image`: letzter gerenderter Displayinhalt als Vorschau.

Nicht jede Entitaet wird sofort aktiviert. UMP-Faehigkeiten werden aus dem Bridge-Status abgeleitet, damit nicht unterstuetzte Funktionen als nicht verfuegbar erscheinen.

## Streammodell

Ein `StreamManager` verwaltet pro Geraet exklusiv den aktiven Modus:

```text
NORMAL_RENDERING -> STARTING -> STREAMING -> STOPPING -> NORMAL_RENDERING
```

Ein Streamprofil enthaelt mindestens:

- Geraet und Seite
- Quelle und Medientyp
- Audio-/Videoformat
- Zielaufloesung und Framerate
- Verhalten bei Seitenwechsel und Fehler

Seitenbindungen werden zuerst als Bridge-/HA-Konfiguration umgesetzt. Der Stream wird nur gestartet, wenn das Geraet die Seite aktiv meldet oder die Seite explizit gesetzt wurde.

## UMP-Bezug

Bereits dokumentierte beziehungsweise im Repository vorhandene Punkte:

- `AudioPlayLocal`: lokaler Klangindex.
- `AudioPlayRemote (0x99)`: Audio vom Host zum u::lux.
- `AudioRecord (0x9A)`: vorgesehener Audio-Rueckkanal; Payload und Timing muessen noch durch kontrollierte Mitschnitte bestaetigt werden.
- `VideoState (0xA1)`, `VideoStart (0xA2)` und Video-Daten: Faehigkeit, Grenzen und Streaming.
- `ID-Event (0x51)`: im Bridge-Code bereits dekodiert; erzeugt `ulux_key`-Events fuer Tastenflanken.
- `KeyAction (0xB1)`: in der Protokolltabelle erwaehnt, aber in den vorhandenen Beispielen und im aktuellen Decoder noch nicht bestaetigt.

Vor produktiver Audio-/Mikrofonimplementierung werden widerspruechliche Audio-IDs in den aktuellen Buildern und Protokollnotizen vereinheitlicht. Unbestaetigte Payloads werden nicht als fertiger Vertrag behandelt.

## Phasen

### Phase 1: Vertrag und Status

- [ ] Bridge-Antwort fuer Geraetefaehigkeiten, Seitenzustand und Streamzustand definieren.
- HA-seitige Zustandsmodelle ergaenzen.
- Audio-/Video- und Mikrofonfaehigkeit korrekt als verfuegbar/nicht verfuegbar abbilden.

### Phase 2: Sichere Steuerung

- [x] lokale Sounds, Lautstaerke und Stop als HA-`media_player` anbinden.
- [x] Audio-Control-Frame fuer Mikrofon-/Lautsprecherfreigabe anbinden.
- [x] PCM-/A-Law-Audioframes mit optionalem 4-Byte-Header dekodieren.
- [x] 60-ms-Jitterpuffer und 20-ms-PCM-Ausgang implementieren.
- [ ] Seitenwechsel als Streamvorbereitung anbinden.
- [x] exklusiven Bildstreammodus in der Bridge einfuehren.
- Bildfolgen als Teststream stabilisieren.

### Phase 3: `media_player`

- `play_media` fuer lokale Sounds und bestaetigte Remote-Audioquellen.
- Videoquelle ueber Bridge dekodieren und in UMP-Frames umwandeln.
- Status, Fehler, Lautstaerke und Seitenbindung abbilden.

### Phase 4: Push-to-talk-Assist

- [x] `ulux_key`-Events als ersten Push-to-talk-Trigger anbinden.
- [ ] `KeyAction` erst nach bestaetigtem Payload als alternativen Trigger ergaenzen.
- [x] `ControlMessage` auf UDP `35004` fuer Mikrofonziel, Aktivierung und Empfindlichkeit senden.
- [x] Normalisierte Audioframes ueber einen bidirektionalen Bridge-WebSocket bereitstellen.
- `assist_satellite` an die HA-Assist-Pipeline anbinden.
- Audioantwort ueber UDP `35000` ausgeben und vorher per UMP auf UDP `35004` freischalten.
- Aufnahme nach Abschluss, Timeout oder Stop-Taste sicher beenden.

### Phase 5: Music Assistant

- Nach stabilem `media_player` einen Music-Assistant-Player-Provider erstellen.
- Player-Faehigkeiten und Formatgrenzen melden.
- Radio, Playlists und Multiroom nur mit getesteter Audio-Synchronisierung freischalten.

## Akzeptanzkriterien

- Ein u::lux kann in HA als `media_player` angesprochen werden.
- Ein Push-to-talk-Ereignis startet genau eine Assist-Unterhaltung.
- Das Mikrofon ist ausserhalb einer Unterhaltung geschlossen.
- Ein Seitenwechsel beendet einen Seitenstream deterministisch.
- Dashboard-Rendering und Streambetrieb konkurrieren nicht um das Geraet.
- Ein nicht bestaetigtes UMP-Format fuehrt zu einem klaren Fehlerzustand statt zu endlosen Wiederholungen.
- Alle neuen Bridge-Endpunkte und HA-Entitaeten besitzen Tests fuer Offline-, Timeout- und Abbruchfaelle.
