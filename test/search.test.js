const test = require('node:test');
const assert = require('node:assert/strict');
const {
  UsageError,
  buildQuery,
  searchBikes,
  describeFilters,
  describeSort,
  toCliCommand,
} = require('../src/search');
const { WEB_LABELS } = require('../src/web');
const { parseCliArgs } = require('../src/cli');

const BIKES = [
  { bike_id: 'BK-10', brand: 'Cube', color: 'Rot', bike_type: 'E-Bike', status: 'Frei', hourly_rate: 6 },
  { bike_id: 'BK-9', brand: 'Riese & Müller', color: 'Grün', bike_type: 'Citybike', status: 'Reserviert', hourly_rate: 3.5 },
  { bike_id: 'BK-2', brand: 'Gazelle', color: 'Blau', bike_type: 'Citybike', status: 'Frei', hourly_rate: 4.5 },
  { bike_id: 'BK-1', brand: 'Cube', color: 'Rot', bike_type: 'E-Bike', status: 'In Benutzung', hourly_rate: 6 },
];

const ids = bikes => bikes.map(bike => bike.bike_id);

// Prüft Klasse, Meldung und betroffenen Parameter eines Bedienfehlers
function assertUsageError(fn, message, param) {
  assert.throws(fn, error => {
    assert.ok(error instanceof UsageError, `Erwartet UsageError, bekam: ${error}`);
    assert.equal(error.message, message);
    assert.equal(error.param, param);
    return true;
  });
}

// --- buildQuery ---

test('buildQuery: ohne Werte keine Filter, Sortierung nach ID aufsteigend', () => {
  assert.deepEqual(buildQuery({}), {
    filters: {},
    minPrice: undefined,
    maxPrice: undefined,
    sort: { field: 'bike_id', descending: false },
  });
});

test('buildQuery: Filterwerte werden getrimmt und den Datenfeldern zugeordnet', () => {
  const query = buildQuery({
    farbe: [' Rot ', 'Blau'],
    typ: ['E-Bike'],
    marke: ['Riese & Müller'],
    status: ['in benutzung'],
  });
  assert.deepEqual(query.filters, {
    color: ['Rot', 'Blau'],
    bike_type: ['E-Bike'],
    brand: ['Riese & Müller'],
    status: ['in benutzung'],
  });
});

test('buildQuery: Preise mit Punkt oder Komma, Grenzen dürfen gleich sein', () => {
  const query = buildQuery({ 'preis-min': ['4,50'], 'preis-max': [' 4.5 '] });
  assert.equal(query.minPrice, 4.5);
  assert.equal(query.maxPrice, 4.5);
});

test('buildQuery: Sortierung, Groß-/Kleinschreibung egal, absteigend nur bei true', () => {
  assert.deepEqual(buildQuery({ sort: [' Preis '], absteigend: true }).sort, {
    field: 'hourly_rate',
    descending: true,
  });
  assert.deepEqual(buildQuery({ sort: ['marke'], absteigend: false }).sort, {
    field: 'brand',
    descending: false,
  });
});

test('buildQuery: Standard-Meldungen sind die der Kommandozeile, mit param', () => {
  assertUsageError(
    () => buildQuery({ status: ['Frei', 'Kaputt'] }),
    'Unbekannter Status "Kaputt". Erlaubt: Frei, Reserviert, In Benutzung, Wartung',
    'status'
  );
  assertUsageError(
    () => buildQuery({ 'preis-min': ['abc'] }),
    '--preis-min: "abc" ist kein gültiger Preis (Beispiel: 4.50 oder 4,50)',
    'preis-min'
  );
  assertUsageError(
    () => buildQuery({ 'preis-max': ['-1'] }),
    '--preis-max: "-1" ist kein gültiger Preis (Beispiel: 4.50 oder 4,50)',
    'preis-max'
  );
  assertUsageError(
    () => buildQuery({ 'preis-min': ['6,50'], 'preis-max': ['5'] }),
    '--preis-min (6,5) ist größer als --preis-max (5)',
    'preis-min'
  );
  assertUsageError(
    () => buildQuery({ sort: ['preis', 'marke'] }),
    'Option "--sort" darf nur einmal angegeben werden',
    'sort'
  );
  assertUsageError(
    () => buildQuery({ 'preis-max': ['5', '6'] }),
    'Option "--preis-max" darf nur einmal angegeben werden',
    'preis-max'
  );
  assertUsageError(
    () => buildQuery({ sort: ['gewicht'] }),
    'Unbekanntes Sortierfeld "gewicht". Erlaubt: id, marke, farbe, typ, status, preis',
    'sort'
  );
});

test('buildQuery: Web-Labels ändern nur die Namen in den Meldungen', () => {
  assertUsageError(
    () => buildQuery({ 'preis-min': ['abc'] }, WEB_LABELS),
    'Mindestpreis: "abc" ist kein gültiger Preis (Beispiel: 4.50 oder 4,50)',
    'preis-min'
  );
  assertUsageError(
    () => buildQuery({ 'preis-max': ['x'] }, WEB_LABELS),
    'Höchstpreis: "x" ist kein gültiger Preis (Beispiel: 4.50 oder 4,50)',
    'preis-max'
  );
  assertUsageError(
    () => buildQuery({ 'preis-min': ['6'], 'preis-max': ['3'] }, WEB_LABELS),
    'Mindestpreis (6) ist größer als Höchstpreis (3)',
    'preis-min'
  );
  assertUsageError(
    () => buildQuery({ sort: ['preis', 'marke'] }, WEB_LABELS),
    'Parameter "sort" darf nur einmal angegeben werden',
    'sort'
  );
  // Gleiche Werte ergeben mit beiden Labels dieselbe Abfrage
  const values = { farbe: ['Rot'], 'preis-max': ['5'], sort: ['preis'], absteigend: true };
  assert.deepEqual(buildQuery(values, WEB_LABELS), buildQuery(values));
});

