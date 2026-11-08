# u::Lux Switch IP & Home Assistant — Master-Roadmap & TODO-Liste

Basierend auf der Analyse aller Dokumente im Verzeichnis `docs/` und `docs/Gemini Notebook/` (Kapitel 0–10, Gesamthandbuch, Anforderungs- und Spezifikationsdokumente, 7 Use Cases, 5-Seiten-Raumkonzept sowie Praxistest-Erkenntnisse) fasst dieses Dokument den aktuellen Ist-Zustand, die identifizierten Lücken und den vollständigen Umsetzungsplan zusammen.

## Audit 2026-11-01

Die Roadmap wurde gegen den aktuellen Code und die u::lux-Config-/TestCenter-
Mitschnitte geprueft:

- MAC-Suffixe sind nur Seriennummer-Kandidaten. Die Seriennummer 456 stammt
  aus der Config-Software und darf nicht aus der MAC abgeleitet werden.
- Discovery muss MAC, `protocol_id`, IP und Seriennummer getrennt behandeln.
  UMP-Adressen wie `00:00:26:...` sind keine Geraeteidentitaet.
- `ID_EDITVALUE (0x42)` ist bei Wert-/Langdruck-Konfigurationen der reale
  Bedienkanal; `ID_EVENT (0x51)` ist nicht der einzige Tasterpfad.
- Das `ID_LED`-Wireformat wurde auf ein Telegramm mit vier Farbbytes fuer
  die LED-Slots 0..3 korrigiert; MQTT-Aliase wurden in `0.5.113` ergaenzt.
- Hardwaretest bestaetigt: Actor `10` steuert alle vier Taster-LEDs; die
  Zuordnung ist oben links gruen, oben rechts rot, unten rechts blau und
  unten links weiss. Die LEDs reagieren nur bei aktiviertem Display.
- State-/Sensor-Polling ist kein Tastenevent. Echte Bedienereignisse sind
  `ulux_value`, `ulux_key` oder `ulux_key_action`.
- First-Scan-Refresh und Pending-Merge bleiben bewusst als spaete
  Stabilitaetsaufgabe zurueckgestellt.

### Abgleich der zusaetzlichen Zusammenfassung

Die Zusammenfassung ist als Ziel-/Analysequelle nuetzlich, aber nicht in allen
Protokolldetails autoritativ:

- **Bestaetigt:** `EditValue (0x42)` als realer Bedienkanal bei `Wert veraendern`,
  MQTT-/HA-Dual-Trigger, Audio-/Video-/Discovery-Schichten und die Trennung von
  u::LuxConfig, Bridge und HA.
- **Korrigiert:** Seriennummern aus MAC-Suffixen sind nur Kandidaten. Bei deinem
  Switch ist die bestaetigte Seriennummer `456`, waehrend `0314` den falschen
  Kandidaten `788` ergibt.
- **Korrigiert:** `ID_TEXT` ist im getesteten Pfad `0x45`, nicht `0x61`.
- **Korrigiert:** Das LED-Wireformat ist ein `ID_LED`-Telegramm mit
  `ActorID` und vier Farbbytes fuer die LED-Slots 0..3. Ein pauschales
  48-Byte-Sammeltelegramm ist nicht die verbindliche Implementierungsgrundlage.
- **Zu pruefen:** `PageChangeRequest`-Bit, exakte Videoabmessungen je Design,
  Add-on-RGB-LED, IR, Remote-Audio und die vollstaendige Discovery-
  Seriennummerndekodierung.
- **Nicht als erledigt behandeln:** MQTT Discovery-Deduplizierung,
  Schalter-zu-Schalter-Intercom und vollstaendiger Wyoming-PTT-Lifecycle.

---

## 1. Systemüberblick & Architektur

## Use Cases als Endziel

