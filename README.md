# EasyBike Vienna

Fahrradverleih-App – in Zusammenarbeit von Hübner, Zekjiri, Muriqi.

Die App liest den Fahrradbestand aus `data/bikes.csv` ein. Die Fahrräder lassen sich nach Farbe, Typ, Marke, Status und Preis filtern und sortieren, wahlweise auf der Website oder in der Kommandozeile. Beide benutzen dieselbe Funktion `queryBikes()` aus `src/query.js`.

## Voraussetzungen

- [Node.js](https://nodejs.org/) 22 oder neuer (prüfen mit `node --version`)
- Keine weiteren Abhängigkeiten, `npm install` ist nicht nötig

## Website starten

```bash
npm run web
```

Danach im Browser öffnen:

- Kundenansicht: <http://localhost:3000>
- Verwaltung: <http://localhost:3000/admin>
- Algorithmus direkt als JSON: <http://localhost:3000/api/bikes?typ=E-Bike&sort=preis>

Beenden mit `Strg+C` im Terminal. Ist Port 3000 belegt, einen anderen wählen: in PowerShell `$env:PORT=3001; npm run web`. Meldet PowerShell, dass `npm.ps1` nicht geladen werden kann, stattdessen `npm.cmd run web` oder `node src/server.js` verwenden. Der Server ist nur auf diesem Rechner erreichbar (127.0.0.1).

### Was die Website kann

- **Kundenansicht:** alle Fahrräder als Karten, links die Filter (Typ, Preis pro Stunde, Verfügbarkeit, Marke, Farbe) mit der Anzahl passender Räder pro Option, oben die Sortierung (alle 6 Felder, auf- und absteigend). Aktive Filter stehen als Chips über der Liste. Freie Räder lassen sich reservieren: Das ist eine **Demo**, der Preis wird berechnet, aber nichts gespeichert.
- **Verwaltung:** Kennzahlen pro Status (anklickbar als Filter), dieselben Filter und eine Tabelle, die man über die Spaltenköpfe sortiert.
- **Nachweis:** Unter „So prüft ihr das Ergebnis“ steht der CLI-Befehl, der genau dieselben Räder in derselben Reihenfolge liefert, und ein Link auf die Rohdaten als JSON.
- Der Filterzustand steht in der Adresszeile (z. B. `/?farbe=Rot&farbe=Blau&sort=preis`). Jede Ansicht lässt sich also als Link speichern, und der Zurück-Button funktioniert.

### API

Die Parameter heißen wie die Optionen der Kommandozeile:

| Parameter                         | Beispiel                     |
| --------------------------------- | ---------------------------- |
| `farbe`, `typ`, `marke`, `status` | mehrfach möglich (= „oder“)  |
| `preis-min`, `preis-max`          | `4`, `4.5` oder `4,50`       |
| `sort`                            | `id`, `marke`, `farbe`, `typ`, `status`, `preis` |
| `absteigend`                      | `1` oder `true`              |

- `GET /api/bikes?...` liefert die gefilterten und sortierten Räder (`bikes`), dazu `count`, `total`, den passenden CLI-Befehl (`cli`), Hinweise auf unbekannte Werte (`hints`) und die Anzahl pro Filteroption (`facets`).
- `GET /api/options` liefert alle vorhandenen Werte mit Anzahl, die Preisspanne und die Sortierfelder.
- Fehler kommen als `{ "error": { "code", "message", "param" } }`: `400` bei falscher Eingabe (wie Exit-Code 2 der CLI), `500` bei fehlerhaften Daten (wie Exit-Code 1).

## Kommandozeile

```bash
npm start
```

## Filtern und Sortieren in der Kommandozeile

Optionen stehen bei `npm start` hinter `--`. Alternativ das Programm direkt mit `node` starten:

```bash
npm start -- --typ E-Bike --status Frei --sort preis
node src/index.js --typ E-Bike --status Frei --sort preis
```

| Option               | Bedeutung                                                   |
| -------------------- | ----------------------------------------------------------- |
| `--farbe <Farbe>`    | nur diese Farbe, z. B. `--farbe Rot`                        |
| `--typ <Typ>`        | nur dieser Fahrradtyp, z. B. `--typ E-Bike`                 |
| `--marke <Marke>`    | nur diese Marke, z. B. `--marke "Riese & Müller"`           |
| `--status <Status>`  | `Frei`, `Reserviert`, `In Benutzung` oder `Wartung`         |
| `--preis-min <Euro>` | Mindestpreis pro Stunde, z. B. `4` oder `4,50`              |
| `--preis-max <Euro>` | Höchstpreis pro Stunde                                      |
| `--sort <Feld>`      | `id` (Standard), `marke`, `farbe`, `typ`, `status`, `preis` |
| `--absteigend`       | absteigend statt aufsteigend sortieren                      |
| `-h`, `--help`       | Hilfe anzeigen                                              |

Regeln:

- Dieselbe Option mehrmals heißt „eines davon“: `--farbe Rot --farbe Blau` findet rote und blaue Räder.
- Verschiedene Optionen müssen alle passen: `--farbe Rot --typ E-Bike` findet nur rote E-Bikes.
- Preisgrenzen zählen mit: `--preis-max 5` findet auch Räder für genau 5,00 €.
- Groß-/Kleinschreibung ist egal, Umlaute zählen: `grün` findet `Grün`, `grun` nicht.
- Bei gleichem Wert wird nach ID sortiert, die Reihenfolge ist also immer gleich.
- Werte mit Leerzeichen oder `&` in Anführungszeichen setzen: `--status "In Benutzung"`.

Exit-Codes: `0` = ok (auch wenn nichts gefunden wurde), `1` = Fehler in den Daten, `2` = falsche Bedienung, z. B. unbekannte Option oder ungültiger Preis.

## Tests

```bash
npm test
```

## Projektstruktur

```
data/bikes.csv       Fahrradbestand
data/bike_types.csv  Preis pro Fahrradtyp
src/csv.js           parseCsv(): wandelt CSV-Text in Objekte um
src/bikes.js         loadBikes(): liest und prüft die Fahrrad-Daten
src/query.js         queryBikes(): filtert und sortiert (ohne Ein-/Ausgabe)
src/search.js        buildQuery(): gemeinsame Prüfung der Eingaben für Kommandozeile und Website
src/cli.js           parseCliArgs(): liest die Kommandozeilen-Optionen
src/index.js         Einstiegspunkt Kommandozeile: gibt die Tabelle aus
src/web.js           parseWebParams(): liest die URL-Parameter, zählt Treffer pro Filteroption
src/server.js        Einstiegspunkt Website: kleiner Webserver mit JSON-API
public/              Website (HTML, CSS, JavaScript, Schrift, Grafiken)
test/                Tests (node:test), u. a. Vergleich Kommandozeile gegen API
```

## Datenformat

Beide Dateien liegen in `data/`. Die erste Zeile enthält die Spaltennamen, jede weitere Zeile ist ein Datensatz.

### `data/bikes.csv`: ein Fahrrad pro Zeile

| Spalte      | Beispiel | Bedeutung                                            |
| ----------- | -------- | ---------------------------------------------------- |
| `bike_id`   | `BK-101` | Eindeutige Nummer des Fahrrads                       |
| `brand`     | `Cube`   | Marke                                                |
| `color`     | `Rot`    | Farbe                                                |
| `bike_type` | `E-Bike` | Fahrradtyp, muss in `bike_types.csv` vorkommen       |
| `status`    | `Frei`   | Nur erlaubt: Frei, Reserviert, In Benutzung, Wartung |

Die Marken sind Beispieldaten zum Testen.

### `data/bike_types.csv`: Preis pro Fahrradtyp

| Spalte        | Beispiel | Bedeutung                                                   |
| ------------- | -------- | ----------------------------------------------------------- |
| `bike_type`   | `E-Bike` | Fahrradtyp                                                  |
| `hourly_rate` | `6.00`   | Preis pro Stunde in Euro, mit Punkt als Dezimaltrennzeichen |

Jedes Fahrrad kostet den Preis seines Typs. Eine Preisänderung für alle E-Bikes ist also eine Zeile in `bike_types.csv`.

Regeln:

- Trennzeichen ist das Komma. Beim Speichern aus Excel darauf achten, dass nicht Semikolon verwendet wird.
- Werte dürfen keine Kommas oder Anführungszeichen enthalten.
- Alle Spalten oben sind Pflicht. In `bikes.csv` sind zusätzliche Spalten erlaubt und werden mit ausgegeben, eine Spalte `hourly_rate` aber nicht.
- Status und Fahrradtyp müssen genau so geschrieben sein wie oben bzw. in `bike_types.csv` (z. B. `Frei`, nicht `frei`).
- `bike_id` und `bike_type` dürfen in ihrer Datei nicht doppelt vorkommen.
- Ist eine Zeile fehlerhaft, bricht das Programm mit einer Fehlermeldung ab, die Datei und Datensatz nennt.

## Hinweis zu KI-Werkzeugen

- Die erste Version des Einlese-Skripts wurde mithilfe von Gemini erstellt.
- Die Aufteilung in `src/` und `test/`, die Tests, das Filtern und Sortieren, die festen Status-Werte und die Preise pro Fahrradtyp wurden mithilfe von Claude (Anthropic) erstellt. Die betroffenen Commits sind mit `Co-Authored-By: Claude` gekennzeichnet.
- Die ersten Entwürfe der Website entstanden mit Google Stitch. Die Website selbst (Aufbau nach einer Recherche echter Verleih-Seiten, Server, Oberfläche, Grafiken und Tests) wurde mithilfe von Claude erstellt.

## Lizenzen

- Schrift [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans): SIL Open Font License 1.1, siehe `public/fonts/OFL.txt`
- Icons in `public/js/art.js`: nachgezeichnet nach [Lucide](https://lucide.dev) (ISC-Lizenz), die Fahrrad-Illustrationen sind eigene Zeichnungen
