// Kleiner Web-Server für die Weboberfläche und die JSON-Schnittstelle.
// Nur node:http, keine Abhängigkeiten. Starten mit: npm run web
//
//   /                 Kundenansicht (public/index.html)
//   /admin            Verwaltung (public/admin.html)
//   /api/bikes        Suche, gleiche Parameter wie die Kommandozeile (?typ=E-Bike&sort=preis)
//   /api/options      Auswahlmöglichkeiten für die Filter
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { loadBikes } = require('./bikes');
const {
  UsageError,
  searchBikes,
  describeFilters,
  describeSort,
  toCliCommand,
} = require('./search');
const { parseWebParams, facets, relaxations, buildOptions } = require('./web');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;

// Nur Dateien mit diesen Endungen werden ausgeliefert
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// Seiten, deren Adresse keine Dateiendung hat
const PAGES = new Map([
  ['/', '/index.html'],
  ['/admin', '/admin.html'],
  ['/admin/', '/admin.html'],
]);

const ALLOWED_METHODS = 'GET, HEAD';

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

// Nur für HTML-Antworten: Skripte, Styles, Schriften usw. nur vom eigenen Server
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

const NOT_FOUND_PAGE = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seite nicht gefunden – EasyBike</title>
</head>
<body>
<h1>Seite nicht gefunden</h1>
<p>Diese Seite gibt es nicht.</p>
<p><a href="/">Zur Startseite</a></p>
</body>
</html>
`;

// Fehler beim Einlesen der CSV-Dateien, Meldung wie in der Kommandozeile
class DataError extends Error {}

// Gibt einen http.Server zurück, der noch nicht lauscht (dafür server.listen()).
// Die Fahrrad-Daten werden bei jeder Anfrage neu gelesen, Änderungen an den
// CSV-Dateien sind also sofort sichtbar. Ohne Pfade gelten die Standarddateien
// von loadBikes() (data/bikes.csv, data/bike_types.csv).
function createServer({ publicDir = PUBLIC_DIR, bikesFile, bikeTypesFile } = {}) {
  const readBikes = () => {
    try {
      return loadBikes(bikesFile, bikeTypesFile);
    } catch (error) {
      throw new DataError(error.message, { cause: error });
    }
  };

  return http.createServer((req, res) => {
    try {
      handleRequest(req, res, { publicDir, readBikes });
    } catch (error) {
      // Programmfehler: Details nur ins Terminal, nicht an den Browser
      console.error(error);
      if (!res.headersSent) {
        sendError(req, res, 500, 'INTERNER_FEHLER', 'Interner Fehler im Server');
      }
    }
  });
}

function handleRequest(req, res, { publicDir, readBikes }) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendError(req, res, 405, 'METHODE_NICHT_ERLAUBT', `Erlaubt sind nur ${ALLOWED_METHODS}`, undefined, {
      Allow: ALLOWED_METHODS,
    });
    return;
  }

  const target = parseTarget(req.url);
  if (!target) {
    sendError(req, res, 400, 'UNGUELTIGE_ADRESSE', 'Die Adresse ist ungültig kodiert');
    return;
  }

  if (target.pathname === '/api' || target.pathname.startsWith('/api/')) {
    handleApi(req, res, target, readBikes);
  } else {
    serveFile(req, res, publicDir, target.pathname);
  }
}

// Zerlegt die Adresse, ohne sie zu normalisieren ("/../" bleibt "/../").
// Ungültige Prozent-Kodierung oder ein Null-Byte ergeben null.
function parseTarget(url) {
  if (!url.startsWith('/')) return null;

  const queryStart = url.indexOf('?');
  const rawPath = queryStart === -1 ? url : url.slice(0, queryStart);
  const rawQuery = queryStart === -1 ? '' : url.slice(queryStart + 1);

  let pathname;
  let queryText;
  try {
    pathname = decodeURIComponent(rawPath);
    // URLSearchParams ersetzt kaputte Kodierung still, daher vorher selbst prüfen
    queryText = decodeURIComponent(rawQuery);
  } catch (error) {
    if (error instanceof URIError) return null;
    throw error;
  }
  if (pathname.includes('\0') || queryText.includes('\0')) return null;

  return { pathname, searchParams: new URLSearchParams(rawQuery) };
}

function handleApi(req, res, { pathname, searchParams }, readBikes) {
  try {
    if (pathname === '/api/bikes') {
      sendJson(req, res, 200, searchResponse(searchParams, readBikes));
    } else if (pathname === '/api/options') {
      sendJson(req, res, 200, buildOptions(readBikes()));
    } else {
      sendError(req, res, 404, 'NICHT_GEFUNDEN', `Unbekannte Schnittstelle "${pathname}"`);
    }
  } catch (error) {
    if (error instanceof UsageError) {
      sendError(req, res, 400, 'BEDIENFEHLER', error.message, error.param);
    } else if (error instanceof DataError) {
      sendError(req, res, 500, 'DATENFEHLER', error.message);
    } else {
      throw error;
    }
  }
}

// Antwort von /api/bikes. Die Räder sind genau die Objekte aus queryBikes(),
// die Kommandozeile mit denselben Angaben findet also dieselben Räder.
function searchResponse(searchParams, readBikes) {
  const query = parseWebParams(searchParams);
  const bikes = readBikes();
  const result = searchBikes(bikes, query);

  return {
    bikes: result.bikes,
    count: result.bikes.length,
    total: result.total,
    query,
    description: { filters: describeFilters(query), sort: describeSort(query.sort) },
    cli: toCliCommand(query),
    hints: result.hints,
    facets: facets(bikes, query),
    relax: relaxations(bikes, query),
  };
}

function serveFile(req, res, publicDir, pathname) {
  const filePath = listPublicFiles(publicDir).get(PAGES.get(pathname) ?? pathname);
  if (!filePath) {
    sendNotFoundPage(req, res);
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath);
  } catch (error) {
    // Zwischen Auflisten und Lesen gelöscht
    if (error.code !== 'ENOENT') throw error;
    sendNotFoundPage(req, res);
    return;
  }

  const type = MIME_TYPES[path.extname(filePath).toLowerCase()];
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache' };
  if (type.startsWith('text/html')) {
    headers['Content-Security-Policy'] = CONTENT_SECURITY_POLICY;
  }
  send(req, res, 200, content, headers);
}

// Whitelist aller auslieferbaren Dateien: Adresse ('/css/style.css') -> Dateipfad.
// Wird bei jeder Anfrage neu aus publicDir aufgebaut. Die Adresse aus der Anfrage
// wird nur hier nachgeschlagen und nie zu einem Dateipfad zusammengesetzt,
// "/../package.json" oder "/C:/Windows/win.ini" können also nichts finden.
function listPublicFiles(publicDir) {
  const files = new Map();

  const visit = (dir, urlPrefix) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return;
      throw error;
    }

    for (const entry of entries) {
      // Keine versteckten Dateien und Ordner wie .git oder .env
      if (entry.name.startsWith('.')) continue;

      const filePath = path.join(dir, entry.name);
      const urlPath = `${urlPrefix}/${entry.name}`;
      // Verknüpfungen (Symlinks) sind weder Datei noch Ordner und bleiben außen vor
      if (entry.isDirectory()) {
        visit(filePath, urlPath);
      } else if (entry.isFile() && Object.hasOwn(MIME_TYPES, path.extname(entry.name).toLowerCase())) {
        files.set(urlPath, filePath);
      }
    }
  };

  visit(publicDir, '');
  return files;
}

function sendNotFoundPage(req, res) {
  send(req, res, 404, NOT_FOUND_PAGE, {
    'Content-Type': MIME_TYPES['.html'],
    'Cache-Control': 'no-store',
    'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  });
}

// Fehlerformat der Schnittstelle: { "error": { "code", "message", "param"? } }
function sendError(req, res, status, code, message, param, extraHeaders = {}) {
  const error = { code, message };
  if (param !== undefined) error.param = param;
  sendJson(req, res, status, { error }, extraHeaders);
}

function sendJson(req, res, status, data, extraHeaders = {}) {
  // undefined (z. B. minPrice ohne Angabe) als null ausgeben statt wegzulassen
  const body = JSON.stringify(data, (key, value) => (value === undefined ? null : value));
  send(req, res, status, body, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
}

function send(req, res, status, body, headers) {
  const content = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
  res.writeHead(status, { ...BASE_HEADERS, ...headers, 'Content-Length': content.length });
  // HEAD: dieselben Kopfzeilen, aber kein Inhalt
  res.end(req.method === 'HEAD' ? undefined : content);
}

// PORT aus der Umgebung, sonst 3000
function readPort(env) {
  const text = env.PORT || String(DEFAULT_PORT);
  if (!/^\d+$/.test(text) || Number(text) > 65535) {
    return undefined;
  }
  return Number(text);
}

function start() {
  const port = readPort(process.env);
  if (port === undefined) {
    console.error(`Fehler: PORT "${process.env.PORT}" ist keine gültige Portnummer (0 bis 65535)`);
    process.exitCode = 1;
    return;
  }

  // Daten einmal prüfen. Ein Fehler verhindert den Start nicht, die Seiten zeigen ihn an.
  try {
    loadBikes();
  } catch (error) {
    console.warn(`Warnung: Fehler beim Einlesen der Fahrrad-Daten: ${error.message}`);
    console.warn('Der Server startet trotzdem, die Seiten zeigen den Fehler an.\n');
  }

  const server = createServer();
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Fehler: Port ${port} ist schon belegt. Läuft der Server vielleicht schon?`);
      console.error('Anderen Port über die Umgebungsvariable PORT wählen, z. B. in PowerShell:');
      console.error('  $env:PORT=3001; npm run web');
    } else {
      console.error(`Fehler: Server konnte nicht starten: ${error.message}`);
    }
    process.exitCode = 1;
  });

  server.listen(port, HOST, () => {
    const base = `http://${HOST}:${server.address().port}`;
    console.log('EasyBike Weboberfläche läuft:\n');
    console.log(`  Kundenansicht:  ${base}/`);
    console.log(`  Verwaltung:     ${base}/admin`);
    console.log(`  API-Beispiel:   ${base}/api/bikes?typ=E-Bike&sort=preis\n`);
    console.log('Beenden mit Strg+C');
  });
}

if (require.main === module) {
  start();
}

module.exports = { createServer };