Die sieben Use Cases aus den Gemini-Unterlagen bleiben der fachliche
Zielrahmen fuer die Integration. Sie werden nicht als bereits bestaetigte
UMP-Funktionen behandelt, sondern als Abnahmeziele fuer die Umsetzung:

| Use Case | Endziel | Aktueller Schwerpunkt |
|---|---|---|
| UC 1 | Dynamisches Display-/Bildstreaming auf einer konfigurierten Seite | VideoActor, VideoState-Grenzen, Chunk-ACK und Page-Trigger stabilisieren |
| UC 2 | Audio-/Radio-Player mit Textmetadaten und Chimes | Audio-Paritaet, `ID_TEXT`, MQTT-/HA-Mediensteuerung |
| UC 3 | Raum-/Heizungsbedienung | Actor `EditValue`/`RealValue`, Klima-Entities und LED-Rueckmeldung |
| UC 4 | Tuerklingel, Video-Tuerseite und Tueroeffner | Event-/Actor-Zuordnung, Video und Audioantwort |
| UC 5 | Kamera-/CCTV-Anzeige | HA-Kameraquelle, RGB565-Konvertierung und stabiler UMP-Stream |
| UC 6 | Schalter-zu-Schalter-Intercom | Audio-Control, PCM/G.711 und Bridge-Routing zwischen Geraeten |
| UC 7 | Wyoming Voice Assist mit Push-to-Talk | `make`/`break` oder `EditValue` als PTT-Trigger und Wyoming-Lifecycle |

Fuer jeden Use Case gelten drei getrennte Nachweise: funktionierender
Konfigurationsweg im u::lux-Design, bestaetigtes UMP-Telegramm und getestete
HA-/MQTT-Oberflaeche. Ein Use Case darf erst als erledigt markiert werden,
wenn alle drei Ebenen funktionieren.

## Medienanforderungen und Betriebsarten

Die Medienanforderungen werden in drei technisch getrennte Pfade aufgeteilt:

| Medienpfad | Ziel | Betriebsart | Prioritaet | Stand |
|---|---|---|---|---|
| **HA Snapshot/Image** | Von `ulux_display` gerenderte Bilder mit Sensorwerten auf einer festen u::lux-Seite anzeigen | Einzelbild alle paar Sekunden, kein Live-Video | P1 | RGB565-Video-Transport funktioniert als Fallback; echtes ImageFrame-Wireformat noch zu klaeren |
| **Video + Audio** | Beliebige Videoquelle, z. B. Tuerstation, mit Ton auf dem u::lux darstellen | Kontinuierlicher Stream mit synchronisiertem Video- und Audiopfad | P1 | Video-Chunk-Transport nach Legacy-Vorbild funktioniert; kontinuierlicher Lifecycle und Audio-Synchronisierung offen |
| **Audio/Radio** | Webradio oder HA-Media-Player mit Wiedergabe, Lautstaerke, Play/Stop/Next und Metadaten | Dauerhafter Audio-Stream; Display zeigt Titel/Senderdaten | P2 | Lokale Sounds funktionieren; Remote-Audio, Metadaten und Steuerung offen |

### Abgrenzung der Bild- und Videoanforderung

- **Snapshot/Image:** Ein HA- oder HACS-Renderbild wird periodisch erzeugt und
  auf eine konfigurierte feste Seite geschrieben. Eine Rate von etwa 0.2 bis
  2 Bildern pro Sekunde reicht fuer Sensorwerte; ein dauerhaftes Video-ACK-
  Streaming ist dafuer nicht zwingend erforderlich.
- **Video:** Eine externe URL oder Kameraquelle wird kontinuierlich dekodiert,
  auf den u::lux-VideoFrame skaliert und mit `VideoState`, `VideoStart`,
  VideoChunks, ACKs und `VideoStop` uebertragen.
- **Audio:** Der Audiopfad laeuft getrennt ueber UDP 35000/35004. Video und
  Audio muessen bei der Tuerstation ueber eine gemeinsame Session gestartet,
  beendet und soweit moeglich zeitlich synchronisiert werden.

