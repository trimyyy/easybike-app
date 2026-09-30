# EasyBike App

Fahrradverleih-App – in Zusammenarbeit von Hübner, Zekjiri, Muriqi.

Aktuell liest die App den Fahrradbestand aus `data/bikes.csv` ein und zeigt ihn als Tabelle im Terminal an.
Die Fahrräder lassen sich nach Farbe, Typ, Marke, Status und Preis filtern und sortieren.

## Voraussetzungen

- [Node.js](https://nodejs.org/) 22 oder neuer (prüfen mit `node --version`)
- Keine weiteren Abhängigkeiten, `npm install` ist nicht nötig

## Starten

```bash
npm start
```

## Filtern und Sortieren

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
| `--status <Status>`  | nur dieser Status, z. B. `--status Frei`                    |
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
src/csv.js           parseCsv(): wandelt CSV-Text in Objekte um
src/bikes.js         loadBikes(): liest und prüft die Fahrrad-Daten
src/query.js         queryBikes(): filtert und sortiert (ohne Ein-/Ausgabe)
src/cli.js           parseCliArgs(): liest und prüft die Kommandozeilen-Optionen
src/index.js         Einstiegspunkt: verbindet alles und gibt die Tabelle aus
test/                Tests (node:test)
```

## Datenformat `data/bikes.csv`

Die erste Zeile enthält die Spaltennamen, jede weitere Zeile ist ein Fahrrad.

| Spalte        | Beispiel | Bedeutung                                                   |
| ------------- | -------- | ----------------------------------------------------------- |
| `bike_id`     | `BK-101` | Eindeutige Nummer des Fahrrads                              |
| `brand`       | `Cube`   | Marke                                                       |
| `color`       | `Rot`    | Farbe                                                       |
| `bike_type`   | `E-Bike` | Fahrradtyp                                                  |
| `status`      | `Frei`   | Aktuell verwendet: Frei, Reserviert, In Benutzung, Wartung  |
| `hourly_rate` | `6.00`   | Preis pro Stunde in Euro, mit Punkt als Dezimaltrennzeichen |

Die Marken in `data/bikes.csv` sind Beispieldaten zum Testen.

Regeln:

- Trennzeichen ist das Komma. Beim Speichern aus Excel darauf achten, dass nicht Semikolon verwendet wird.
- Werte dürfen keine Kommas oder Anführungszeichen enthalten.
- Alle Spalten oben sind Pflicht. Zusätzliche Spalten sind erlaubt und werden mit ausgegeben.
- Ist eine Zeile fehlerhaft, bricht das Programm mit einer Fehlermeldung ab, die die Zeile bzw. das Fahrrad nennt.

## Hinweis

Die erste Version des Einlese-Skripts wurde mithilfe von Gemini erstellt.
