const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBikes } = require('../src/bikes');
const { UsageError } = require('../src/search');
const { parseWebParams, facets, relaxations, buildOptions } = require('../src/web');

// Die echten Daten aus data/, die Zahlen unten beziehen sich darauf
const BIKES = loadBikes();

// Prüft Klasse, Meldung und betroffenen Parameter eines Bedienfehlers
function assertUsageError(queryString, message, param) {
  assert.throws(
    () => parseWebParams(queryString),
    error => {
      assert.ok(error instanceof UsageError, `Erwartet UsageError, bekam: ${error}`);
      assert.match(error.message, message);
      assert.equal(error.param, param);
      return true;
    },
    queryString
  );
}

// Anzahl pro Wert, z. B. { Frei: 2, Reserviert: 1 }
const countsOf = entries => Object.fromEntries(entries.map(({ value, count }) => [value, count]));

// --- parseWebParams ---

test('ohne Parameter: dieselbe Abfrage wie die Kommandozeile ohne Optionen', () => {
  assert.deepEqual(parseWebParams(''), {
    filters: {},
    minPrice: undefined,
    maxPrice: undefined,
    sort: { field: 'bike_id', descending: false },
  });
  assert.deepEqual(parseWebParams(new URLSearchParams()), parseWebParams(''));
});

test('Filter mehrfach, Preise, Sortierung', () => {
  const query = parseWebParams('farbe=Rot&farbe=Blau&typ=E-Bike&preis-min=4,50&preis-max=6&sort=preis&absteigend=1');
  assert.deepEqual(query, {
    filters: { color: ['Rot', 'Blau'], bike_type: ['E-Bike'] },
    minPrice: 4.5,
    maxPrice: 6,
    sort: { field: 'hourly_rate', descending: true },
  });
});

test('lehnt unbekannte Parameter ab, auch __proto__, constructor und help', () => {
  for (const name of ['colour', '__proto__', 'constructor', 'help', 'toString', 'Farbe', 'preis_min']) {
    assertUsageError(`${name}=x`, new RegExp(`^Unbekannter Parameter "${name}"$`), name);
  }
  // Kodiertes "=" gehört zum Namen
  assertUsageError('farbe%3DRot=x', /^Unbekannter Parameter "farbe=Rot"$/, 'farbe=Rot');
  // Auch nach bekannten Parametern
  assertUsageError('farbe=Rot&__proto__[x]=1', /^Unbekannter Parameter "__proto__\[x\]"$/, '__proto__[x]');
});

test('leerer Wert ist ein Fehler', () => {
  for (const queryString of ['farbe=', 'farbe', 'farbe=%20%20', 'farbe=+', 'farbe=Rot&farbe=']) {
    assertUsageError(queryString, /^Parameter "farbe" braucht einen Wert$/, 'farbe');
  }
  assertUsageError('sort=', /^Parameter "sort" braucht einen Wert$/, 'sort');
  assertUsageError('absteigend=', /^Parameter "absteigend" braucht einen Wert$/, 'absteigend');
});

test('sort, preis-min, preis-max und absteigend nur einmal', () => {
  assertUsageError('sort=preis&sort=marke', /^Parameter "sort" darf nur einmal angegeben werden$/, 'sort');
  assertUsageError('preis-max=5&preis-max=6', /^Parameter "preis-max" darf nur einmal/, 'preis-max');
  assertUsageError('preis-min=5&preis-min=5', /^Parameter "preis-min" darf nur einmal/, 'preis-min');
  assertUsageError('absteigend=1&absteigend=1', /^Parameter "absteigend" darf nur einmal/, 'absteigend');
});

test('absteigend: 1/true = absteigend, 0/false = aufsteigend, sonst Fehler', () => {
  for (const [text, expected] of [['1', true], ['true', true], ['TRUE', true], ['0', false], ['false', false], ['False', false], [' 1 ', true]]) {
    assert.equal(parseWebParams(`absteigend=${encodeURIComponent(text)}`).sort.descending, expected, text);
  }
  for (const text of ['ja', 'yes', '2', 'TRUE!', 'on']) {
    assertUsageError(`absteigend=${text}`, /^Parameter "absteigend" erwartet 1, true, 0 oder false/, 'absteigend');
  }
});