### Geplanter Medien-Lifecycle

1. **Snapshot-Session:** Zielseite setzen, Display aktivieren, Bild erzeugen,
   uebertragen, einige Sekunden warten und das naechste Bild senden.
2. **Video-Session:** Zielseite setzen, Display aktivieren, VideoState lesen,
   VideoStart senden, Chunks per ACK uebertragen, Audio starten und bei Stop,
   Seitenwechsel oder Standby beide Pfade beenden.
3. **Radio-Session:** Audioquelle starten, Lautstaerke und Play/Stop steuern,
   Sender-/Titelmetadaten ueber `ID_TEXT` anzeigen und die Session bei Stop
   sauber schliessen.

Die MQTT-/HA-Schnittstellen sollen diese Trennung sichtbar machen:

- `cmd/image`: periodischer Snapshot/ImageFrame, sobald das Wireformat bestaetigt ist
- `cmd/video`: kontinuierlicher VideoFrame-Stream mit optionalem Audio
- `cmd/audio/*` und `media_player`: Radio-/Audio-Stream und Steuerung

Der bisher erfolgreiche rote Test validiert den **VideoFrame-Pfad**. Er ist
damit ein technischer Unterbau fuer Video und fuer Snapshot-Fallbacks, ersetzt
aber noch nicht den separaten ImageFrame-Nachweis.

### Audio- und Kommunikationsanforderungen

| Audiofunktion | Ziel | Protokoll/Pfad | Prioritaet |
|---|---|---|---|
| **Assist-Spracheingabe** | Der u::lux nimmt Sprachbefehle von Home Assistant entgegen, insbesondere Push-to-Talk ueber eine Taste | Wyoming TCP 10700 fuer Assist, Mikrofon-/PCM-Transport ueber UDP 35000 | P1 |
| **Media Assistant** | Home Assistant steuert den u::lux als Audio-Ausgabegeraet fuer Radio, TTS, Chimes und Medien | HA `media_player`, Remote-Audio UDP 35000/35004, `ID_TEXT` fuer Metadaten | P1 |
| **Türkommunikation** | Gegensprechen mit Video, Ton, Klingelereignis und Tueroeffner | SIP/RTP als externer Tuerstationspfad, Bridge-Kopplung zu u::lux Video und Audio | P2 |

#### Assist-Spracheingabe

- Taste oder konfigurierter PTT-Trigger startet eine Wyoming-Assist-Session.
- `make` beginnt die Aufnahme, `break` beendet sie; alternativ muss ein
  konfigurierbarer `EditValue`-Actor verwendet werden koennen.
- Home Assistant verarbeitet STT, Intent und Antwort; die Bridge vermittelt
  Mikrofon und Lautsprecher, statt selbst Sprachverarbeitung zu duplizieren.
- Session-Abbruch, Timeout, Standby und parallele Medienwiedergabe muessen
  definiert behandelt werden.

#### Media Assistant

- Der u::lux wird als echtes HA-Media-Player-Ziel behandelt, nicht nur als
  lokaler Chime-Ausgang.
- Unterstuetzt werden Start, Stop, Pause, Lautstaerke, Quellenwechsel und
  Metadaten; lokale Sounds bleiben als separater Pfad erhalten.
- Radio-/TTS-Wiedergabe und Display-Metadaten muessen gemeinsam gestartet und
  beendet werden.
- Der bestehende lokale Soundpfad ist der erste Referenztest; Remote-Audio,
  Codec, Jitterpuffer und Rueckmeldung sind noch zu validieren.

#### SIP-Tuerkommunikation

- SIP/RTP wird als wahrscheinlicher Integrationspfad fuer Tuerstationen
  vorgesehen; SIP-Signalisierung und RTP-Medien werden nicht mit UMP vermischt.
