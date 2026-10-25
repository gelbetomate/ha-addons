# u::lux MQTT Arbeitsplan

MQTT ist eine zusaetzliche Schnittstelle. Die native `ulux_display`-Integration
bleibt der bevorzugte Home-Assistant-Weg fuer Config Entries, Entitaeten und
Rendering. MQTT soll dieselben bestaetigten Steuerfunktionen fuer Node-RED,
andere Automationssysteme und externe Clients bereitstellen.

## Ist-Stand

Bereits vorhanden:

- MQTT-Verbindung mit Host, Port, Benutzer, Passwort und Base Topic.
- Ereignisse fuer Sensoren, State, Seiten, Werte, Tasten, LEDs, IR und Video.
- Befehle fuer Seite, Wake/Standby, LEDs, Text, Actor-Werte und Audio.
- Registry-Befehle fuer `add_device`, `update_device` und `delete_device`.
- Persistente Bridge-Registry unter `/data/registry.json`.
- Erste MQTT Discovery fuer IP, Seriennummer und Protokoll-ID.

Noch nicht vollstaendig:

- Alle HA-Services als einheitlicher MQTT-Befehlssatz.
- MQTT Discovery fuer alle Sensoren, Binary Sensors, Schalter, Buttons und
  Audio-/Video-Funktionen.
- Deduplizierung gegen bereits durch `ulux_display` angelegte HA-Geraete.
- Eine UI-Funktion zum manuellen Publizieren eines MQTT-Events oder Befehls.
- Retained State, Verfuegbarkeit und sauberes Entfernen aller Discovery Topics.

## Ziel-Topic-Vertrag

Base Topic ist standardmaessig `ulux`. Der Geraeteteil eines Topics verwendet
ausschliesslich eine Seriennummer, zum Beispiel `serial_456`. Wenn nur eine
unbestaetigte `serial_number_candidate` vorliegt, wird auch diese verwendet.
Wenn keine Seriennummer bekannt ist, lautet der Schluessel `unresolved`; MAC-
Adressen, IP-Adressen und UMP-Protokolladressen werden nie als MQTT-
Geraeteidentitaet verwendet.

### Status und Ereignisse

```text
ulux/<switch_id>/state
ulux/<switch_id>/sensor/<type>
ulux/<switch_id>/page
ulux/<switch_id>/event/key
ulux/<switch_id>/event/key_action
ulux/<switch_id>/event/led
ulux/<switch_id>/event/ir
ulux/<switch_id>/event/video
ulux/<switch_id>/availability
```

JSON-Payloads werden bevorzugt. Einfache Zustandswerte koennen zusaetzlich
als `.../state`-Untertopic fuer einfache MQTT-Clients publiziert werden.

### Befehle

```text
ulux/<switch_id>/cmd/page
ulux/<switch_id>/cmd/activate
ulux/<switch_id>/cmd/led
ulux/<switch_id>/cmd/text
ulux/<switch_id>/cmd/value
ulux/<switch_id>/cmd/audio/play
ulux/<switch_id>/cmd/audio/stop
ulux/<switch_id>/cmd/audio/volume
ulux/<switch_id>/cmd/video/start
ulux/<switch_id>/cmd/video/stop
ulux/<switch_id>/cmd/raw
```

Die Payloads sollen den HA-Serviceparametern entsprechen. Damit kann Node-RED
dieselben Operationen verwenden wie Home Assistant, ohne UMP-Pakete selbst
bauen zu muessen.

Beispiel LED:

```json
{"actor_id":1,"leds":[{"color":1,"blinkMode":0,"override":true}]}
```

Vollstaendiges Beispiel fuer alle vier Switch-LEDs:

Topic:

```text
ulux/00:50:C2:73:03:14/cmd/led
```

Payload:

```json
{
   "actor_id": 1,
   "leds": [
      {"color": 1, "blinkMode": 0, "override": true},
      {"color": 2, "blinkMode": 0, "override": true},
      {"color": 4, "blinkMode": 0, "override": true},
      {"color": 7, "blinkMode": 0, "override": true}
   ]
}
```

Das gleiche Beispiel als Home-Assistant-Aktion:

```yaml
action: ulux_display.set_led
data:
   device_id: DEINE_HA_DEVICE_ID
   actor_id: 1
   leds: >-
      [{"color":1,"blinkMode":0,"override":true},
       {"color":2,"blinkMode":0,"override":true},
       {"color":4,"blinkMode":0,"override":true},
       {"color":7,"blinkMode":0,"override":true}]
```

Die Werte bedeuten LED 1 rot, LED 2 gruen, LED 3 blau und LED 4 weiss.
Die Nummern entsprechen der UMP-Reihenfolge; die physische Eckposition muss
einmalig mit diesem Farbmuster zugeordnet werden.

