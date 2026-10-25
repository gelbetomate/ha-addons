# u::lux Funktionsvergleich: Digitalstrom-Bedienkonzept und HA

Diese Auswertung beschreibt, welche Funktionen aus der Digitalstrom-
Beschreibung in der nativen u::lux-Integration, im UMP-Bridge-Add-on oder
ueber MQTT uebernommen werden koennen. Digitalstrom-spezifische Server-
Funktionen werden dabei nicht als vorhandene u::lux-Protokollfunktion
behandelt.

## Vergleich

| Digitalstrom-Funktion | HA-/u::lux-Ziel | Stand | Uebernahme |
|---|---|---|---|
| Vier Kacheln pro Bildschirmseite | Vier feste Layoutbereiche und vier physische Tasten | Renderer und Layouts vorhanden; Seitenwechsel vorhanden | Direkt uebernehmen und mit HA-Entitaeten befuellen |
| Bis zu zehn Seiten | Physische u::lux Pages | Bridge liest PageCount; Testgeraet meldet 8 Seiten | Direkt verwenden; Grenze kommt vom Geraet |
| Kachel ruft Funktion auf | Actor-/Entity-Aktion | Actor-Werte, Seite und Services vorhanden | Ueber HA-Service, Automation und MQTT abbilden |
| Multifunktions-Kachel | Kachel mit Status, Klick und Detailansicht | Teilweise ueber Pillow-Layouts und Widgets | Als HA-Layout-/Widget-Konzept weiterfuehren |
| Kurz-, Langdruck und Loslassen | `hit`, `make`, `break` | Bridge erzeugt die Ereignisse aus Press/Release; Switch sendet aktuell noch kein `ID_EVENT` | Nach u::lux-Tastenkonfiguration direkt nutzbar |
| Detailbildschirm nach Langdruck | Zweite HA-Ansicht oder Seite | Renderer kann Ansichten darstellen; automatische Umschaltung fehlt | Als konfigurierbare Seiten-/View-Aktion uebernehmen |
| Dimmen durch langen Tastendruck | Number-/Actor-Wert inkrementieren | Actor-Wert-API vorhanden; physische KeyAction fehlt | Nach Event-Nachweis als HA-Automation umsetzen |
| Einzelfunktions-Kachel | Fester HA-Service oder Actor-Befehl | Services fuer Seite, Audio, LED, Text und Werte vorhanden | Direkt uebernehmen |
| Joker-Kachel | Freie HA-Automation / MQTT-Command | MQTT-Command-API und HA-Events vorhanden | Als Automation-Trigger und frei waehlbares Command-Topic umsetzen |
| Bis zu 12 Funktionen im Joker-Detail | Service-/Script-Auswahl | Noch keine native Auswahlansicht | Als HA-Script-Auswahl oder konfigurierbares Widget umsetzen |
| Kachelbeschriftung | Text-/Label-Widget | Pillow-Text und Textoverlay vorhanden | Direkt uebernehmen |
| Seitenmitte mit Temperatur, Feuchte, Anwesenheit, Wetter oder Freitext | Zentrales Info-Widget | Widgets, Sensoren und Text vorhanden | Direkt uebernehmen |
| Sprache Deutsch/Englisch | Integrations-/Layoutsprache | Keine native u::lux-Sprachumschaltung | HA-Translations und Layouttexte verwenden |
| Taster-Klick-Sound abschalten | Sound-/Event-Einstellung | Lokaler Sound und Stop vorhanden | Als Einstellung oder Automation umsetzen |
| Taster-LEDs abschalten | LED-Farbe `off` oder Override | LED-Kodierung vollstaendig bekannt | Direkt ueber LED-Service/MQTT umsetzen |
| Bewegungsmelder-LED abschalten | RGB-LED des Add-ons | Funktion dokumentiert, UMP-Payload unbekannt | Erst nach Add-on-LED-Mitschnitt uebernehmen |
| Tag-/Nachtmodus | Zeit-/Sonnenstandsprofil | Themes und HA-Zeitsteuerung vorhanden | Als HA-Automation plus Layoutprofil umsetzen |
| Aktive/inaktive Bildschirmhelligkeit | Display brightness / screensaver | Wake/Standby vorhanden; Helligkeit noch nicht als UMP-Befehl bestaetigt | Nach Brightness-Payload oder Konfigurationsweg umsetzen |
| Annaherung aktiviert Display | State `proximity` und Activate | State-Decoding und Activate vorhanden; Events fehlen aktuell | Mit `ID_STATE`-Polling bereits vorbereitbar |
| Ruhebildschirm mit Temperatur/Feuchte/Text | Standby-Layout | Themes, Widgets und Active-Switch vorhanden | Direkt als Standby-Layout umsetzen |
| Alarm/Panik/Feuer-Popups | HA-Alarm-/Fire-/Panic-Events | Allgemeine Notification-/Textpfade vorhanden | Als HA-Event/Automation und Popup-Layout umsetzen |
| Signalton fuer Alarm, Klingeln, Kommen/Gehen | Lokale Sounds mit Lautstaerke/Wiederholung | PlayLocal, Stop, Volume und Wiederholung vorhanden | Direkt ueber HA-Service und MQTT umsetzen |
| Liste von 34 eingebauten Toenen | Sound-Auswahl | Sound-Index ist vorhanden; Soundkatalog unbekannt | Namen/Indizes nach TestCenter-Mapping dokumentieren |
| Temperatur-/Feuchte-Kalibrierung | Sensor-Offset | Werte werden korrekt gelesen; Kalibrierbefehl unbekannt | Als HA-Korrekturwert abbilden, nicht in das Geraet schreiben |
| Temperatur-/Feuchte-/CO2-Add-ons | Sensoren | I2C-Kanaele vorhanden; CO2 bei aktueller Hardware unavailable | Direkt unterstuetzen und Valid-Flag respektieren |
| Bewegungs-Add-on | Motion Binary Sensor | State-Bits vorhanden; MD+RH+TEMP bestaetigt | Direkt uebernehmen; Push-/Polling-Verhalten weiter testen |
| Eigene Sounds laden | Upload in das Geraet | UMP-Upload nicht bekannt; Handbuch schliesst eigene Toene aus | Nicht einplanen; vorhandene Sound-IDs verwenden |
| Bild-/Videostream auf einer Kachel | RGB565-Stream mit konfiguriertem Video-Actor | Referenzprojekt bestaetigt Actor 23, VideoState/VideoStart und 16-Byte Chunk-Metadaten; Bridge sendet diese Struktur jetzt | Dynamische VideoState-Grenzen und Seitenablauf noch weiter integrieren |
| Konfiguration ueber Hersteller-App | Design-/Actor-Konfiguration | Nicht Teil der HA-Integration | Nicht nachbauen; HA steuert die Laufzeitwerte |