- Die Bridge benoetigt dafuer einen SIP-Adapter oder eine vorhandene
  SIP-/RTP-Komponente und koppelt nur die Medien-/Ereignissebene an u::lux.
- Klingeln startet optional eine Video-/Audio-Session, die Antwort wird ueber
  den u::lux-Lautsprecher ausgegeben, und ein Tueroeffner-Actor loest den
  SIP-/Relaisbefehl aus.
- Abnahme: Klingelereignis, Audio in beide Richtungen, Video auf der
  Tuerseite, Tueroeffner und sauberes Auflegen.

Das Gesamtsystem gliedert sich in zwei primäre Komponenten:

```mermaid
flowchart TD
    subgraph Hardware ["Physische u::Lux Hardware (NetLink LSA / RJ45)"]
        SW1["u::Lux Switch 1<br/>176x184 Display, 4 RGB-LEDs, 4 Tasten, I2C AddOn"]
        SW2["u::Lux Switch 2<br/>Mikrofon, Lautsprecher (0.5W)"]
    end

    subgraph Bridge ["u::Lux UMP Bridge (Add-on & Standalone Docker)"]
        UDP_UMP["UDP 34988: UMP v2.43 Engine<br/>(Telemetrie, Tasten, Text, LED, Video)"]
        UDP_DISC["UDP 34984: Discovery / Sync Engine<br/>(ARP-Lookup, MAC-Suffix Seriennummer)"]
        UDP_AUDIO["UDP 35000 / 35004: Audio Engine<br/>(PCM/G.711 Chimes, Intercom, PTT)"]
        REGISTRY["/data/registry.json<br/>(Kanonischer Switch-Store)"]
        HTTP_API["HTTP REST API (Port 8099 / Ingress)<br/>(Web-UI Management & TestCenter)"]
        MQTT_GW["MQTT Client & Discovery Gateway<br/>(Node-RED & HA Auto-Discovery)"]
        WYO_SRV["Wyoming TCP 10700 Satellit<br/>(HA Voice Assist Anbindung)"]
    end

    subgraph HA ["Home Assistant"]
        HACS["HACS Integration: u::lux Display<br/>(Pillow Rendering Pipeline 86x90 RGB565)"]
        ENTITIES["HA Entitäten<br/>(Sensoren, Binärsensoren, Media Player, Climate, Buttons)"]
        AUTOMATIONS["Automatisierungen & Dashboards"]
    end

    SW1 <-->|UDP 34988| UDP_UMP
    SW2 <-->|UDP 34988| UDP_UMP
    SW1 <-->|UDP 34984| UDP_DISC
    SW2 <-->|UDP 35000 / 35004| UDP_AUDIO
    
    Bridge <-->|HTTP REST & Web-UI| HA
    Bridge <-->|MQTT (Optional)| HA
    Bridge <-->|TCP 10700| HA
```

---

## 2. Aktueller Status (Ist-Zustand vs. Lücken)

