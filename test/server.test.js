// Startet den Web-Server auf einem freien Port und prüft ihn mit echten Anfragen
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../src/server');
const { loadBikes } = require('../src/bikes');
const { queryBikes } = require('../src/query');
const { parseWebParams } = require('../src/web');

const CSP =
  "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self'; " +
  "script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; " +
  "frame-ancestors 'none'; form-action 'self'";

// Eigener kleiner Ordner statt des echten public/ (daran wird parallel gebaut).
// Neben public/ liegen Dateien, die nie ausgeliefert werden dürfen: alle enthalten "GEHEIM".
const FIXTURE_FILES = {
  'package.json': '{ "name": "GEHEIM-package" }',
  'src/cli.js': '// GEHEIM-cli',
  'data/bikes.csv': 'bike_id,brand\nGEHEIM,csv',
  'public/index.html': '<!doctype html><title>Kunden</title><p>Kundenansicht</p>',
  'public/admin.html': '<!doctype html><title>Admin</title><p>Verwaltung</p>',
  'public/css/style.css': 'body { color: black; }',
  'public/css/Groß Datei.css': 'p { color: green; }',
  'public/js/app.js': 'console.log("app");',
  'public/img/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  'public/fonts/schrift.woff2': Buffer.from('wOF2'),
  'public/.gitignore': 'GEHEIM-gitignore',
  'public/.env': 'GEHEIM=1',
  'public/.hidden/geheim.css': '/* GEHEIM-ordner */',
  'public/js/.geheim.js': '// GEHEIM-js',
  'public/notizen.txt': 'GEHEIM-txt',
};

let fixtureDir;
let publicDir;
let server;
let port;

before(async () => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'easybike-server-'));
  for (const [name, content] of Object.entries(FIXTURE_FILES)) {
    const file = path.join(fixtureDir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  publicDir = path.join(fixtureDir, 'public');

  // Echte CSV-Dateien aus data/ (Standard von loadBikes)
  server = createServer({ publicDir });
  port = await listen(server);
});

after(() => {
  server.close();
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

function listen(httpServer) {
  return new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', () => resolve(httpServer.address().port));
  });
}

// Anfrage mit ROHEM Pfad: http.request schickt ihn unverändert (fetch würde "/../" auflösen)
function request(rawPath, { method = 'GET', to = port } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: to, path: rawPath, method, agent: false },
      res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, headers: res.headers, body, json: () => JSON.parse(body) });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function assertApiHeaders(res) {
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['referrer-policy'], 'no-referrer');
  assert.equal(res.headers['content-security-policy'], undefined);
}

async function assertApiError(rawPath, status, code, param, message, options) {
  const res = await request(rawPath, options);
  assert.equal(res.status, status, rawPath);
  assertApiHeaders(res);
  const data = res.json();
  assert.deepEqual(Object.keys(data), ['error'], rawPath);
  assert.equal(data.error.code, code, rawPath);
  assert.equal(data.error.param, param, rawPath);
  assert.match(data.error.message, message, rawPath);
  return res;
}

// --- /api/bikes ---

test('GET /api/bikes ohne Parameter: alle 10 Räder, nach ID sortiert', async () => {
  const res = await request('/api/bikes');
  assert.equal(res.status, 200);
  assertApiHeaders(res);

  const data = res.json();
  assert.deepEqual(Object.keys(data), [
    'bikes',
    'count',
    'total',
    'query',
    'description',
    'cli',
    'hints',
    'facets',
    'relax',
  ]);
  assert.equal(data.count, 10);
  assert.equal(data.total, 10);
  assert.equal(data.bikes[0].bike_id, 'BK-101');
  assert.equal(data.bikes[9].bike_id, 'BK-110');
  // undefined wird als null ausgegeben
  assert.deepEqual(data.query, {
    filters: {},
    minPrice: null,
    maxPrice: null,
    sort: { field: 'bike_id', descending: false },
  });
  assert.deepEqual(data.description, { filters: 'keine', sort: 'ID aufsteigend' });
  assert.equal(data.cli, 'npm start');
  assert.deepEqual(data.hints, []);
  assert.deepEqual(data.relax, []);
  assert.deepEqual(Object.keys(data.facets), ['brand', 'color', 'bike_type', 'status']);
});

