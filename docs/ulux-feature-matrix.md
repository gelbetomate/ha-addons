# u::lux Funktionsmatrix

Grundlage sind die verifizierten UMP-TestCenter-Mitschnitte und die aktuell
implementierte Bridge-/HA-Funktionalitaet.

## Hardwareprofil

Fuer die aktuelle Installation ist das Add-on `MD+RH+TEMP` dokumentiert. Damit
sind Bewegung, Temperatur und relative Luftfeuchte verfuegbar. Ein CO2-Sensor
gehoert zu einem separaten Add-on und wird daher unterstuetzt, aber auf dieser
Hardware korrekt als `unavailable` behandelt.

Die vier Status-LEDs des u::lux Switches sind von der RGB-LED des
Bewegungs-Add-ons zu unterscheiden. Die Switch-LEDs werden ueber `ID_LED
(0x44)` gesteuert. Das Add-on-Handbuch beschreibt die RGB-LED als frei
programmierbare Bewegungsanzeige, dokumentiert aber keinen separaten UMP-Befehl
dafuer.

## u::lux-Funktionen

| u::lux-Funktion | Bedeutung | UMP-/Bridge-Stand | HA-Stand |
|---|---|---|---|
| `ULUX.key` | Tastenereignis `hit`, `make`, `break` | `ID_EVENT (0x51)` mit Press/Release vorhanden | Key 1-4 Binary Sensor und `ulux_key`; Long-Press-Klassifizierung fehlt |
| `ULUX.sound` | Lokalen Sound abspielen | `ID_AUDIO_PLAYLOCAL (0x98)` V2.32 | `media_player`/Bridge-Chime vorhanden |
| `ULUX.screensaver` | Wake/Standby | `ID_ACTIVATE (0x2D)` vorhanden | Active-Switch vorhanden |
| `ULUX.page` | Physische Seite auswählen | `ID_PAGEINDEX (0x2E)` funktioniert mit V2.32 | Bridge UI und Next/Previous-Fallback vorhanden |
| `ULUX.led` | LED-Farbe und Blinkmodus setzen | `ID_LED (0x44)`: Farbe Bits 0-2, Blinkwert Bits 4-6, Override Bit 7 | Service/API vorhanden; Status liefert Namen und Rohwerte |
| `ULUX.text` | Textoverlay über Actor/Text-ID | `ID_TEXT (0x45)` bestätigt | Bridge API vorhanden; dedizierter HA-Service fehlt |
| `ULUX.volume` | Lautstärke setzen und Änderungen melden | `0x91` Volume, `0x92` Stop bestätigt | `media_player`-Lautstärke vorhanden |
| `ULUX.brightness` | Raumhelligkeit in Lux | `ID_LUX (0x03)` antwortet im aktuellen Mitschnitt mit `0 lux, Valid=0` | Illuminance-Sensor vorhanden, unavailable bei `Valid=0` |
| `ULUX.motion` | Bewegungsmelder | `I2C-MotionDet.` / UMP-State- und Eventpfad; kommt vom Add-on | Motion Binary Sensor vorhanden |
| `ULUX.temperature` | Temperatur | `I2C-Temp`, `0x71`; kommt vom Add-on | Temperature Sensor vorhanden |
| `ULUX.humidity` | Luftfeuchtigkeit | `I2C-Humidity`, `0x72`; kommt vom Add-on | Humidity Sensor vorhanden |
| `ULUX.CO2` | CO2-Konzentration | `I2C-CO2`, `0x73`; separates optionales Add-on, beim getesteten Gerät `Valid=0` | CO2 Sensor vorhanden, unavailable bei `Valid=0` |
| `ULUX.input1` | Binäreingang 1 | `I2C-IN2`, `0x74`; separates optionales Add-on, beim getesteten Gerät `Valid=0` | Input 1 Binary Sensor vorhanden |
| `ULUX.input2` | Binäreingang 2 | `I2C-IN2`, `0x74`; separates optionales Add-on, beim getesteten Gerät `Valid=0` | Input 2 Binary Sensor vorhanden |

## Bereits zuverlässig bestätigt

