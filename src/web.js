// Web-Adapter: wandelt die Parameter einer Adresse wie /api/bikes?typ=E-Bike&sort=preis
// in dieselbe Abfrage um wie die Kommandozeile (buildQuery in search.js) und liefert
// Zusatzangaben für die Filter der Web-Seite. Reine Funktionen ohne Ein-/Ausgabe.
const { STATUSES } = require('./bikes');
const { FILTER_FIELDS, isSameText, filterBikes } = require('./query');
const {
  UsageError,
  FILTER_OPTIONS,
  SORT_OPTIONS,
  FIELD_LABELS,
  buildQuery,
  singleValue,
} = require('./search');

// Erlaubte Parameter: dieselben wie die Optionen der Kommandozeile, ohne --help
const WEB_PARAMS = new Set([
  'farbe',
  'typ',
  'marke',
  'status',
  'preis-min',
  'preis-max',
  'sort',
  'absteigend',
]);

// Namen in den Fehlermeldungen der Web-Schnittstelle
const WEB_LABELS = {
  param: name => `Parameter "${name}"`,
  minPrice: 'Mindestpreis',
  maxPrice: 'Höchstpreis',
};

// "absteigend=1" bzw. "absteigend=0" statt des Schalters --absteigend
const DESCENDING_VALUES = new Map([
  ['1', true],
  ['true', true],
  ['0', false],
  ['false', false],
]);

// Reihenfolge der Filtergruppen in relaxations(), "preis" = Mindest- und Höchstpreis
const RELAX_ORDER = ['typ', 'preis', 'status', 'marke', 'farbe'];

// Deutsche Sortierreihenfolge wie in findUnknownValues() (query.js)
const sortCollator = new Intl.Collator('de', { numeric: true });

// Nimmt URLSearchParams oder einen Query-String ("typ=E-Bike&sort=preis").
// Wirft einen UsageError, wenn etwas nicht stimmt.
function parseWebParams(searchParams) {
  const params =
    searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);

  // Nur bekannte Namen landen als Schlüssel in values, also auch kein "__proto__"
  const values = {};
  for (const [name, value] of params) {
    if (!WEB_PARAMS.has(name)) {
      throw new UsageError(`Unbekannter Parameter "${name}"`, name);
    }
    if (!value.trim()) {
      throw new UsageError(`Parameter "${name}" braucht einen Wert`, name);
    }
    (values[name] ??= []).push(value);
  }

  if (values.absteigend) {
    const text = singleValue(values, 'absteigend', WEB_LABELS);
    // Groß-/Kleinschreibung egal, wie bei sort und den Filterwerten
    const descending = DESCENDING_VALUES.get(text.trim().toLowerCase());
    if (descending === undefined) {
      throw new UsageError(
        `Parameter "absteigend" erwartet 1, true, 0 oder false, bekam aber "${text}"`,
        'absteigend'
      );
    }
    values.absteigend = descending;
  }

  return buildQuery(values, WEB_LABELS);
}

// Anzahl Treffer pro Filterwert, z. B. für "Frei (2)" neben einem Kontrollkästchen.
// Für jedes Feld gelten alle ANDEREN Filter (inkl. Preis), das Feld selbst nicht:
// so sieht man, wie viele Räder dazukämen, wenn man einen weiteren Wert anhakt.
function facets(bikes, query = {}) {
  const result = {};
  for (const field of FILTER_FIELDS) {
    const others = filterBikes(bikes, withoutField(query, field));
    result[field] = valuesOf(bikes, field).map(value => ({
      value,
      count: filterBikes(others, { filters: { [field]: [value] } }).length,
    }));
  }
  return result;
}

// Wie viele Treffer gäbe es, wenn man eine aktive Filtergruppe weglässt?
// Hilft bei "keine Treffer": z. B. "ohne Typ-Filter wären es 5".
function relaxations(bikes, query = {}) {
  const relax = [];
  for (const param of RELAX_ORDER) {
    const relaxed = withoutGroup(query, param);
    if (relaxed) {
      relax.push({ param, count: filterBikes(bikes, relaxed).length });
    }
  }
  return relax;
}

// Auswahlmöglichkeiten für die Filter der Web-Seite, gezählt über den ganzen Bestand
function buildOptions(bikes) {
  const counts = facets(bikes);
  const rates = bikes.map(bike => bike.hourly_rate);

  return {
    total: bikes.length,
    filters: {
      ...counts,
      bike_type: counts.bike_type.map(entry => ({
        ...entry,
        hourly_rate: bikes.find(bike => bike.bike_type === entry.value).hourly_rate,
      })),
    },
    price: {
      min: rates.length > 0 ? Math.min(...rates) : null,
      max: rates.length > 0 ? Math.max(...rates) : null,
    },
    sort: [...SORT_OPTIONS].map(([key, field]) => ({
      key,
      label: key === 'id' ? 'Nr.' : FIELD_LABELS[field],
    })),
  };
}

// Alle Werte eines Feldes im Bestand, deutsch sortiert. Werte, die sich nur in
// Groß-/Kleinschreibung unterscheiden, zählen als einer (wie beim Filtern).
// Status immer vollständig und in der festen Reihenfolge.
function valuesOf(bikes, field) {
  if (field === 'status') return [...STATUSES];

  const values = [];
  for (const bike of bikes) {
    if (!values.some(existing => isSameText(existing, bike[field]))) {
      values.push(bike[field]);
    }
  }
  return values.sort(sortCollator.compare);
}

function withoutField({ filters = {}, minPrice, maxPrice }, field) {
  const otherFilters = { ...filters };
  delete otherFilters[field];
  return { filters: otherFilters, minPrice, maxPrice };
}

// Abfrage ohne diese Filtergruppe, oder null, wenn die Gruppe gar nicht aktiv ist
function withoutGroup(query, param) {
  const { filters = {}, minPrice, maxPrice } = query;
  if (param === 'preis') {
    return minPrice === undefined && maxPrice === undefined ? null : { filters };
  }
  const field = FILTER_OPTIONS.get(param);
  return filters[field]?.length > 0 ? withoutField(query, field) : null;
}

module.exports = {
  WEB_PARAMS,
  WEB_LABELS,
  parseWebParams,
  facets,
  relaxations,
  buildOptions,
};