Die Bridge wandelt die vier Listeneintraege in vier einzelne `ID_LED`-
Nachrichten mit `LEDIndex=0..3` um. Das entspricht dem nachgewiesenen
Loxone-Befehlsschema.

Beispiel Text:

```json
{"actor_id":1,"text_id":5,"text":"Test","visible":true}
```

## MQTT Discovery und Deduplizierung

MQTT Discovery wird nur aktiviert, wenn `mode.mqtt_discovery=true` gesetzt ist.

Der Bridge-Registry-Eintrag bekommt einen eindeutigen Identitaetsschluessel:

```text
ulux:<switch_id>
```

Regel fuer Home Assistant:

1. Wenn der Registry-Eintrag bereits `linked_entry_id` aus der nativen
   `ulux_display`-Integration besitzt, publiziert die Bridge keine MQTT-
   Discovery-Geraete fuer diesen Switch.
2. Wird ein Switch nachtraeglich nativ verknuepft, publiziert die Bridge
   retained leere Config-Payloads fuer die MQTT-Discovery Topics und entfernt
   die MQTT-Duplikate.
3. Wird die native Verknuepfung entfernt und MQTT Discovery ist aktiv, darf die
   Bridge die Discovery-Konfiguration erneut publizieren.
4. MQTT Discovery verwendet dieselbe `unique_id`-/Identifier-Konvention fuer
   alle Entitaeten eines Geraets.

Damit kann MQTT parallel fuer externe Systeme aktiv sein, ohne doppelte
Geraete in Home Assistant anzulegen.

## Geplante Discovery-Entitaeten

- Temperatur, Feuchte, Lux, CO2, VOC und IN2.
- Bewegung, Naeherung, Display aktiv, Audio aktiv, Fehler und Tasten 1-4.
- LED-Status 1-4.
- Page und PageCount.
- Volume und Media-Player-Steuerung.
- Buttons fuer Wake, Standby, Sound, Seite und Stream Stop.
- Verfuegbarkeit mit Last-Will/retained Availability.

Nicht vorhandene Hardware bleibt `unavailable`; Discovery darf keine CO2- oder
VOC-Werte vortaeuschen.

## Bridge-Oberflaeche

Die Standalone-Weboberflaeche ist der HTTP-Root-Endpunkt:

```text
http://<bridge-host>:8099/
```

Umgesetzt in Bridge `0.5.92`:

- MQTT-Verbindungsstatus und aktiver Base Topic.
- Laufzeitumschaltung zwischen HA-Events, MQTT und Parallelbetrieb.
- Laufzeitkonfiguration fuer Broker Host, Port, Benutzer, Passwort und Base Topic.
- Persistenz dieser Werte in der aktiven Optionsdatei.
- Auswahl eines konkreten Zieltopics.
- JSON-Payload-Editor.
- Aktionen `Publish to MQTT` und `Publish retained state`.

Weitere geplante UI-Funktionen:

- Auswahl eines Switches mit Topic-Vorlagen fuer Events und Commands.
- JSON-Payload-Editor mit Payload-Vorschau.
- Warnung vor retained Messages und Button zum Loeschen eines Topics.
- Anzeige, ob native HA-Verknuepfung besteht und MQTT Discovery deshalb
  unterdrueckt wird.

Die UI darf keine geheimen MQTT-Passwoerter anzeigen.

## Standalone-Docker

Im Verzeichnis `addons/ulux`:

```powershell
Copy-Item options.example.json options.json
# options.json anpassen, insbesondere switch IP, MQTT und Ports
docker compose up -d --build
```

Die Oberflaeche ist danach unter `http://<docker-host>:8099/` erreichbar.

Voraussetzungen:

- Docker Compose.
- `network_mode: host` muss erhalten bleiben.
- UDP `34984` fuer Discovery und `34988` fuer UMP muessen erreichbar sein.
- Fuer Audio zusaetzlich UDP `35000` und `35004`.
- Fuer MQTT muss der Broker vom Container aus erreichbar sein.

Logs:

```powershell
docker compose logs -f ulux-bridge
```

## Reihenfolge der Umsetzung

1. Einheitlichen MQTT-Befehlssatz auf alle bestaetigten HA-Funktionen erweitern.
2. Retained Availability und vollstaendigen State-Publish einfuehren.
3. MQTT Discovery auf alle bestaetigten Entitaeten erweitern.
4. Deduplizierung anhand `linked_entry_id` und retained Discovery Cleanup.
5. UI-Tab `MQTT` mit Publish-/Command-Tester ergaenzen.
6. Standalone-Docker mit einem reproduzierbaren Smoke-Test pruefen.
7. Erst danach IR, Add-on-RGB-LED, Remote-Audio und vollstaendigen Video-Stream
   als optionale Erweiterungen aufnehmen.