test('"+" und "%20" sind Leerzeichen, "%26" ist "&"', () => {
  assert.deepEqual(parseWebParams('status=In+Benutzung').filters, { status: ['In Benutzung'] });
  assert.deepEqual(parseWebParams('status=In%20Benutzung').filters, { status: ['In Benutzung'] });
  assert.deepEqual(parseWebParams('marke=Riese+%26+M%C3%BCller').filters, { brand: ['Riese & Müller'] });
});

test('Umlaute kommen unverändert an, kodiert oder nicht', () => {
  assert.deepEqual(parseWebParams('farbe=gr%C3%BCn').filters, { color: ['grün'] });
  assert.deepEqual(parseWebParams('farbe=Weiß').filters, { color: ['Weiß'] });
  assert.deepEqual(parseWebParams(new URLSearchParams({ marke: 'Riese & Müller' })).filters, {
    brand: ['Riese & Müller'],
  });
});

test('Web-Meldungen mit Mindest-/Höchstpreis und param', () => {
  assertUsageError(
    'preis-min=abc',
    /^Mindestpreis: "abc" ist kein gültiger Preis \(Beispiel: 4\.50 oder 4,50\)$/,
    'preis-min'
  );
  assertUsageError('preis-max=1e3', /^Höchstpreis: "1e3" ist kein gültiger Preis/, 'preis-max');
  assertUsageError('preis-min=6&preis-max=3', /^Mindestpreis \(6\) ist größer als Höchstpreis \(3\)$/, 'preis-min');
  assertUsageError(
    'status=Kaputt',
    /^Unbekannter Status "Kaputt"\. Erlaubt: Frei, Reserviert, In Benutzung, Wartung$/,
    'status'
  );
  assertUsageError(
    'sort=gewicht',
    /^Unbekanntes Sortierfeld "gewicht"\. Erlaubt: id, marke, farbe, typ, status, preis$/,
    'sort'
  );
  assertUsageError('sort=__proto__', /^Unbekanntes Sortierfeld "__proto__"/, 'sort');
});

// --- facets ---

test('facets bei typ=E-Bike: Status zählt nur E-Bikes, feste Reihenfolge auch mit 0', () => {
  const result = facets(BIKES, parseWebParams('typ=E-Bike'));

  assert.deepEqual(result.status, [
    { value: 'Frei', count: 2 },
    { value: 'Reserviert', count: 1 },
    { value: 'In Benutzung', count: 1 },
    { value: 'Wartung', count: 0 },
  ]);
  // Das eigene Feld zählt ohne den eigenen Filter: so viele kämen je Typ dazu
  assert.deepEqual(countsOf(result.bike_type), {
    Citybike: 3,
    'E-Bike': 4,
    Mountainbike: 2,
    Trekkingbike: 1,
  });
  assert.deepEqual(countsOf(result.brand), {
    Canyon: 0,
    Cube: 1,
    Gazelle: 0,
    Kalkhoff: 1,
    Pegasus: 0,
    'Riese & Müller': 2,
  });
});

test('facets: Werte aus dem ganzen Bestand, deutsch sortiert, Preis zählt mit', () => {
  const result = facets(BIKES, parseWebParams('preis-max=4&status=Frei'));

  assert.deepEqual(Object.keys(result), ['brand', 'color', 'bike_type', 'status']);
  assert.deepEqual(
    result.color.map(entry => entry.value),
    ['Blau', 'Gelb', 'Grün', 'Orange', 'Rot', 'Schwarz', 'Silber', 'Weiß']
  );
  // bis 4 € gibt es nur Citybikes (3,50 €), frei davon nur BK-101
  assert.deepEqual(countsOf(result.bike_type), {
    Citybike: 1,
    'E-Bike': 0,
    Mountainbike: 0,
    Trekkingbike: 0,
  });
  assert.deepEqual(countsOf(result.status), {
    Frei: 1,
    Reserviert: 1,
    'In Benutzung': 1,
    Wartung: 0,
  });
});

