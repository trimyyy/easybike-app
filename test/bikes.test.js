const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseBikeTypes, parseBikes, loadBikes } = require('../src/bikes');

const HEADER = 'bike_id,brand,color,bike_type,status';
const PRICES = new Map([
  ['Citybike', 3.5],
  ['E-Bike', 6],
]);

// Legt Dateien in einem temporären Ordner an, der nach dem Test gelöscht wird
function tempDir(t, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easybike-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

// --- bikes.csv ---

test('jedes Fahrrad bekommt den Stundenpreis seines Typs', () => {
  const bikes = parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,Frei\nBK-2,Cube,Blau,E-Bike,Frei`, PRICES);

  assert.deepEqual(bikes, [
    {
      bike_id: 'BK-1',
      brand: 'Cube',
      color: 'Rot',
      bike_type: 'Citybike',
      status: 'Frei',
      hourly_rate: 3.5,
    },
    {
      bike_id: 'BK-2',
      brand: 'Cube',
      color: 'Blau',
      bike_type: 'E-Bike',
      status: 'Frei',
      hourly_rate: 6,
    },
  ]);
});

test('behält zusätzliche Spalten', () => {
  const [bike] = parseBikes(`${HEADER},location\nBK-1,Cube,Rot,Citybike,Frei,Nord`, PRICES);

  assert.equal(bike.location, 'Nord');
});

test('meldet ein leeres Pflichtfeld mit Datensatz und bike_id', () => {
  assert.throws(
    () => parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,Frei\nBK-2,,Blau,Citybike,Frei`, PRICES),
    { message: 'Datensatz #2 (BK-2): Feld "brand" fehlt oder ist leer' }
  );
});

test('meldet eine fehlende Spalte in der Kopfzeile', () => {
  assert.throws(
    () => parseBikes('bike_id,brand,color,bike_type\nBK-1,Cube,Rot,Citybike', PRICES),
    { message: 'Datensatz #1 (BK-1): Feld "status" fehlt oder ist leer' }
  );
});

test('akzeptiert nur die festen Status-Werte, genau so geschrieben', () => {
  for (const status of ['Frei', 'Reserviert', 'In Benutzung', 'Wartung']) {
    assert.equal(parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,${status}`, PRICES)[0].status, status);
  }
  for (const status of ['Frie', 'frei', 'Kaputt']) {
    assert.throws(
      () => parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,${status}`, PRICES),
      {
        message:
          `Datensatz #1 (BK-1): Status "${status}" ist ungültig. ` +
          'Erlaubt: Frei, Reserviert, In Benutzung, Wartung',
      }
    );
  }
});

test('meldet einen Typ, der in bike_types.csv fehlt', () => {
  assert.throws(
    () => parseBikes(`${HEADER}\nBK-1,Cube,Rot,Mountainbike,Frei`, PRICES),
    {
      message:
        'Datensatz #1 (BK-1): Typ "Mountainbike" fehlt in bike_types.csv. Vorhanden: Citybike, E-Bike',
    }
  );
});

test('meldet eine doppelte bike_id', () => {
  assert.throws(
    () => parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,Frei\nBK-1,Cube,Blau,E-Bike,Frei`, PRICES),
    { message: 'Datensatz #2 (BK-1): bike_id "BK-1" ist doppelt' }
  );
});

test('lehnt eine Preisspalte in bikes.csv ab, statt sie still zu überschreiben', () => {
  assert.throws(
    () => parseBikes(`${HEADER},hourly_rate\nBK-1,Cube,Rot,Citybike,Frei,9.99`, PRICES),
    /Spalte "hourly_rate" gehört nach bike_types\.csv/
  );
});

// --- bike_types.csv ---

test('liest die Preise pro Fahrradtyp', () => {
  const prices = parseBikeTypes('bike_type,hourly_rate\nCitybike,3.50\nE-Bike,6\nGratisrad,0');

  assert.deepEqual(
    prices,
    new Map([
      ['Citybike', 3.5],
      ['E-Bike', 6],
      ['Gratisrad', 0],
    ])
  );
});

test('meldet einen doppelten Typ', () => {
  assert.throws(
    () => parseBikeTypes('bike_type,hourly_rate\nCitybike,3.50\nCitybike,4.00'),
    { message: 'Datensatz #2 (Citybike): Typ "Citybike" ist doppelt' }
  );
});

test('meldet einen leeren Preis, statt ihn als 0 zu lesen', () => {
  assert.throws(
    () => parseBikeTypes('bike_type,hourly_rate\nCitybike,'),
    { message: 'Datensatz #1 (Citybike): Feld "hourly_rate" fehlt oder ist leer' }
  );
});

test('meldet ungültige Preise', () => {
  for (const rate of ['abc', '3.5abc', '-1']) {
    assert.throws(
      () => parseBikeTypes(`bike_type,hourly_rate\nCitybike,${rate}`),
      { message: `Datensatz #1 (Citybike): hourly_rate "${rate}" ist kein gültiger Preis` }
    );
  }
});

test('meldet eine fehlende Spalte in bike_types.csv', () => {
  assert.throws(
    () => parseBikeTypes('bike_type\nCitybike'),
    { message: 'Datensatz #1 (Citybike): Feld "hourly_rate" fehlt oder ist leer' }
  );
});

// --- loadBikes mit Dateien ---

test('data/bikes.csv und data/bike_types.csv lassen sich fehlerfrei einlesen', () => {
  const bikes = loadBikes();

  assert.equal(bikes.length, 10);
  assert.deepEqual(bikes[0], {
    bike_id: 'BK-101',
    brand: 'Gazelle',
    color: 'Rot',
    bike_type: 'Citybike',
    status: 'Frei',
    hourly_rate: 3.5,
  });
});

test('Fehlermeldungen nennen die betroffene Datei', t => {
  const dir = tempDir(t, {
    'bike_types.csv': 'bike_type,hourly_rate\nCitybike,3.50\n',
    'bikes.csv': `${HEADER}\nBK-1,Cube,Rot,Citybike,Frie\n`,
  });

  assert.throws(
    () => loadBikes(path.join(dir, 'bikes.csv'), path.join(dir, 'bike_types.csv')),
    { message: /^bikes\.csv: Datensatz #1 \(BK-1\): Status "Frie" ist ungültig/ }
  );
  assert.throws(
    () => loadBikes(path.join(dir, 'bikes.csv'), path.join(dir, 'fehlt.csv')),
    { message: /^fehlt\.csv: Datei nicht gefunden/ }
  );
});

test('loadBikes verbindet beide Dateien', t => {
  const dir = tempDir(t, {
    'bike_types.csv': 'bike_type,hourly_rate\nCitybike,3.50\nE-Bike,6.00\n',
    'bikes.csv': `${HEADER}\nBK-1,Cube,Rot,E-Bike,Frei\nBK-2,Gazelle,Blau,Citybike,Wartung\n`,
  });

  const bikes = loadBikes(path.join(dir, 'bikes.csv'), path.join(dir, 'bike_types.csv'));
  assert.deepEqual(
    bikes.map(bike => [bike.bike_id, bike.hourly_rate]),
    [
      ['BK-1', 6],
      ['BK-2', 3.5],
    ]
  );
});