test('GET /api/bikes: Beispiel aus dem Bauplan, Räder 1:1 aus queryBikes()', async () => {
  const queryString = 'typ=E-Bike&status=Frei&sort=preis&absteigend=1';
  const data = (await request(`/api/bikes?${queryString}`)).json();

  assert.deepEqual(data.bikes, [
    { bike_id: 'BK-105', brand: 'Cube', color: 'Gelb', bike_type: 'E-Bike', status: 'Frei', hourly_rate: 6 },
    {
      bike_id: 'BK-107',
      brand: 'Riese & Müller',
      color: 'Rot',
      bike_type: 'E-Bike',
      status: 'Frei',
      hourly_rate: 6,
    },
  ]);
  assert.deepEqual(data.bikes, queryBikes(loadBikes(), parseWebParams(queryString)));
  assert.equal(data.count, 2);
  assert.equal(data.total, 10);
  assert.deepEqual(data.query, {
    filters: { bike_type: ['E-Bike'], status: ['Frei'] },
    minPrice: null,
    maxPrice: null,
    sort: { field: 'hourly_rate', descending: true },
  });
  assert.deepEqual(data.description, { filters: 'Typ: E-Bike | Status: Frei', sort: 'Preis absteigend' });
  assert.equal(data.cli, 'npm start -- --typ E-Bike --status Frei --sort preis --absteigend');
  assert.deepEqual(data.facets.status, [
    { value: 'Frei', count: 2 },
    { value: 'Reserviert', count: 1 },
    { value: 'In Benutzung', count: 1 },
    { value: 'Wartung', count: 0 },
  ]);
  assert.deepEqual(data.relax, [
    { param: 'typ', count: 5 },
    { param: 'status', count: 4 },
  ]);
});

test('GET /api/bikes: Umlaute, "+" und "%26" kommen richtig an', async () => {
  const data = (
    await request('/api/bikes?marke=Riese+%26+M%C3%BCller&farbe=gr%C3%BCn&farbe=Blau')
  ).json();
  assert.deepEqual(
    data.bikes.map(bike => bike.bike_id),
    ['BK-102']
  );
  assert.equal(data.cli, 'npm start -- --farbe grün --farbe Blau --marke "Riese & Müller"');
});

test('GET /api/bikes: 0 Treffer sind kein Fehler', async () => {
  const res = await request('/api/bikes?preis-max=1');
  assert.equal(res.status, 200);
  const data = res.json();
  assert.deepEqual(data.bikes, []);
  assert.equal(data.count, 0);
  assert.equal(data.total, 10);
  assert.equal(data.query.maxPrice, 1);
  assert.equal(data.description.filters, 'Preis bis 1,00\u00a0€');
  assert.deepEqual(data.relax, [{ param: 'preis', count: 10 }]);
});

test('GET /api/bikes: unbekannter Wert ergibt einen Hinweis', async () => {
  const data = (await request('/api/bikes?farbe=Lila')).json();
  assert.deepEqual(data.bikes, []);
  assert.deepEqual(data.hints, [
    {
      field: 'color',
      param: 'farbe',
      value: 'Lila',
      available: ['Blau', 'Gelb', 'Grün', 'Orange', 'Rot', 'Schwarz', 'Silber', 'Weiß'],
      message:
        'Farbe "Lila" gibt es im Bestand nicht. ' +
        'Vorhanden: Blau, Gelb, Grün, Orange, Rot, Schwarz, Silber, Weiß',
    },
  ]);
});

test('GET /api/bikes: Bedienfehler ergeben 400 BEDIENFEHLER mit param', async () => {
  const cases = [
    ['colour=Rot', 'colour', /^Unbekannter Parameter "colour"$/],
    ['help=1', 'help', /^Unbekannter Parameter "help"$/],
    ['__proto__=x', '__proto__', /^Unbekannter Parameter "__proto__"$/],
    ['farbe=', 'farbe', /^Parameter "farbe" braucht einen Wert$/],
    ['preis-min=abc', 'preis-min', /^Mindestpreis: "abc" ist kein gültiger Preis \(Beispiel: 4\.50 oder 4,50\)$/],
    ['preis-min=6&preis-max=3', 'preis-min', /^Mindestpreis \(6\) ist größer als Höchstpreis \(3\)$/],
    ['status=Kaputt', 'status', /^Unbekannter Status "Kaputt"\. Erlaubt: Frei, Reserviert, In Benutzung, Wartung$/],
    ['sort=gewicht', 'sort', /^Unbekanntes Sortierfeld "gewicht"\. Erlaubt: id, marke, farbe, typ, status, preis$/],
    ['sort=preis&sort=marke', 'sort', /^Parameter "sort" darf nur einmal angegeben werden$/],
    ['preis-max=5&preis-max=6', 'preis-max', /^Parameter "preis-max" darf nur einmal angegeben werden$/],
    ['absteigend=ja', 'absteigend', /^Parameter "absteigend" erwartet 1, true, 0 oder false/],
  ];
  for (const [queryString, param, message] of cases) {
    await assertApiError(`/api/bikes?${queryString}`, 400, 'BEDIENFEHLER', param, message);
  }
});