- UMP-Initialisierung mit State/Control/PageCount/PageIndex.
- Device-ID `1`, Frame-Version V2.32 (`0x0232`) und Design-Kontext.
- DateTime-Synchronisierung mit konfigurierter Europe/Berlin-Zeitzone.
- Physische Seiten 0 bis 7.
- Wake/Standby.
- Lokaler Chime mit V2.32-Audio-IDs.
- Textoverlay mit Actor 1/Text-ID 5.
- Temperatur, Luftfeuchte und Bewegung ueber das `MD+RH+TEMP`-Add-on (`I2C-*`).
- Tasten-State-Frames mit `KeyState`-Bitfeld.
- LED-Statusantworten mit Farb-/Blink-/Override-Bits.
- LED-Farbwerte `0..7` und Blinkwerte `0, 16, 32, 48, 64, 80, 96, 112`.
- Der TestCenter-Anfragekatalog fuer Lux, Signature, I2C-Sensoren, IR und Audio.
- Video-Abfragen `ID_VIDEO_STATE (0xA1)` und `ID_VIDEO_START (0xA2)` sind im
	V2.32-TestCenter sichtbar; eine vollstaendige Stream-Bestaetigung steht noch
	aus.

## Noch offen

### Tastendauer

Die u::lux-Tasten unterscheiden:

- `hit`: kurzer Tastendruck unter einer Sekunde
- `make`: langer Tastendruck über einer Sekunde
- `break`: Loslassen

UMP liefert im aktuellen Pfad Press/Release. `hit` und `make` müssen in der Bridge aus Press-Dauer und Release-Ereignis abgeleitet werden. Das Zeitfenster sollte konfigurierbar sein, zunächst `1000 ms`.

### LED-Kodierung

Die Kodierung ist jetzt festgelegt:

- `128` (`0x80`) aktiviert die externe Steuerung/Override.
- Bits 0-2: `0=off`, `1=red`, `2=green`, `3=yellow`, `4=blue`, `5=magenta`, `6=cyan`, `7=white`.
- Bits 4-6: `0=permanent`, `16=slow`, `32=medium`, `48=fast`, `64=1/2s on, 1/4s off`, `80=1/2s on, 4s off`, `96=1/2s on, 16s off`, `112=1/2s on, 32s off`.

Beispiel: `128 + 0 + 1 = 129` bedeutet Override, permanent ein, rot.

### IR

`ID_IR (0x81)` wird angefragt. Eine bestätigte Antwort-Payload liegt noch nicht vor; die Bridge veröffentlicht unbekannte Antworten deshalb als `ulux_ir` mit Roh-Hex.

### Lux

Der u::lux Switch besitzt den separaten, nicht als `I2C-*` markierten
Ambient-Light-Kanal `0x03`. Im aktuellen Mitschnitt antwortet der Switch trotz
der geaenderten Konfiguration mit `LUX=0 lux, Valid=0`. Home Assistant muss den
Sensor deshalb als `unavailable` darstellen. Die Option `Intelligenter
Helligkeitssensor` kann den Wert zusaetzlich einfrieren, erklaert aber diesen
konkreten `Valid=0`-Befund nicht allein. Der Loxone-Wert kann als Vergleich
dienen, ersetzt aber nicht die UMP-Messung.

### RGB-LED des Bewegungs-Add-ons

Das MD+RH+TEMP-Add-on besitzt laut technischer Beschreibung eine frei
programmierbare RGB-LED fuer den Bewegungsstatus. Die bisher bekannten UMP-
Nachrichten beschreiben dagegen die vier LEDs am Switch. Fuer die Add-on-LED
fehlt noch eine bestaetigte Payload oder ein aufgezeichnetes Steuertelegramm.
Sie wird daher nicht faelschlich ueber `ID_LED (0x44)` angesprochen.

### HA-Serviceoberfläche

Die Bridge-API kann bereits Page, Activate, Audio, LED und Text. Für eine vollständige HA-Oberfläche fehlen noch dedizierte Services:

- `ulux_display.play_sound`
- `ulux_display.set_led`
- `ulux_display.set_text`
- `ulux_display.set_page`
- `ulux_display.set_volume`

Der bestehende `media_player` deckt Audio und Lautstärke teilweise ab.

## Testplan für die Restlücken

1. Jede Taste kurz drücken und nach mindestens einer Sekunde loslassen; Zeitstempel von Press/Release notieren.
2. Jede Taste lange halten und loslassen; prüfen, ob dieselbe Taste getrennt als `make`/`break` erkennbar ist.
3. Je LED die acht Farbwerte und acht Blinkwerte setzen und die Rückmeldung vergleichen.
4. IR-Anfrage mit und ohne tatsächliches IR-Signal durchführen und TX/RX-Hex sichern.
5. Lux-Sensor gezielt mit einer hellen/dunklen Umgebung testen; bei `Valid=0` bleibt der Sensor unavailable.