## Anforderungen der HA-Integration

Die Digitalstrom-Beschreibung bestaetigt, dass folgende Anforderungen sinnvoll
und ohne Digitalstrom-Server umsetzbar sind:

1. Seiten mit vier Kacheln und zentraler Information.
2. HA-Entitaeten und Services als Kachelquellen.
3. Text, Temperatur, Feuchte, Bewegung und Wetteranzeige.
4. Wake/Standby, Seitenwechsel, Audio, Lautstaerke und lokale Sounds.
5. Switch-LEDs mit Farbe, Blinkmodus und Override.
6. HA-Automationen fuer Joker-, Alarm-, Kommen-/Gehen- und Szenenaktionen.
7. MQTT als zusaetzlicher Command-/Event-Kanal fuer Node-RED.
8. Standby-/Nachtprofile ueber HA-Zeitsteuerung und Layouts.

## Nicht mit dem Dokument verwechseln

Die Digitalstrom-Funktionsgruppen Licht, Schatten, Markise, Heizung,
Ventilation, Anwesenheit und Joker sind Bedien- und Integrationskonzepte. Sie
sind keine zusaetzlichen UMP-Nachrichten. In Home Assistant werden sie durch
beliebige Entities, Services und Automationen modelliert.

Die Aussage, dass das Geraet bis zu acht IDs im System registriert, passt zu
den im TestCenter beobachteten Actor-/ID-Listen. Diese IDs muessen als
konfigurationsabhaengig behandelt werden; sie sind nicht automatisch feste
Text- oder Sensor-IDs.

## Empfohlene Reihenfolge

1. MQTT-Command-/Event-Paritaet zu den vorhandenen HA-Services fertigstellen.
2. Kachel-/Zentralinfo-Layouts als dokumentierte HA-Konfiguration stabilisieren.
3. Tastenevents mit dem u::lux-Design testen und `hit`/`make`/`break` fuer
   Automationen verwenden.
4. Soundindexe und LED-/Nachtprofile als HA- und MQTT-Beispiele dokumentieren.
5. MQTT Discovery mit nativer-Integration-Deduplizierung umsetzen.
6. Erst danach Add-on-RGB-LED, Helligkeitssteuerung, IR und Remote-Audio
   untersuchen.
