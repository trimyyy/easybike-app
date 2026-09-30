const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBikes, loadBikes } = require('../src/bikes');

const HEADER = 'bike_id,brand,color,bike_type,status,hourly_rate';

test('wandelt hourly_rate in eine Zahl um', () => {
  const bikes = parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,Frei,3.50`);

  assert.deepEqual(bikes, [
    {
      bike_id: 'BK-1',
      brand: 'Cube',
      color: 'Rot',
      bike_type: 'Citybike',
      status: 'Frei',
      hourly_rate: 3.5,
    },
  ]);
});

test('behält zusätzliche Spalten', () => {
  const [bike] = parseBikes(`${HEADER},location\nBK-1,Cube,Rot,Citybike,Frei,3.50,Nord`);

  assert.equal(bike.location, 'Nord');
});

test('meldet ein leeres Pflichtfeld mit Datensatz und bike_id', () => {
  assert.throws(
    () => parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,Frei,3.50\nBK-2,Cube,Blau,Citybike,,4.00`),
    { message: 'Datensatz #2 (BK-2): Feld "status" fehlt oder ist leer' }
  );
});

test('meldet eine fehlende Spalte in der Kopfzeile', () => {
  assert.throws(
    () => parseBikes('bike_id,brand,color,bike_type,status\nBK-1,Cube,Rot,Citybike,Frei'),
    { message: 'Datensatz #1 (BK-1): Feld "hourly_rate" fehlt oder ist leer' }
  );
});

test('meldet einen leeren Preis, statt ihn als 0 zu lesen', () => {
  assert.throws(
    () => parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,Frei,`),
    { message: 'Datensatz #1 (BK-1): Feld "hourly_rate" fehlt oder ist leer' }
  );
});

test('meldet ungültige Preise', () => {
  for (const rate of ['abc', '3.5abc', '-1']) {
    assert.throws(
      () => parseBikes(`${HEADER}\nBK-1,Cube,Rot,Citybike,Frei,${rate}`),
      { message: `Datensatz #1 (BK-1): hourly_rate "${rate}" ist kein gültiger Preis` }
    );
  }
});

test('data/bikes.csv lässt sich fehlerfrei einlesen', () => {
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