test('parseCliArgs nutzt buildQuery: Fehler tragen param', () => {
  assert.throws(() => parseCliArgs(['--preis-min', 'abc']), { param: 'preis-min' });
  assert.throws(() => parseCliArgs(['--colour', 'Rot']), { param: 'colour' });
});

// --- searchBikes ---

test('searchBikes: Treffer, Gesamtzahl und Hinweise zu unbekannten Werten', () => {
  const query = buildQuery({ farbe: ['Rot', 'Lila'], sort: ['preis'], absteigend: true });
  const result = searchBikes(BIKES, query);

  assert.deepEqual(ids(result.bikes), ['BK-1', 'BK-10']);
  assert.equal(result.total, 4);
  assert.deepEqual(result.hints, [
    {
      field: 'color',
      param: 'farbe',
      value: 'Lila',
      available: ['Blau', 'Grün', 'Rot'],
      message: 'Farbe "Lila" gibt es im Bestand nicht. Vorhanden: Blau, Grün, Rot',
    },
  ]);
});

test('searchBikes: kein Hinweis für Status, auch wenn niemand diesen Status hat', () => {
  const query = buildQuery({ status: ['Wartung'], marke: ['Canyon'], typ: ['e-bike'] });
  const result = searchBikes(BIKES, query);

  assert.deepEqual(result.bikes, []);
  assert.deepEqual(
    result.hints.map(hint => [hint.field, hint.param, hint.value]),
    [['brand', 'marke', 'Canyon']]
  );
});

test('searchBikes: Radobjekte bleiben unverändert, Original wird nicht verändert', () => {
  const copy = structuredClone(BIKES);
  const result = searchBikes(BIKES, buildQuery({}));
  assert.equal(result.bikes.find(bike => bike.bike_id === 'BK-9'), BIKES[1]);
  assert.deepEqual(BIKES, copy);
});

// --- Beschreibungen ---

test('describeFilters und describeSort', () => {
  assert.equal(describeFilters(buildQuery({})), 'keine');
  assert.equal(
    describeFilters(
      buildQuery({ farbe: ['Rot', 'Blau'], status: ['Frei'], 'preis-min': ['4,5'], 'preis-max': ['6'] })
    ),
    'Farbe: Rot oder Blau | Status: Frei | Preis ab 4,50 € | Preis bis 6,00 €'
  );
  assert.equal(describeSort({ field: 'hourly_rate', descending: true }), 'Preis absteigend');
  assert.equal(describeSort({ field: 'bike_id', descending: false }), 'ID aufsteigend');
});

// --- toCliCommand ---

test('toCliCommand: ohne Angaben nur "npm start"', () => {
  assert.equal(toCliCommand(buildQuery({})), 'npm start');
  assert.equal(toCliCommand(buildQuery({ sort: ['id'] })), 'npm start');
});

test('toCliCommand: Beispiel aus dem Bauplan', () => {
  const query = buildQuery({ typ: ['E-Bike'], status: ['Frei'], sort: ['preis'], absteigend: true });
  assert.equal(toCliCommand(query), 'npm start -- --typ E-Bike --status Frei --sort preis --absteigend');
});

test('toCliCommand: Werte mit Leerzeichen oder & in Anführungszeichen', () => {
  const query = buildQuery({ marke: ['Riese & Müller'], status: ['In Benutzung'], farbe: ['Grün'] });
  assert.equal(
    toCliCommand(query),
    'npm start -- --farbe Grün --marke "Riese & Müller" --status "In Benutzung"'
  );
});

test('toCliCommand: Preise, mehrere Werte, nur absteigend ohne Sortierfeld', () => {
  const query = buildQuery({ farbe: ['Rot', 'Blau'], 'preis-min': ['4,50'], 'preis-max': ['5'] });
  assert.equal(
    toCliCommand(query),
    'npm start -- --farbe Rot --farbe Blau --preis-min 4.5 --preis-max 5'
  );
  assert.equal(toCliCommand(buildQuery({ absteigend: true })), 'npm start -- --absteigend');
});

test('toCliCommand: der ausgegebene Befehl ergibt wieder dieselbe Abfrage', () => {
  const cases = [
    { marke: ['Riese & Müller'], status: ['in benutzung'], sort: ['marke'], absteigend: true },
    { farbe: ['grün', 'Rot'], typ: ['E-Bike'], 'preis-min': ['3,5'], 'preis-max': ['6'] },
    { farbe: ['-Rot'], sort: ['status'] },
    { farbe: ['Rot "matt"'] },
  ];
  for (const values of cases) {
    const query = buildQuery(values);
    const command = toCliCommand(query);
    assert.ok(command.startsWith('npm start -- '), command);
    const argv = splitCommand(command.slice('npm start -- '.length));
    assert.deepEqual(parseCliArgs(argv), { help: false, ...query }, command);
  }
});

// Einfaches Aufteilen wie eine Shell: "a b" bleibt zusammen, \" ist ein Anführungszeichen
function splitCommand(text) {
  return [...text.matchAll(/(?:[^\s"]+|"(?:[^"\\]|\\.)*")+/g)].map(([arg]) =>
    arg.replace(/"((?:[^"\\]|\\.)*)"/g, (_, inner) => inner.replaceAll('\\"', '"'))
  );
}
