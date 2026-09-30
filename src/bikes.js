const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./csv');

const BIKES_FILE = path.join(__dirname, '..', 'data', 'bikes.csv');
const REQUIRED_FIELDS = ['bike_id', 'brand', 'color', 'bike_type', 'status', 'hourly_rate'];
// Erlaubte Status-Werte, genau so geschrieben wie in data/bikes.csv
const STATUSES = ['Frei', 'Reserviert', 'In Benutzung', 'Wartung'];

// Prüft einen Datensatz aus der CSV-Datei und wandelt hourly_rate in eine Zahl um.
// Zusätzliche Spalten bleiben unverändert erhalten.
function toBike(record, index) {
  const label = `Datensatz #${index + 1}${record.bike_id ? ` (${record.bike_id})` : ''}`;

  for (const field of REQUIRED_FIELDS) {
    if (!record[field]) {
      throw new Error(`${label}: Feld "${field}" fehlt oder ist leer`);
    }
  }

  if (!STATUSES.includes(record.status)) {
    throw new Error(
      `${label}: Status "${record.status}" ist ungültig. Erlaubt: ${STATUSES.join(', ')}`
    );
  }

  const hourlyRate = Number(record.hourly_rate);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new Error(`${label}: hourly_rate "${record.hourly_rate}" ist kein gültiger Preis`);
  }

  return { ...record, hourly_rate: hourlyRate };
}

function parseBikes(csvText) {
  return parseCsv(csvText).map(toBike);
}

function loadBikes(filePath = BIKES_FILE) {
  return parseBikes(fs.readFileSync(filePath, 'utf8'));
}

module.exports = { STATUSES, parseBikes, loadBikes };
