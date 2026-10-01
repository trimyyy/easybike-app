// Gemeinsame Prüfung und Suche für Kommandozeile und Web-Schnittstelle.
// Reine Funktionen ohne Ein-/Ausgabe: beide Oberflächen wandeln ihre Eingabe
// in dieselben "values" um und bekommen dieselbe Abfrage und dieselben Treffer.
const { STATUSES } = require('./bikes');
const { isSameText, queryBikes, findUnknownValues } = require('./query');

// Fehler in der Bedienung, z. B. unbekannte Option oder ungültiger Preis.
// param nennt die betroffene Option bzw. den Parameter ohne "--", z. B. 'preis-min'.
class UsageError extends Error {
  constructor(message, param) {
    super(message);
    this.name = 'UsageError';
    this.param = param;
  }
}

// Name der Option bzw. des Parameters -> Feld in den Daten
const FILTER_OPTIONS = new Map([
  ['farbe', 'color'],
  ['typ', 'bike_type'],
  ['marke', 'brand'],
  ['status', 'status'],
]);
const SORT_OPTIONS = new Map([
  ['id', 'bike_id'],
  ['marke', 'brand'],
  ['farbe', 'color'],
  ['typ', 'bike_type'],
  ['status', 'status'],
  ['preis', 'hourly_rate'],
]);

const FIELD_LABELS = {
  bike_id: 'ID',
  brand: 'Marke',
  color: 'Farbe',
  bike_type: 'Typ',
  status: 'Status',
  hourly_rate: 'Preis',
};

// Namen in den Fehlermeldungen. Standard sind die Texte der Kommandozeile.
const CLI_LABELS = {
  param: name => `Option "--${name}"`,
  minPrice: '--preis-min',
  maxPrice: '--preis-max',
};

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

// Wandelt die Werte in eine Abfrage für queryBikes() um. Form wie bei parseArgs
// mit multiple: true: { farbe: ['Rot'], sort: ['preis'], absteigend: true, … }.
// Wirft einen UsageError, wenn etwas nicht stimmt.
function buildQuery(values, labels = CLI_LABELS) {
  const filters = {};
  for (const [option, field] of FILTER_OPTIONS) {
    if (values[option]) {
      filters[field] = values[option].map(value => value.trim());
    }
  }

  // Status hat feste Werte, ein unbekannter Wert ist also ein Tippfehler
  for (const status of filters.status ?? []) {
    if (!STATUSES.some(allowed => isSameText(allowed, status))) {
      throw new UsageError(`Unbekannter Status "${status}". Erlaubt: ${STATUSES.join(', ')}`, 'status');
    }
  }

  const minPrice = parsePrice(singleValue(values, 'preis-min', labels), labels.minPrice, 'preis-min');
  const maxPrice = parsePrice(singleValue(values, 'preis-max', labels), labels.maxPrice, 'preis-max');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new UsageError(
      `${labels.minPrice} (${minPrice.toLocaleString('de-DE')}) ist größer als ` +
        `${labels.maxPrice} (${maxPrice.toLocaleString('de-DE')})`,
      'preis-min'
    );
  }

  const sortName = singleValue(values, 'sort', labels) ?? 'id';
  const sortField = SORT_OPTIONS.get(sortName.trim().toLowerCase());
  if (!sortField) {
    throw new UsageError(
      `Unbekanntes Sortierfeld "${sortName}". Erlaubt: ${[...SORT_OPTIONS.keys()].join(', ')}`,
      'sort'
    );
  }

  return {
    filters,
    minPrice,
    maxPrice,
    sort: { field: sortField, descending: values.absteigend === true },
  };
}

function singleValue(values, option, labels = CLI_LABELS) {
  const given = values[option];
  if (given === undefined) return undefined;
  if (given.length > 1) {
    throw new UsageError(`${labels.param(option)} darf nur einmal angegeben werden`, option);
  }
  return given[0];
}

// Akzeptiert 4, 4.5 und 4,50. Keine negativen Zahlen, kein "1e3" oder "0x10".
function parsePrice(text, label, param) {
  if (text === undefined) return undefined;
  const trimmed = text.trim();
  if (!/^\d+([.,]\d+)?$/.test(trimmed)) {
    throw new UsageError(`${label}: "${text}" ist kein gültiger Preis (Beispiel: 4.50 oder 4,50)`, param);
  }
  return Number(trimmed.replace(',', '.'));
}

// Filtert und sortiert. Meldet dazu Filterwerte, die es im Bestand nicht gibt.
// Status ist schon in buildQuery() gegen die festen Werte geprüft.
function searchBikes(bikes, query) {
  const openFilters = { ...query.filters };
  delete openFilters.status;

  const hints = findUnknownValues(bikes, openFilters).map(({ field, value, available }) => ({
    field,
    param: optionFor(field),
    value,
    available,
    message:
      `${FIELD_LABELS[field]} "${value}" gibt es im Bestand nicht. ` +
      `Vorhanden: ${available.join(', ')}`,
  }));

  return { bikes: queryBikes(bikes, query), total: bikes.length, hints };
}

function optionFor(field) {
  return [...FILTER_OPTIONS].find(([, filterField]) => filterField === field)?.[0];
}

function describeFilters({ filters, minPrice, maxPrice }) {
  const parts = Object.entries(filters).map(
    ([field, values]) => `${FIELD_LABELS[field]}: ${values.join(' oder ')}`
  );
  if (minPrice !== undefined) parts.push(`Preis ab ${euro.format(minPrice)}`);
  if (maxPrice !== undefined) parts.push(`Preis bis ${euro.format(maxPrice)}`);
  return parts.length > 0 ? parts.join(' | ') : 'keine';
}

function describeSort({ field, descending }) {
  return `${FIELD_LABELS[field]} ${descending ? 'absteigend' : 'aufsteigend'}`;
}

// Derselbe Aufruf für das Terminal, z. B.
// npm start -- --typ E-Bike --status Frei --sort preis --absteigend
function toCliCommand({ filters = {}, minPrice, maxPrice, sort = {} }) {
  const args = [];
  for (const [option, field] of FILTER_OPTIONS) {
    for (const value of filters[field] ?? []) {
      args.push(cliOption(option, value));
    }
  }
  if (minPrice !== undefined) args.push(cliOption('preis-min', String(minPrice)));
  if (maxPrice !== undefined) args.push(cliOption('preis-max', String(maxPrice)));

  // Standard-Sortierung (id aufsteigend) weglassen
  const sortOption = [...SORT_OPTIONS].find(([, field]) => field === sort.field)?.[0];
  if (sortOption && sortOption !== 'id') args.push(cliOption('sort', sortOption));
  if (sort.descending) args.push('--absteigend');

  return args.length > 0 ? `npm start -- ${args.join(' ')}` : 'npm start';
}

function cliOption(option, value) {
  // Werte mit Leerzeichen oder Sonderzeichen wie & in doppelte Anführungszeichen
  const quoted = /^[\p{L}\p{N}.,_+-]+$/u.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`;
  // "--farbe -x" hielte die Kommandozeile für eine fehlende Angabe, "--farbe=-x" nicht
  return value.startsWith('-') ? `--${option}=${quoted}` : `--${option} ${quoted}`;
}

module.exports = {
  UsageError,
  FILTER_OPTIONS,
  SORT_OPTIONS,
  FIELD_LABELS,
  CLI_LABELS,
  buildQuery,
  singleValue,
  parsePrice,
  searchBikes,
  describeFilters,
  describeSort,
  toCliCommand,
};
