const test = require('node:test');
const assert = require('node:assert/strict');
const { UsageError, parseCliArgs, findSwallowedNpmOptions } = require('../src/cli');

function assertUsageError(argv, messagePattern) {
  assert.throws(
    () => parseCliArgs(argv),
    error => {
      assert.ok(error instanceof UsageError, `Erwartet UsageError, bekam: ${error}`);
      assert.match(error.message, messagePattern);
      return true;
    }
  );
}

test('ohne Optionen: keine Filter, Sortierung nach ID aufsteigend', () => {
  assert.deepEqual(parseCliArgs([]), {
    help: false,
    filters: {},
    minPrice: undefined,
    maxPrice: undefined,
    sort: { field: 'bike_id', descending: false },
  });
});

test('Filteroptionen dürfen mehrfach vorkommen und werden getrimmt', () => {
  const { filters } = parseCliArgs(['--farbe', ' Rot ', '--farbe=Blau', '--typ', 'E-Bike']);
  assert.deepEqual(filters, { color: ['Rot', 'Blau'], bike_type: ['E-Bike'] });
});

test('Werte mit Leerzeichen, Umlauten und Sonderzeichen', () => {
  const { filters } = parseCliArgs(['--status', 'In Benutzung', '--marke', 'Riese & Müller']);
  assert.deepEqual(filters, { brand: ['Riese & Müller'], status: ['In Benutzung'] });
});

test('Preise mit Punkt oder Komma', () => {
  for (const [text, expected] of [['4', 4], ['4.5', 4.5], ['4,50', 4.5], [' 5 ', 5], ['0', 0]]) {
    assert.equal(parseCliArgs(['--preis-min', text]).minPrice, expected, text);
  }
  assert.equal(parseCliArgs(['--preis-max', '6,00']).maxPrice, 6);
});

test('lehnt ungültige Preise ab', () => {
  for (const text of ['abc', '1e3', '0x10', 'Infinity', '4,5,0', '4.', ',5', '3 €']) {
    assertUsageError(['--preis-max', text], /kein gültiger Preis/);
  }
  assertUsageError(['--preis-min=-1'], /kein gültiger Preis/);
});

test('Status: feste Werte, Groß-/Kleinschreibung egal', () => {
  const { filters } = parseCliArgs(['--status', 'frei', '--status', 'in benutzung']);
  assert.deepEqual(filters, { status: ['frei', 'in benutzung'] });
  assertUsageError(['--status', 'Frie'], /Unbekannter Status "Frie"\. Erlaubt: Frei, Reserviert/);
  assertUsageError(['--status', 'Frei', '--status', 'Kaputt'], /Unbekannter Status "Kaputt"/);
});

test('Mindestpreis größer als Höchstpreis ist ein Fehler, gleich ist erlaubt', () => {
  assertUsageError(['--preis-min', '6,50', '--preis-max', '5'], /--preis-min \(6,5\) ist größer als --preis-max \(5\)/);
  const query = parseCliArgs(['--preis-min', '5', '--preis-max', '5,00']);
  assert.equal(query.minPrice, 5);
  assert.equal(query.maxPrice, 5);
});

test('Sortierung nach Feld, Groß-/Kleinschreibung egal, optional absteigend', () => {
  assert.deepEqual(parseCliArgs(['--sort', 'preis']).sort, { field: 'hourly_rate', descending: false });
  assert.deepEqual(parseCliArgs(['--sort', 'Marke', '--absteigend']).sort, {
    field: 'brand',
    descending: true,
  });
  assert.deepEqual(parseCliArgs(['--absteigend']).sort, { field: 'bike_id', descending: true });
});

test('lehnt unbekannte Sortierfelder ab', () => {
  for (const name of ['groesse', 'hourly_rate', '__proto__', 'constructor', 'toString']) {
    assertUsageError(['--sort', name], /Unbekanntes Sortierfeld/);
  }
});

test('"--sort -preis" wird abgelehnt, mit Hinweis auf --absteigend', () => {
  assertUsageError(['--sort', '-preis'], /--sort preis --absteigend/);
});

test('lehnt unbekannte Optionen und lose Argumente ab', () => {
  assertUsageError(['--colour', 'Rot'], /Unbekannte Option "--colour"/);
  assertUsageError(['-x'], /Unbekannte Option "-x"/);
  assertUsageError(['--__proto__'], /Unbekannte Option "--__proto__"/);
  assertUsageError(['--constructor'], /Unbekannte Option "--constructor"/);
  // So kommt es an, wenn man "npm start --farbe Rot" ohne "--" aufruft
  assertUsageError(['Rot'], /Unerwartetes Argument "Rot"/);
  assertUsageError(['--', '--farbe', 'Rot'], /Unerwartetes Argument "--farbe"/);
});

test('Option ohne Wert ist ein Fehler', () => {
  assertUsageError(['--farbe'], /"--farbe" braucht einen Wert/);
  assertUsageError(['--farbe='], /"--farbe" braucht einen Wert/);
  assertUsageError(['--farbe', '  '], /"--farbe" braucht einen Wert/);
  assertUsageError(['--farbe', '--sort', 'preis'], /"--farbe" braucht einen Wert, bekam aber "--sort"/);
});

test('Schalter ohne Wert: --absteigend=ja ist ein Fehler', () => {
  assertUsageError(['--absteigend=ja'], /"--absteigend" erwartet keinen Wert/);
});

test('einfache Optionen dürfen nur einmal vorkommen', () => {
  assertUsageError(['--sort', 'preis', '--sort', 'marke'], /"--sort" darf nur einmal/);
  assertUsageError(['--preis-max', '5', '--preis-max', '6'], /"--preis-max" darf nur einmal/);
});

test('Hilfe mit -h oder --help', () => {
  assert.deepEqual(parseCliArgs(['-h']), { help: true });
  assert.deepEqual(parseCliArgs(['--help']), { help: true });
  assert.deepEqual(parseCliArgs(['--farbe', 'Rot', '--help']), { help: true });
});

test('erkennt Optionen, die npm ohne "--" abgefangen hat', () => {
  assert.deepEqual(findSwallowedNpmOptions({ npm_config_farbe: 'Rot' }), [], 'nicht über npm gestartet');
  assert.deepEqual(
    findSwallowedNpmOptions({
      npm_lifecycle_event: 'start',
      npm_config_farbe: 'Rot',
      npm_config_preis_max: '5',
      npm_config_https_proxy: 'http://proxy',
    }),
    ['--farbe', '--preis-max']
  );
  assert.deepEqual(findSwallowedNpmOptions({ npm_lifecycle_event: 'start' }), []);
});
