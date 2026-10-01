// Prüft die ECHTE Website in public/: alle verlinkten Dateien sind erreichbar,
// nichts wird von fremden Servern geladen, und das HTML verträgt die strenge CSP.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../src/server');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES = ['/', '/admin'];
const MIME = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

// Alle lokalen Verweise einer Seite: src/href im HTML, import im JS, url() im CSS
async function collectReferences() {
  const found = new Set();
  const queue = [];
  const add = reference => {
    if (!reference.startsWith('/') || reference.startsWith('/api/') || found.has(reference)) return;
    found.add(reference);
    queue.push(reference);
  };

  for (const page of PAGES) {
    const html = await (await fetch(base + page)).text();
    for (const match of html.matchAll(/\s(?:src|href)="([^"#]+)"/g)) add(match[1]);
  }
  while (queue.length > 0) {
    const reference = queue.shift();
    const response = await fetch(base + reference);
    if (!response.ok) continue;
    const text = await response.text();
    if (reference.endsWith('.js')) {
      for (const match of text.matchAll(/from\s+'(\.\/[^']+)'/g)) {
        add(path.posix.join(path.posix.dirname(reference), match[1]));
      }
    }
    if (reference.endsWith('.css')) {
      for (const match of text.matchAll(/url\('?([^')]+)'?\)/g)) add(match[1]);
    }
  }
  return [...found];
}

test('alle verlinkten Dateien kommen mit 200 und passendem Typ', async () => {
  const references = await collectReferences();
  // Seiten, Stylesheet, Schrift, Favicon und alle Module müssen dabei sein
  for (const expected of ['/css/style.css', '/fonts/PlusJakartaSans.woff2', '/img/favicon.svg',
    '/js/customer.js', '/js/admin.js', '/js/controller.js', '/js/common.js', '/js/filters.js', '/js/art.js', '/js/booking.js']) {
    assert.ok(references.includes(expected), `${expected} wird nicht verlinkt`);
  }
  for (const reference of references) {
    const response = await fetch(base + reference);
    assert.equal(response.status, 200, reference);
    const type = MIME[path.extname(reference)];
    if (type) assert.ok(response.headers.get('content-type').startsWith(type), `${reference}: ${response.headers.get('content-type')}`);
  }
});

test('keine Inhalte von fremden Servern', () => {
  for (const file of listFiles(PUBLIC_DIR).filter(name => /\.(html|css|js)$/.test(name))) {
    const text = fs.readFileSync(file, 'utf8');
    // Erlaubt: SVG-Namensraum und Links in Kommentaren (Lizenzhinweise)
    // Zeilenkommentare nur am Zeilenanfang oder nach Leerraum, damit "https://" im Code bleibt
    const code = text.replace(/(^|\s)\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
    const external = [...code.matchAll(/https?:\/\/[^\s"'`)]+/g)]
      .map(match => match[0])
      .filter(url => !url.startsWith('http://www.w3.org/2000/svg'));
    assert.deepEqual(external, [], path.relative(PUBLIC_DIR, file));
  }
});

test('HTML ohne Inline-Skripte, style- und on…-Attribute (strenge CSP)', () => {
  for (const name of ['index.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, name), 'utf8');
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, `${name}: <script> ohne src`);
    assert.doesNotMatch(html, /\sstyle\s*=/, `${name}: style-Attribut`);
    assert.doesNotMatch(html, /\son[a-z]+\s*=/, `${name}: on…-Attribut`);
    assert.doesNotMatch(html, /<style[\s>]/, `${name}: <style>-Element`);
  }
});

test('JavaScript baut die Seite ohne innerHTML', () => {
  for (const file of listFiles(path.join(PUBLIC_DIR, 'js')).filter(name => name.endsWith('.js'))) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write/, path.basename(file));
  }
});

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}