test('facets ohne Filter entsprechen den Zahlen im Bestand', () => {
  const result = facets(BIKES, parseWebParams(''));
  for (const [field, entries] of Object.entries(result)) {
    for (const { value, count } of entries) {
      assert.equal(count, BIKES.filter(bike => bike[field] === value).length, `${field} ${value}`);
    }
  }
});

// --- relaxations ---

test('relaxations: nur aktive Gruppen, feste Reihenfolge, Preis als eine Gruppe', () => {
  // Rot + Frei + Mountainbike + bis 5 € ergibt nichts
  const query = parseWebParams('farbe=Rot&status=Frei&typ=Mountainbike&preis-max=5');
  assert.deepEqual(relaxations(BIKES, query), [
    { param: 'typ', count: 1 }, // BK-101 (Citybike)
    { param: 'preis', count: 0 },
    { param: 'status', count: 0 },
    { param: 'farbe', count: 2 }, // BK-103, BK-109
  ]);
  // Preis = Mindest- und Höchstpreis zusammen
  assert.deepEqual(relaxations(BIKES, parseWebParams('typ=E-Bike&preis-min=4&preis-max=5')), [
    { param: 'typ', count: 3 },
    { param: 'preis', count: 4 },
  ]);
});

test('relaxations: ohne Filter leer, nur Preis', () => {
  assert.deepEqual(relaxations(BIKES, parseWebParams('')), []);
  assert.deepEqual(relaxations(BIKES, parseWebParams('sort=preis&absteigend=1')), []);
  assert.deepEqual(relaxations(BIKES, parseWebParams('preis-max=1')), [{ param: 'preis', count: 10 }]);
  assert.deepEqual(relaxations(BIKES, parseWebParams('marke=Canyon&typ=Citybike')), [
    { param: 'typ', count: 1 },
    { param: 'marke', count: 3 },
  ]);
});

// --- buildOptions ---

test('buildOptions: Zahlen, Preise und Sortierfelder für die Web-Seite', () => {
  const options = buildOptions(BIKES);

  assert.equal(options.total, 10);
  assert.deepEqual(options.filters.status, [
    { value: 'Frei', count: 5 },
    { value: 'Reserviert', count: 2 },
    { value: 'In Benutzung', count: 2 },
    { value: 'Wartung', count: 1 },
  ]);
  assert.deepEqual(options.filters.bike_type, [
    { value: 'Citybike', count: 3, hourly_rate: 3.5 },
    { value: 'E-Bike', count: 4, hourly_rate: 6 },
    { value: 'Mountainbike', count: 2, hourly_rate: 5 },
    { value: 'Trekkingbike', count: 1, hourly_rate: 4.5 },
  ]);
  assert.deepEqual(countsOf(options.filters.brand), {
    Canyon: 1,
    Cube: 2,
    Gazelle: 2,
    Kalkhoff: 2,
    Pegasus: 1,
    'Riese & Müller': 2,
  });
  assert.equal(options.filters.color.length, 8);
  assert.deepEqual(options.price, { min: 3.5, max: 6 });
  assert.deepEqual(options.sort, [
    { key: 'id', label: 'Nr.' },
    { key: 'marke', label: 'Marke' },
    { key: 'farbe', label: 'Farbe' },
    { key: 'typ', label: 'Typ' },
    { key: 'status', label: 'Status' },
    { key: 'preis', label: 'Preis' },
  ]);
});

test('buildOptions mit leerem Bestand', () => {
  const options = buildOptions([]);
  assert.equal(options.total, 0);
  assert.deepEqual(options.filters.brand, []);
  assert.equal(options.filters.status.length, 4);
  assert.deepEqual(options.price, { min: null, max: null });
});
