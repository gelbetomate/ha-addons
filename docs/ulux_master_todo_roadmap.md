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
- [x] **2.1 UDP Frame Pacing / LED-Bursting Fix (`ID_LED` `0x44`)**:
  - Bei 4-Kanal-LED-Befehlen nicht mehr ein einzelnes 48-Byte-Datagramm senden.
  - Aufteilung in 4 separate UDP-Telegramme für die LED-Indizes 0, 1, 2, 3 mit 5–10 ms Verzögerung (`inter_packet_delay_ms`), damit der u::lux-Puffer alle 4 LEDs schaltet.
- [x] **2.2 MQTT Command Normalisierung (`set_led` / `led`)**:
  - In `addons/ulux/app/src/handlers/command.js` die Befehlsauswertung so gestalten, dass sowohl `set_led` als auch `led`, `set_page` als auch `page`, `set_text` als auch `text` gleichermaßen akzeptiert werden.
- [ ] **2.3 ControlFlag `PageChangeRequest` Handshake**:
  - Workaround 2 für lokale Navigation: Beim Startup in den UMP ControlFlags `PageChangeRequest` setzen, damit der Taster auch bei lokaler Menünavigation Seitenänderungen an die Bridge meldet.

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

---

### 🔵 Phase 4: Audio, Radio & Intercom (P3)
- [ ] **4.1 Radio- & Medien-Steuerung (Use Case 2)**:
  - Text-Aktoren via `ID_TEXT` (`0x61`) mit Sendernamen, Interpret und Titel beschicken (Platzhalter `<TEXT.0>` .. `<TEXT.9>`).
  - Vollständige Tastensteuerung in HA (Taste 1: Play/Pause, Taste 2: Next, Taste 3/4: Volume Up/Down).
- [ ] **4.2 u::lux-zu-u::lux Intercom Cross-Connect (Use Case 6)**:
  - Implementierung eines Audio-Bridge-Moduls in Node.js (UDP Port 35000 / 35004).
  - Bei Auslösung eines Rufs (z. B. „Küche ruft Werkstatt“) Gong auf Zielgerät abspielen, Bidirektionalen PCM/G.711 Stream zwischen Schalter A und B vermitteln.
- [ ] **4.3 Türklingel-Integration (Use Case 4)**:
  - Bei Klingel-Event Gong auf u::lux abspielen, Schalter auf Video-Tür-Seite umschalten.
  - Türöffner-Taste auf Aktor-Befehl legen.

---

### 🟣 Phase 5: Video-Streaming & Wyoming Voice Assist (P4)
- [ ] **5.1 Kamera- / CCTV-Streaming auf Display (Use Case 5)**:
  - HA-Kamerabild (RTSP / MJPEG) abgreifen, auf 86x90 px RGB565 skalieren und als UMP `VideoStream` (0xA3) Frames senden (max. 5 Zeilen/Paket).
- [ ] **5.2 Wyoming Voice Assist Satellit (Use Case 7)**:
  - Bridge-Modul für Wyoming-Protokoll auf TCP Port 10700.
  - Push-To-Talk (PTT): Taste gedrückt halten (`make`) startet Mikrofon-Streaming (UDP 35000), Loslassen (`break`) beendet Aufnahme und HA Voice antwortet über Schalterlautsprecher.

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