| Bereich | Aktueller Stand | Identifizierte Lücke / Notwendige Anpassung |
| :--- | :--- | :--- |
| **UMP v2.43 Core** | ✅ Vollständig implementiert in v0.5.49 (28 Message IDs, Builders, State Decoder, Sensor Handler) | ✅ **`ID_LED` (`0x44`)**: Ein Telegramm enthält vier Farbbytes fuer die LED-Slots 0..3. |
| **Device Discovery** | ✅ UDP 34984 Scan empfängt Pakete, ARP findet MAC-Adressen | ❌ **UI-Bug**: Seriennummer steht auf „not decoded / not confirmed“, da `serial_number_candidate` nicht automatisch übernommen wird.<br/>❌ **Scan-Refresh**: Ansicht aktualisiert sich beim Klick auf „Scan now“ nicht sofort. |
| **MQTT Gateway** | ✅ Telemetrie, Sensor-, Value- und Command-Topics (`cmd/#`) vorhanden | ✅ **Befehls-Nomenklatur**: LED wird ausschließlich über `cmd/set_led` angesprochen; `cmd/led` ist kein unterstützter Pfad. |
| **Display Rendering (`ulux_display`)** | ✅ Pillow-Engine, 2x Supersampling, 86x90 px Fenster, Widgets für Clock, DateTime, Weather, Climate, Media | 🔄 **GeekMagic v1.0.0 Backport (Option B)**: Pillow-Architektur behalten, Widgets & Helfer (`_cardfit.py`, `_textfit.py`, Jinja/HTML-Template-Ansatz) modernisieren. |
| **Image Streaming** | ✅ Endpunkt `/api/display/image/:switchId` und HACS Stream-Page/Refresh-Rate Entities vorhanden | ⚠️ **Page-Triggered Streaming**: Automatisches Starten/Stoppen des Pillow-Streams beim Wechsel auf die konfigurierte Stream-Seite (Aktor 23). |
| **Audio & Media** | ✅ Lokale Chimes (`ID_AUDIOPLAYLOCAL` `0x98`), Volume (`0x92`), Stop (`0x91`), Basis-`media_player` Plattform | 🔲 **Radio/Audio Streaming**: Dynamische Metadaten via `ID_TEXT` (`<TEXT.0>`), Audio-Transport via UDP 35000/35004.<br/>🔲 **Schalter-zu-Schalter Intercom**: Direktes Audio-Bridging zweier Schalter. |
| **Voice Assist** | 🔲 Konzept & Portbelegung definiert (TCP 10700 Wyoming, UDP 35000) | 🔲 Wyoming-Satellit mit Push-to-Talk (PTT) Event-Triggering in der Bridge. |
| **Tasten & Events** | ✅ Flankenerkennung `hit`, `make`, `break` via `ID_EVENT` (`0x51`) | ⚠️ **Dual-Triggering**: Schalter auf „Wert ändern“ sendet `EditValue` (`0x42`) statt `ID_EVENT`. HACS muss beide auswerten. |

---

## 3. Strukturierte TODO-Roadmap

### 🟢 Phase 1: Discovery-UI & Sofort-Korrekturen (P0)
- [ ] **1.1 Seriennummer-Promotion in `discovery.js`**:
  - Wenn MAC-Adresse ermittelt wurde und `inferSerialNumber(macAddress)` einen Wert liefert (z. B. `0x0B48` → `2888`), diesen direkt als `serial_number` setzen (`serial_number_source: 'mac_inferred'`).
  - Keine automatische Promotion eines MAC-Kandidaten zur bestaetigten Seriennummer; Seriennummer nur aus Konfiguration/decodiertem Feld uebernehmen.
- [x] **1.2 Discovery-Kartenanzeige in `registry.html`**:
  - Statusanzeige bereinigt: Wenn `serial_number` vorhanden, sauberes Badge anzeigen („MAC abgeleitet“ bzw. „Konfiguriert“).
  - Zeile „MAC candidate: ... (not confirmed)“ ausgeblendet, sobald die Seriennummer feststeht.
  - Automatischer Schaltername `u::lux Switch (<serial_number>)` statt generischem `u::lux device (<IP>)`.
---

### 🟡 Phase 2: UMP-Bridge Hardware-Fixes & MQTT-Aliase (P1)
- [x] **2.1 Vier-Kanal-LED-Wireformat (`ID_LED` `0x44`)**:
  - Actor `10` und vier Farbbytes in einem Telegramm steuern alle vier
    Taster-LEDs korrekt.
  - Hardwarezuordnung und Voraussetzung `displayActive=true` validiert.
- [x] **2.2 MQTT Command Normalisierung (`set_led` / `led`)**:
  - In `addons/ulux/app/src/handlers/command.js` die Befehlsauswertung so gestalten, dass sowohl `set_led` als auch `led`, `set_page` als auch `page`, `set_text` als auch `text` gleichermaßen akzeptiert werden.
