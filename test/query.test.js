const test = require('node:test');
const assert = require('node:assert/strict');
const { filterBikes, sortBikes, queryBikes, findUnknownValues } = require('../src/query');

const BIKES = [
  { bike_id: 'BK-10', brand: 'Cube', color: 'Rot', bike_type: 'E-Bike', status: 'Frei', hourly_rate: 6 },
  { bike_id: 'BK-9', brand: 'Ötztal', color: 'Grün', bike_type: 'Citybike', status: 'Reserviert', hourly_rate: 3.5 },
  { bike_id: 'BK-2', brand: 'Gazelle', color: 'Blau', bike_type: 'Citybike', status: 'Frei', hourly_rate: 4.5 },
  { bike_id: 'BK-1', brand: 'Zemo', color: 'Rot', bike_type: 'E-Bike', status: 'In Benutzung', hourly_rate: 6 },
];

const ids = bikes => bikes.map(bike => bike.bike_id);

test('ohne Abfrage: alle Fahrräder, nach ID sortiert (BK-9 vor BK-10)', () => {
  assert.deepEqual(ids(queryBikes(BIKES)), ['BK-1', 'BK-2', 'BK-9', 'BK-10']);
  assert.deepEqual(ids(queryBikes(BIKES, {})), ['BK-1', 'BK-2', 'BK-9', 'BK-10']);
});

test('filtert nach einem Feld', () => {
  assert.deepEqual(ids(queryBikes(BIKES, { filters: { color: ['Rot'] } })), ['BK-1', 'BK-10']);
  assert.deepEqual(ids(queryBikes(BIKES, { filters: { brand: ['Gazelle'] } })), ['BK-2']);
  assert.deepEqual(ids(queryBikes(BIKES, { filters: { status: ['In Benutzung'] } })), ['BK-1']);
});

test('Groß-/Kleinschreibung ist egal, Umlaute zählen', () => {
  assert.deepEqual(ids(filterBikes(BIKES, { filters: { color: ['rot'] } })), ['BK-10', 'BK-1']);
  assert.deepEqual(ids(filterBikes(BIKES, { filters: { color: ['GRÜN'] } })), ['BK-9']);
  assert.deepEqual(ids(filterBikes(BIKES, { filters: { color: ['grun'] } })), []);
  // Gleicher Buchstabe, anders kodiert (ü als u + Trema-Zeichen)
  assert.deepEqual(ids(filterBikes(BIKES, { filters: { color: ['Grün'] } })), ['BK-9']);
});

test('mehrere Werte eines Feldes: eines davon muss passen', () => {
  const result = queryBikes(BIKES, { filters: { color: ['Rot', 'Blau'] } });
  assert.deepEqual(ids(result), ['BK-1', 'BK-2', 'BK-10']);
});

test('verschiedene Felder: alle müssen passen', () => {
  const result = queryBikes(BIKES, { filters: { color: ['Rot'], status: ['Frei'] } });
  assert.deepEqual(ids(result), ['BK-10']);
});

test('Preisgrenzen schließen den Grenzwert mit ein', () => {
  assert.deepEqual(ids(queryBikes(BIKES, { minPrice: 4.5, maxPrice: 6 })), ['BK-1', 'BK-2', 'BK-10']);
  assert.deepEqual(ids(queryBikes(BIKES, { minPrice: 6 })), ['BK-1', 'BK-10']);
  assert.deepEqual(ids(queryBikes(BIKES, { maxPrice: 3.5 })), ['BK-9']);
  assert.deepEqual(ids(queryBikes(BIKES, { minPrice: 4.5, maxPrice: 4.5 })), ['BK-2']);
});

test('Filter und Preis kombiniert', () => {
  const result = queryBikes(BIKES, { filters: { bike_type: ['Citybike'] }, maxPrice: 4 });
  assert.deepEqual(ids(result), ['BK-9']);
});

test('kein Treffer ergibt ein leeres Array, keinen Fehler', () => {
  assert.deepEqual(queryBikes(BIKES, { filters: { color: ['Lila'] } }), []);
  assert.deepEqual(queryBikes(BIKES, { maxPrice: 1 }), []);
  assert.deepEqual(queryBikes([], { sort: { field: 'hourly_rate' } }), []);
});

test('leere Werteliste filtert nicht', () => {
  assert.equal(filterBikes(BIKES, { filters: { color: [] } }).length, 4);
});

test('lehnt nicht erlaubte Filterfelder ab', () => {
  for (const field of ['hourly_rate', 'unbekannt', '__proto__', 'constructor']) {
    assert.throws(() => filterBikes(BIKES, { filters: { [field]: ['x'] } }), /nicht erlaubt/);
  }
});

test('sortiert nach Preis, bei Gleichstand nach ID', () => {
  const result = sortBikes(BIKES, { field: 'hourly_rate' });
  assert.deepEqual(ids(result), ['BK-9', 'BK-2', 'BK-1', 'BK-10']);
});

test('absteigend dreht nur das Sortierfeld um, Gleichstand bleibt nach ID aufsteigend', () => {
  const result = sortBikes(BIKES, { field: 'hourly_rate', descending: true });
  assert.deepEqual(ids(result), ['BK-1', 'BK-10', 'BK-2', 'BK-9']);
});

test('sortiert Texte in deutscher Reihenfolge (Ö bei O, nicht hinter Z)', () => {
  assert.deepEqual(
    sortBikes(BIKES, { field: 'brand' }).map(bike => bike.brand),
    ['Cube', 'Gazelle', 'Ötztal', 'Zemo']
  );
  assert.deepEqual(
    sortBikes(BIKES, { field: 'brand', descending: true }).map(bike => bike.brand),
    ['Zemo', 'Ötztal', 'Gazelle', 'Cube']
  );
});

test('sortiert nach ID absteigend', () => {
  assert.deepEqual(ids(sortBikes(BIKES, { descending: true })), ['BK-10', 'BK-9', 'BK-2', 'BK-1']);
});

test('lehnt nicht erlaubte Sortierfelder ab', () => {
  for (const field of ['unbekannt', '__proto__', 'constructor']) {
    assert.throws(() => sortBikes(BIKES, { field }), /nicht erlaubt/);
  }
});

test('verändert das übergebene Array nicht', () => {
  const copy = structuredClone(BIKES);
  queryBikes(BIKES, { filters: { color: ['Rot'] }, sort: { field: 'hourly_rate', descending: true } });
  sortBikes(BIKES, { field: 'hourly_rate', descending: true });
  filterBikes(BIKES, { filters: { color: ['Rot'] } });
  assert.deepEqual(BIKES, copy);
});

test('gleiche Abfrage liefert immer die gleiche Reihenfolge', () => {
  const query = { sort: { field: 'bike_type' } };
  const shuffled = [BIKES[2], BIKES[0], BIKES[3], BIKES[1]];
  assert.deepEqual(ids(queryBikes(shuffled, query)), ids(queryBikes(BIKES, query)));
});

test('findUnknownValues meldet Werte, die es im Bestand nicht gibt', () => {
  const unknown = findUnknownValues(BIKES, { color: ['rot', 'Lila'], brand: ['Cube'] });
  assert.deepEqual(unknown, [
    { field: 'color', value: 'Lila', available: ['Blau', 'Grün', 'Rot'] },
  ]);
  assert.deepEqual(findUnknownValues(BIKES, {}), []);
});
