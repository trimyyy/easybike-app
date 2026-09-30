const { loadBikes } = require('./bikes');
const { queryBikes, findUnknownValues } = require('./query');
const {
  UsageError,
  FIELD_LABELS,
  HELP_TEXT,
  parseCliArgs,
  findSwallowedNpmOptions,
} = require('./cli');

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

// Exit-Codes: 0 = ok (auch wenn nichts gefunden wurde), 1 = Datenfehler, 2 = Bedienfehler
function main(argv, env) {
  const swallowed = findSwallowedNpmOptions(env);
  if (swallowed.length > 0) {
    reportUsageError(
      `npm hat ${swallowed.join(', ')} abgefangen, weil "--" fehlt. ` +
        'Richtig ist z. B.: npm start -- --farbe Rot'
    );
    return;
  }

  let query;
  try {
    query = parseCliArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    reportUsageError(error.message);
    return;
  }

  if (query.help) {
    console.log(HELP_TEXT);
    return;
  }

  let bikes;
  try {
    bikes = loadBikes();
  } catch (error) {
    console.error('Fehler beim Einlesen der Fahrrad-Daten:', error.message);
    process.exitCode = 1;
    return;
  }

  // Status ist schon in parseCliArgs() gegen die festen Werte geprüft
  const openFilters = { ...query.filters };
  delete openFilters.status;
  for (const { field, value, available } of findUnknownValues(bikes, openFilters)) {
    console.error(
      `Hinweis: ${FIELD_LABELS[field]} "${value}" gibt es im Bestand nicht. ` +
        `Vorhanden: ${available.join(', ')}`
    );
  }

  printBikes(queryBikes(bikes, query), bikes.length, query);
}

function reportUsageError(message) {
  console.error(`Fehler: ${message}`);
  console.error('Hilfe: npm start -- --help');
  process.exitCode = 2;
}

// Gibt die gefundenen Fahrräder als Tabelle im Terminal aus
function printBikes(bikes, total, query) {
  console.log('=========================================');
  console.log('    EASYBIKE Fahrradverleih Datensatz');
  console.log('=========================================\n');

  console.log(`Filter:     ${describeFilters(query)}`);
  console.log(`Sortierung: ${describeSort(query.sort)}\n`);

  if (bikes.length === 0) {
    console.log('Keine Fahrräder gefunden, die den Filtern entsprechen.');
  } else {
    console.table(bikes.map(toTableRow));
  }

  console.log(`\n${bikes.length} von ${total} Fahrrädern`);
}

// Deutsche Spaltennamen wie bei den Optionen (--farbe -> Farbe), Preis in Euro.
// Zusätzliche Spalten aus der CSV-Datei behalten ihren Namen.
function toTableRow(bike) {
  const row = {};
  for (const [field, value] of Object.entries(bike)) {
    const label = Object.hasOwn(FIELD_LABELS, field) ? FIELD_LABELS[field] : field;
    row[label] = field === 'hourly_rate' ? euro.format(value) : value;
  }
  return row;
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

main(process.argv.slice(2), process.env);