- [x] **2.3 ControlFlag `PageChangeRequest` Handshake (konfigurierbarer Hook)**:
  - Beim Startup kann mit `page_change_request_flag` ein zusätzlicher UMP-
    ControlFlag gesetzt werden, damit lokale Seitenwechsel an die Bridge
    gemeldet werden können.
  - Der Standardwert bleibt `0`, weil das konkrete Bit hardwareabhängig noch
    bestätigt werden muss; der Hardware-Abnahmetest bleibt offen.

---

### 🟠 Phase 3: HACS `ulux_display` Erweiterung & GeekMagic Update (Option B) (P2)
- [ ] **3.1 GeekMagic v1.0.0 Backport (Pillow-kompatibel)**:
  - Portierung der Widget-Logik für `datetime.py` (flexible Formatierung, Trennung von Datum und Uhrzeit).
  - Portierung der Card- und Layout-Helfer (`_cardfit.py`, `_textfit.py`) zur dynamischen Textanpassung auf dem 86x90 u::lux-Display.
  - Bereitstellung moderner Farbmodi und Styles (WatchOS, Blueprint, StandBy etc.) im Pillow-Renderer.
- [x] **3.2 Dual-Triggering für Tasten in HACS**:
  - In `custom_components/ulux_display/entities/binary_sensor.py` die Taster-Entitäten `key_1` bis `key_4` sowohl auf `ulux_key` / `ulux_key_action` als auch auf `ulux_value` (`EditValue` `0x42`) reagieren lassen.
- [x] **3.3 Page-Triggered Display Streaming**:
  - Coordinator überwacht das aktive Seiten-Event `ulux_page`.
  - Wenn die aktuelle Schalterseite mit der in den Optionen konfigurierten `stream_page` (z. B. Seite 8 / Aktor 23) übereinstimmt, Rendering-Loop starten.
  - Verlässt der Anwender die Seite, Rendering stoppen (Bandbreiten- und CPU-Schonung).
- [ ] **3.5 Physische Taster-Events eindeutig zuordnen**:
  - In u::luxConfig die vier Tasten testweise auf den echten `ID_EVENT`-/
    Automatisch-Pfad konfigurieren.
  - Pro Taste `make`/`break` beziehungsweise `ulux_key` mit `key=1..4`
    nachweisen.
  - `EditValue(actor=10)` nicht mehr per Modulo als einzelne Taste
    interpretieren; diesen Pfad nur als Actor-Wert behandeln.
- [ ] **3.4 Periodische HA-Snapshots auf fester Seite (Use Case 1)**:
  - Von `ulux_display` gerenderte Sensor-/Statusbilder alle paar Sekunden an
    die konfigurierte u::lux-Seite senden.
  - Snapshot-Rate und Zielseite konfigurierbar machen; kein permanenter
    Video-Lifecycle fuer reine Sensorwerte.
  - `cmd/image` als eigener API-Pfad vorbereiten; bis zur Wireformat-
    Bestaetigung den validierten VideoFrame-Transport nur als Fallback nutzen.
  - HACS verwendet fuer `stream_page` die sichtbare Seitennummer (Seite 2 =
    `stream_page: 2`); die Bridge verwendet im UMP-Payload den nullbasierten
    `page_index: 1`.
  - HACS-Renderloop, Rate-Limit und Stop bei Seitenwechsel sind implementiert;
    der Hardware-Abnahmetest steht noch aus.

---

### 🔵 Phase 4: Audio, Radio & Intercom (P3)
- [ ] **4.1 Radio- & Medien-Steuerung (Use Case 2)**:
  - Webradio-/HA-Media-Player-Stream ueber den Remote-Audiopfad abspielen.
  - Play, Stop, Next, Lautstaerke und Quellenwahl in HA bereitstellen.
  - Sendername, Interpret und Titel ueber `ID_TEXT` anzeigen; Metadaten und
    Audio-Session muessen gemeinsam beendet werden.
