// Nachweis: Kommandozeile und Web-Schnittstelle finden mit denselben Angaben
// dieselben Fahrräder in derselben Reihenfolge. Das echte Programm (src/index.js)
// wird gestartet und mit /api/bikes des echten Servers verglichen.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createServer } = require('../src/server');

const INDEX = path.join(__dirname, '..', 'src', 'index.js');

// Ohne npm-Variablen, damit "npm test" die Erkennung von "--" nicht auslöst
const CLEAN_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('npm_'))
);

// Kommandozeile <-> Query-String
const CASES = [
  [[], ''],
  [['--farbe', 'Rot', '--farbe', 'Blau'], 'farbe=Rot&farbe=Blau'],
  [['--farbe', 'Rot', '--typ', 'E-Bike'], 'farbe=Rot&typ=E-Bike'],
  [['--preis-max', '5'], 'preis-max=5'],
  [['--preis-min', '4,50', '--preis-max', '5'], 'preis-min=4,50&preis-max=5'],
  [['--status', 'frei', '--sort', 'preis', '--absteigend'], 'status=frei&sort=preis&absteigend=1'],
  [['--farbe', 'grün'], 'farbe=grün'],
  [['--farbe', 'grun'], 'farbe=grun'],
  [['--typ', 'e-bike', '--sort', 'marke'], 'typ=e-bike&sort=marke'],
  [['--sort', 'preis'], 'sort=preis'],
  [['--sort', 'status'], 'sort=status'],
  [['--marke', 'Riese & Müller'], 'marke=Riese %26 Müller'],
  [['--typ', 'Citybike', '--status', 'Frei', '--status', 'Reserviert'], 'typ=Citybike&status=Frei&status=Reserviert'],
];

let server;
let baseUrl;

before(async () => {
  // Nur die API wird genutzt, public/ spielt keine Rolle
  server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

function runCli(args) {
  const result = spawnSync(process.execPath, [INDEX, ...args], { encoding: 'utf8', env: CLEAN_ENV });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result;
}

// IDs aus der Tabelle von console.table, dort stehen sie in Hochkommas: 'BK-101'
const idsIn = output => [...output.matchAll(/'(BK-\d+)'/g)].map(match => match[1]);

async function callApi(queryString) {
  // new URL kodiert Umlaute und Leerzeichen, "%26" bleibt "&" im Wert
  const url = new URL(`/api/bikes?${queryString}`, baseUrl);
  const res = await fetch(url);
  assert.equal(res.status, 200, url.href);
  return res.json();
}

// "npm start -- --marke "Riese & Müller"" -> ['--marke', 'Riese & Müller']
function cliArgsOf(command) {
  const rest = command.replace(/^npm start( -- )?/, '');
  return [...rest.matchAll(/"([^"]*)"|(\S+)/g)].map(match => match[1] ?? match[2]);
}

for (const [args, queryString] of CASES) {
  test(`gleiche Treffer: ${args.join(' ') || '(ohne Optionen)'}  <->  ?${queryString}`, async () => {
    const cli = runCli(args);
    const api = await callApi(queryString);

    const cliIds = idsIn(cli.stdout);
    const apiIds = api.bikes.map(bike => bike.bike_id);
    assert.deepEqual(apiIds, cliIds);

    // Gleiche Anzahl und gleiche Beschreibung der Filter und Sortierung
    assert.match(cli.stdout, new RegExp(`\\n${api.count} von ${api.total} Fahrrädern\\n`));
    assert.ok(cli.stdout.includes(`Filter:     ${api.description.filters}\n`), api.description.filters);
    assert.ok(cli.stdout.includes(`Sortierung: ${api.description.sort}\n`), api.description.sort);

    // Hinweise zu unbekannten Werten: gleiche Meldungen
    const cliHints = cli.stderr.split('\n').filter(Boolean);
    assert.deepEqual(cliHints, api.hints.map(hint => `Hinweis: ${hint.message}`));

    // Der angezeigte Befehl für das Terminal findet ebenfalls dieselben Räder
    assert.deepEqual(idsIn(runCli(cliArgsOf(api.cli)).stdout), apiIds, api.cli);
  });
}