test('ungültige Kodierung oder Null-Byte ergeben 400 UNGUELTIGE_ADRESSE', async () => {
  for (const rawPath of ['/api/bikes?farbe=%E0%A4%A', '/api/bikes?farbe=%00', '/api/bikes?farbe=%', '/%00', '/%E0%A4%A']) {
    await assertApiError(rawPath, 400, 'UNGUELTIGE_ADRESSE', undefined, /ungültig kodiert/);
  }
});

// --- /api/options ---

test('GET /api/options: Auswahlmöglichkeiten über den ganzen Bestand', async () => {
  const res = await request('/api/options');
  assert.equal(res.status, 200);
  assertApiHeaders(res);
  const data = res.json();
  assert.equal(data.total, 10);
  assert.deepEqual(data.filters.status, [
    { value: 'Frei', count: 5 },
    { value: 'Reserviert', count: 2 },
    { value: 'In Benutzung', count: 2 },
    { value: 'Wartung', count: 1 },
  ]);
  assert.deepEqual(data.filters.bike_type[0], { value: 'Citybike', count: 3, hourly_rate: 3.5 });
  assert.deepEqual(data.price, { min: 3.5, max: 6 });
  assert.deepEqual(data.sort[0], { key: 'id', label: 'Nr.' });
});

// --- Methoden und unbekannte Adressen ---

