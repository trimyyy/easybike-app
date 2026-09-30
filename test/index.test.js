// Startet das echte Programm und prüft Ausgabe und Exit-Code
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const INDEX = path.join(__dirname, '..', 'src', 'index.js');

// Ohne npm-Variablen, damit "npm test" die Erkennung von "--" nicht auslöst
const CLEAN_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('npm_'))
);

function run(args, extraEnv = {}) {
  return spawnSync(process.execPath, [INDEX, ...args], {
    encoding: 'utf8',
    env: { ...CLEAN_ENV, ...extraEnv },
  });
}

const idsIn = output => output.match(/BK-\d+/g) ?? [];

test('ohne Optionen: alle 10 Fahrräder', () => {
  const result = run([]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /Filter: +keine/);
  assert.match(result.stdout, /10 von 10 Fahrrädern/);
  assert.equal(idsIn(result.stdout).length, 10);
});

test('filtert und sortiert die echten Daten', () => {
  const result = run(['--typ', 'e-bike', '--sort', 'marke']);
  assert.equal(result.status, 0);
  assert.deepEqual(idsIn(result.stdout), ['BK-105', 'BK-110', 'BK-102', 'BK-107']);
  assert.match(result.stdout, /4 von 10 Fahrrädern/);
});

test('Umlaute kommen unverändert an', () => {
  const result = run(['--farbe', 'grün', '--marke', 'Riese & Müller', '--farbe', 'Blau']);
  assert.equal(result.status, 0);
  assert.deepEqual(idsIn(result.stdout), ['BK-102']);
});

test('kein Treffer: Meldung und Exit-Code 0', () => {
  const result = run(['--preis-max', '1']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Keine Fahrräder gefunden/);
  assert.match(result.stdout, /0 von 10 Fahrrädern/);
});

test('unbekannter Wert: Hinweis mit vorhandenen Werten', () => {
  const result = run(['--farbe', 'Lila']);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /Hinweis: Farbe "Lila" gibt es im Bestand nicht\. Vorhanden: Blau, Gelb/);
});

test('Bedienfehler: Meldung auf stderr, Exit-Code 2, kein Stacktrace', () => {
  const result = run(['--colour', 'Rot']);
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^Fehler: Unbekannte Option "--colour"\nHilfe: npm start -- --help\n$/);
});

test('von npm abgefangene Option wird erkannt statt ungefiltert alles zu zeigen', () => {
  const result = run([], { npm_lifecycle_event: 'start', npm_config_farbe: 'Rot' });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /npm hat --farbe abgefangen/);
});

test('--help zeigt die Hilfe', () => {
  const result = run(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Verwendung: npm start -- \[Optionen\]/);
});
