const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BIKES_FILE = path.join(DATA_DIR, 'bikes.csv');
const BIKE_TYPES_FILE = path.join(DATA_DIR, 'bike_types.csv');

const BIKE_FIELDS = ['bike_id', 'brand', 'color', 'bike_type', 'status'];
const BIKE_TYPE_FIELDS = ['bike_type', 'hourly_rate'];
// Erlaubte Status-Werte, genau so geschrieben wie in data/bikes.csv
const STATUSES = ['Frei', 'Reserviert', 'In Benutzung', 'Wartung'];

function recordLabel(index, id) {
  return `Datensatz #${index + 1}${id ? ` (${id})` : ''}`;
}

function checkRequiredFields(record, fields, label) {
  for (const field of fields) {
    if (!record[field]) {
      throw new Error(`${label}: Feld "${field}" fehlt oder ist leer`);
    }
  }
}

// Liest die Preise pro Fahrradtyp. Ergebnis: Map von Typ -> Stundenpreis
function parseBikeTypes(csvText) {
  const prices = new Map();

  parseCsv(csvText).forEach((record, index) => {
    const label = recordLabel(index, record.bike_type);
    checkRequiredFields(record, BIKE_TYPE_FIELDS, label);

    if (prices.has(record.bike_type)) {
      throw new Error(`${label}: Typ "${record.bike_type}" ist doppelt`);
    }

    const hourlyRate = Number(record.hourly_rate);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      throw new Error(`${label}: hourly_rate "${record.hourly_rate}" ist kein gültiger Preis`);
    }

    prices.set(record.bike_type, hourlyRate);
  });

  return prices;
}

// Prüft die Fahrräder und ergänzt den Stundenpreis ihres Typs.
// Zusätzliche Spalten bleiben unverändert erhalten.
function parseBikes(csvText, prices) {
  const seenIds = new Set();

  return parseCsv(csvText).map((record, index) => {
    const label = recordLabel(index, record.bike_id);
    checkRequiredFields(record, BIKE_FIELDS, label);

    // Sonst würde ein Preis in bikes.csv still vom Preis des Typs überschrieben
    if (Object.hasOwn(record, 'hourly_rate')) {
      throw new Error(
        `${label}: Spalte "hourly_rate" gehört nach bike_types.csv, der Preis gilt pro Fahrradtyp`
      );
    }

    if (seenIds.has(record.bike_id)) {
      throw new Error(`${label}: bike_id "${record.bike_id}" ist doppelt`);
    }
    seenIds.add(record.bike_id);

    if (!STATUSES.includes(record.status)) {
      throw new Error(
        `${label}: Status "${record.status}" ist ungültig. Erlaubt: ${STATUSES.join(', ')}`
      );
    }

    if (!prices.has(record.bike_type)) {
      throw new Error(
        `${label}: Typ "${record.bike_type}" fehlt in bike_types.csv. ` +
          `Vorhanden: ${[...prices.keys()].join(', ')}`
      );
    }

    return { ...record, hourly_rate: prices.get(record.bike_type) };
  });
}

// Es gibt zwei Dateien, daher nennt jede Fehlermeldung die betroffene Datei
function readCsvFile(filePath, parse) {
  try {
    return parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    const reason = error.code === 'ENOENT' ? `Datei nicht gefunden (${filePath})` : error.message;
    throw new Error(`${path.basename(filePath)}: ${reason}`, { cause: error });
  }
}

function loadBikes(bikesFile = BIKES_FILE, bikeTypesFile = BIKE_TYPES_FILE) {
  const prices = readCsvFile(bikeTypesFile, parseBikeTypes);
  return readCsvFile(bikesFile, text => parseBikes(text, prices));
}

module.exports = { STATUSES, parseBikeTypes, parseBikes, loadBikes };