- [ ] **4.2 u::lux-zu-u::lux Intercom Cross-Connect (Use Case 6)**:
  - Implementierung eines Audio-Bridge-Moduls in Node.js (UDP Port 35000 / 35004).
  - Bei Auslösung eines Rufs (z. B. „Küche ruft Werkstatt“) Gong auf Zielgerät abspielen, Bidirektionalen PCM/G.711 Stream zwischen Schalter A und B vermitteln.
- [ ] **4.2b Media Assistant als HA-Audioziel**:
  - Remote-Audio fuer Radio, TTS und Medien ueber die HA-`media_player`-
    Entitaet ausgeben.
  - Play/Stop/Pause/Lautstaerke, Quellenwechsel, Metadaten und Jitterpuffer
    validieren; lokale Sounds bleiben separat.
- [ ] **4.3 Türklingel-Integration (Use Case 4)**:
  - Bei Klingel-Event Gong auf u::lux abspielen, Schalter auf Video-Tür-Seite umschalten.
  - Türöffner-Taste auf Aktor-Befehl legen.
- [ ] **4.3b SIP-Tuerstationsadapter**:
  - SIP/RTP-Signalisierung einer Tuerstation annehmen oder an eine externe
    SIP-Komponente delegieren.
  - Klingeln, Zweiweg-Audio, Video-Session, Tueroeffner und Auflegen als
    gemeinsame Session abbilden.

---

### 🟣 Phase 5: Video-Streaming & Wyoming Voice Assist (P4)
- [ ] **5.1 Kamera- / CCTV-Streaming auf Display (Use Case 5)**:
  - Beliebige Videoquelle (RTSP, MJPEG oder HTTP-URL) abgreifen, auf die
    dynamischen `VideoState`-Grenzen skalieren und als UMP `VideoStream`
    uebertragen.
  - `VideoStart`, ACK-basierte Chunks, definierte FPS und `VideoStop`
    implementieren.
- [ ] **5.1b Video + Audio Tuerstation (Use Case 4)**:
  - Video- und Audiostream gemeinsam auf einer konfigurierten Seite starten.
  - Audio UDP 35000/35004 mit dem Video-Lifecycle koppeln und bei Stop,
    Seitenwechsel oder Standby sauber beenden.
- [ ] **5.2 Wyoming Voice Assist Satellit (Use Case 7)**:
  - Bridge-Modul für Wyoming-Protokoll auf TCP Port 10700.
  - Push-To-Talk (PTT): Taste gedrückt halten (`make`) startet Mikrofon-Streaming (UDP 35000), Loslassen (`break`) beendet Aufnahme und HA Voice antwortet über Schalterlautsprecher.
  - Assist-Sprachbefehle muessen auch bei aktiver Display-/Medienseite
    gestartet, abgebrochen und sauber beendet werden koennen.

---

### ⚪ Phase 6: Bereinigung & Dokumentation (P5)
- [ ] **6.1 First-Scan-Refresh und Pending-Merge stabilisieren**:
  - Der erste Discovery-Scan soll alle empfangenen Sync-Daten ohne zweiten
    Klick oder manuellen Seiten-Refresh anzeigen.
  - Auswahl und Eingabefokus muessen waehrend eines laufenden Scans erhalten
    bleiben.
  - Pending-Eintraege und neue Discovery-Antworten muessen in einem Durchlauf
    korrekt zusammengefuehrt werden.
- [ ] Nicht benötigte Markdown-Dateien bereinigen (z. B. `docs/external/thu_may_07_2026_how_to_implement_binary_search_in.md`).
- [ ] `.gitignore` Schreibweise für `docs/Gemini Notebook/` anpassen.
- [ ] Versions-Bump und Dokumentation in `CHANGELOG.md` für Bridge und HACS-Komponente.