test('HEAD: dieselben Kopfzeilen wie GET, aber kein Inhalt', async () => {
  const get = await request('/api/bikes?typ=E-Bike');
  const head = await request('/api/bikes?typ=E-Bike', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal(head.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(head.headers['content-length'], String(Buffer.byteLength(get.body)));

  const page = await request('/', { method: 'HEAD' });
  assert.equal(page.status, 200);
  assert.equal(page.body, '');
  assert.equal(page.headers['content-security-policy'], CSP);

  const missing = await request('/fehlt.html', { method: 'HEAD' });
  assert.equal(missing.status, 404);
  assert.equal(missing.body, '');
});

test('andere Methoden: 405 mit Allow-Kopfzeile', async () => {
  for (const [method, rawPath] of [['POST', '/api/bikes'], ['PUT', '/'], ['DELETE', '/api/options'], ['PATCH', '/css/style.css'], ['OPTIONS', '/admin']]) {
    const res = await assertApiError(rawPath, 405, 'METHODE_NICHT_ERLAUBT', undefined, /GET, HEAD/, { method });
    assert.equal(res.headers.allow, 'GET, HEAD');
  }
});

test('unbekannte API-Adresse: 404 als JSON', async () => {
  for (const rawPath of ['/api/xyz', '/api', '/api/', '/api/bikes/', '/api/Bikes']) {
    await assertApiError(rawPath, 404, 'NICHT_GEFUNDEN', undefined, /Unbekannte Schnittstelle/);
  }
});

test('unbekannte Datei: 404 als kleine HTML-Seite mit Link auf /', async () => {
  const res = await request('/fehlt.html');
  assert.equal(res.status, 404);
  assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(res.headers['content-security-policy'], CSP);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.body, /<html lang="de">/);
  assert.match(res.body, /<a href="\/">/);
});

// --- Seiten und statische Dateien ---

test('/, /admin und /admin/ liefern die Seiten mit CSP', async () => {
  for (const [rawPath, text] of [
    ['/', 'Kundenansicht'],
    ['/index.html', 'Kundenansicht'],
    ['/admin', 'Verwaltung'],
    ['/admin/', 'Verwaltung'],
    ['/admin.html', 'Verwaltung'],
  ]) {
    const res = await request(rawPath);
    assert.equal(res.status, 200, rawPath);
    assert.match(res.body, new RegExp(text), rawPath);
    assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(res.headers['cache-control'], 'no-cache');
    assert.equal(res.headers['content-security-policy'], CSP);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
  }
});

test('statische Dateien: richtiger Typ, no-cache, CSP nur bei HTML', async () => {
  const cases = [
    ['/css/style.css', 'text/css; charset=utf-8', 'body { color: black; }'],
    ['/css/Gro%C3%9F%20Datei.css', 'text/css; charset=utf-8', 'p { color: green; }'],
    ['/js/app.js', 'text/javascript; charset=utf-8', 'console.log("app");'],
    ['/img/logo.svg', 'image/svg+xml; charset=utf-8', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'],
    ['/fonts/schrift.woff2', 'font/woff2', 'wOF2'],
  ];
  for (const [rawPath, type, body] of cases) {
    const res = await request(rawPath);
    assert.equal(res.status, 200, rawPath);
    assert.equal(res.body, body, rawPath);
    assert.equal(res.headers['content-type'], type, rawPath);
    assert.equal(res.headers['cache-control'], 'no-cache', rawPath);
    assert.equal(res.headers['content-security-policy'], undefined, rawPath);
    assert.equal(res.headers['x-content-type-options'], 'nosniff', rawPath);
  }
});

test('versteckte Dateien und fremde Endungen werden nicht ausgeliefert', async () => {
  for (const rawPath of ['/.gitignore', '/.env', '/.hidden/geheim.css', '/js/.geheim.js', '/notizen.txt', '/css', '/css/']) {
    const res = await request(rawPath);
    assert.equal(res.status, 404, rawPath);
    assert.doesNotMatch(res.body, /GEHEIM/, rawPath);
  }
});

test('Sicherheit: keine Datei außerhalb der Whitelist, Server läuft weiter', async () => {
  const attacks = [
    '/../package.json',
    '/..%2fpackage.json',
    '/..%5c..%5cpackage.json',
    '/..\\package.json',
    '/%2e%2e/src/cli.js',
    '/%2e%2e%2fsrc%2fcli.js',
    '/admin/../package.json',
    '/css/../../data/bikes.csv',
    '/src/cli.js',
    '/data/bikes.csv',
    '/.gitignore',
    '/%00',
    '/index.html%00.css',
    '/%E0%A4%A',
    '/index.html::$DATA',
    '/INDEX.HTML',
    '/C:/Windows/win.ini',
    '/C:%5CWindows%5Cwin.ini',
    '//etc/passwd',
  ];
  for (const rawPath of attacks) {
    const res = await request(rawPath);
    assert.ok([400, 404].includes(res.status), `${rawPath}: Status ${res.status}`);
    assert.doesNotMatch(res.body, /GEHEIM|\[fonts\]|for 16-bit|root:/, rawPath);
  }

  const res = await request('/');
  assert.equal(res.status, 200);
  assert.match(res.body, /Kundenansicht/);
});

// --- Fehler in den Daten und im Programm ---

test('fehlerhafte CSV-Datei: 500 DATENFEHLER mit derselben Meldung wie die Kommandozeile', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easybike-daten-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const bikesFile = path.join(dir, 'bikes.csv');
  const bikeTypesFile = path.join(dir, 'bike_types.csv');
  fs.writeFileSync(bikeTypesFile, 'bike_type,hourly_rate\nCitybike,3.50\n');
  fs.writeFileSync(bikesFile, 'bike_id,brand,color,bike_type,status\nBK-1,Cube,Rot,Citybike,Frie\n');

  const broken = createServer({ publicDir, bikesFile, bikeTypesFile });
  const brokenPort = await listen(broken);
  t.after(() => broken.close());

  const message =
    'bikes.csv: Datensatz #1 (BK-1): Status "Frie" ist ungültig. Erlaubt: Frei, Reserviert, In Benutzung, Wartung';
  assert.throws(() => loadBikes(bikesFile, bikeTypesFile), { message });

  for (const rawPath of ['/api/bikes', '/api/bikes?typ=Citybike', '/api/options']) {
    const res = await assertApiError(rawPath, 500, 'DATENFEHLER', undefined, /^bikes\.csv: /, { to: brokenPort });
    assert.equal(res.json().error.message, message);
  }

  // Bedienfehler werden trotzdem als solche gemeldet, Seiten gehen weiter
  await assertApiError('/api/bikes?colour=x', 400, 'BEDIENFEHLER', 'colour', /colour/, { to: brokenPort });
  assert.equal((await request('/', { to: brokenPort })).status, 200);
});

test('fehlende CSV-Datei: 500 DATENFEHLER', async t => {
  const missing = createServer({ publicDir, bikesFile: path.join(fixtureDir, 'fehlt.csv') });
  const missingPort = await listen(missing);
  t.after(() => missing.close());

  await assertApiError('/api/bikes', 500, 'DATENFEHLER', undefined, /^fehlt\.csv: Datei nicht gefunden/, {
    to: missingPort,
  });
});

test('Programmfehler: 500 INTERNER_FEHLER, Details nur im Terminal', async t => {
  const logged = t.mock.method(console, 'error', () => {});
  t.mock.method(fs, 'readdirSync', () => {
    throw new Error('Festplatte kaputt');
  });

  const res = await assertApiError('/css/style.css', 500, 'INTERNER_FEHLER', undefined, /^Interner Fehler im Server$/);
  assert.doesNotMatch(res.body, /Festplatte|readdirSync|at /);
  assert.equal(logged.mock.callCount(), 1);
  assert.match(String(logged.mock.calls[0].arguments[0].stack), /Festplatte kaputt/);
});
