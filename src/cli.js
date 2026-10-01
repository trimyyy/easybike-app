const { parseArgs } = require('node:util');
const { UsageError, SORT_OPTIONS, FIELD_LABELS, buildQuery } = require('./search');

// Alle Werte mit multiple: true, damit doppelte Angaben wie
// "--sort preis --sort marke" erkannt werden, statt still die letzte zu nehmen
const OPTIONS = {
  farbe: { type: 'string', multiple: true },
  typ: { type: 'string', multiple: true },
  marke: { type: 'string', multiple: true },
  status: { type: 'string', multiple: true },
  'preis-min': { type: 'string', multiple: true },
  'preis-max': { type: 'string', multiple: true },
  sort: { type: 'string', multiple: true },
  absteigend: { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
};

const HELP_TEXT = `Verwendung: npm start -- [Optionen]
      oder: node src/index.js [Optionen]

Filter:
  --farbe <Farbe>      z. B. --farbe Rot
  --typ <Typ>          z. B. --typ E-Bike
  --marke <Marke>      z. B. --marke "Riese & Müller"
  --status <Status>    Frei, Reserviert, "In Benutzung" oder Wartung
  --preis-min <Euro>   Mindestpreis pro Stunde, z. B. 4 oder 4,50
  --preis-max <Euro>   Höchstpreis pro Stunde

  Dieselbe Option mehrmals: eines davon muss passen
  (--farbe Rot --farbe Blau = rot oder blau).
  Verschiedene Optionen: alle müssen passen.
  Preisgrenzen zählen mit (--preis-max 5 findet auch 5,00 €).
  Groß-/Kleinschreibung ist egal, Umlaute zählen: "grün" findet "Grün".

Sortierung:
  --sort <Feld>        ${[...SORT_OPTIONS.keys()].join(', ')} (Standard: id)
  --absteigend         absteigend statt aufsteigend sortieren

  -h, --help           diese Hilfe anzeigen

Beispiele:
  npm start -- --typ E-Bike --status Frei --sort preis
  npm start -- --farbe Rot --farbe Blau --preis-max 5
  npm start -- --sort marke --absteigend`;

// Wandelt die Kommandozeilen-Argumente in eine Abfrage für queryBikes() um.
// Die eigentliche Prüfung steckt in buildQuery(), die auch die Web-Schnittstelle nutzt.
// Wirft einen UsageError, wenn etwas nicht stimmt.
function parseCliArgs(argv) {
  const { values, tokens } = parseArgs({
    args: argv,
    options: OPTIONS,
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  checkTokens(tokens);

  if (values.help) {
    return { help: true };
  }

  return { help: false, ...buildQuery(values) };
}

// Eigene Prüfung statt parseArgs' strict-Modus, damit die Meldungen deutsch sind
function checkTokens(tokens) {
  for (const token of tokens) {
    if (token.kind === 'positional') {
      throw new UsageError(`Unerwartetes Argument "${token.value}"`);
    }
    if (token.kind !== 'option') continue;

    if (!Object.hasOwn(OPTIONS, token.name)) {
      throw new UsageError(`Unbekannte Option "${token.rawName}"`, token.name);
    }

    const expectsValue = OPTIONS[token.name].type === 'string';
    if (expectsValue) {
      if (typeof token.value !== 'string' || !token.value.trim()) {
        throw new UsageError(`Option "${token.rawName}" braucht einen Wert`, token.name);
      }
      // "--farbe --sort preis": hier wurde die nächste Option als Wert gelesen
      if (!token.inlineValue && token.value.startsWith('-')) {
        const hint = token.name === 'sort' ? ' (absteigend: --sort preis --absteigend)' : '';
        throw new UsageError(
          `Option "${token.rawName}" braucht einen Wert, bekam aber "${token.value}"${hint}`,
          token.name
        );
      }
    } else if (token.value !== undefined) {
      throw new UsageError(`Option "${token.rawName}" erwartet keinen Wert`, token.name);
    }
  }
}

// Startet man "npm start --farbe Rot" ohne "--", fängt npm die Option ab und
// das Programm bekommt sie nie zu sehen. npm legt sie dann als Umgebungsvariable
// npm_config_farbe ab. Daran lässt sich der Fehler erkennen.
function findSwallowedNpmOptions(env) {
  if (!env.npm_lifecycle_event) return [];
  return Object.keys(OPTIONS)
    .filter(option => env[`npm_config_${option.replaceAll('-', '_')}`] !== undefined)
    .map(option => `--${option}`);
}

module.exports = { UsageError, FIELD_LABELS, HELP_TEXT, parseCliArgs, findSwallowedNpmOptions };
