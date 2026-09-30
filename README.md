# EasyBike App

Fahrradverleih-App – in Zusammenarbeit von Hübner, Zekjiri, Muriqi.

Aktuell liest die App den Fahrradbestand aus `data/bikes.csv` ein und zeigt ihn als Tabelle im Terminal an.

## Voraussetzungen

- [Node.js](https://nodejs.org/) 20 oder neuer (prüfen mit `node --version`)
- Keine weiteren Abhängigkeiten, `npm install` ist nicht nötig

## Starten

```bash
npm start
```

## Tests

```bash
npm test
```

## Projektstruktur

```
data/bikes.csv       Fahrradbestand
src/csv.js           parseCsv(): wandelt CSV-Text in Objekte um
src/bikes.js         loadBikes(): liest und prüft die Fahrrad-Daten
src/index.js         Einstiegspunkt: lädt die Fahrräder und gibt sie aus
test/                Tests (node:test)
```

## Datenformat `data/bikes.csv`

Die erste Zeile enthält die Spaltennamen, jede weitere Zeile ist ein Fahrrad.

| Spalte        | Beispiel | Bedeutung                                                   |
| ------------- | -------- | ----------------------------------------------------------- |
| `bike_id`     | `BK-101` | Eindeutige Nummer des Fahrrads                              |
| `color`       | `Rot`    | Farbe                                                       |
| `bike_type`   | `E-Bike` | Fahrradtyp                                                  |
| `status`      | `Frei`   | Aktuell verwendet: Frei, Reserviert, In Benutzung, Wartung  |
| `hourly_rate` | `6.00`   | Preis pro Stunde in Euro, mit Punkt als Dezimaltrennzeichen |

Regeln:

- Trennzeichen ist das Komma. Beim Speichern aus Excel darauf achten, dass nicht Semikolon verwendet wird.
- Werte dürfen keine Kommas oder Anführungszeichen enthalten.
- Alle Spalten oben sind Pflicht. Zusätzliche Spalten sind erlaubt und werden mit ausgegeben.
- Ist eine Zeile fehlerhaft, bricht das Programm mit einer Fehlermeldung ab, die die Zeile bzw. das Fahrrad nennt.

## Hinweis

Die erste Version des Einlese-Skripts wurde mithilfe von Gemini erstellt.
