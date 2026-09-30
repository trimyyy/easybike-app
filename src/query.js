// Filtern und Sortieren der Fahrräder. Reine Funktionen ohne Ein-/Ausgabe,
// damit sie später auch für eine Web-Schnittstelle genutzt werden können.
//
// Aufbau einer Abfrage (alle Teile optional):
// {
//   filters:  { color: ['Rot', 'Blau'], bike_type: ['E-Bike'] },
//   minPrice: 3,
//   maxPrice: 5,
//   sort:     { field: 'hourly_rate', descending: true },
// }

// Nur diese Felder dürfen gefiltert bzw. sortiert werden
const FILTER_FIELDS = ['brand', 'color', 'bike_type', 'status'];
const SORT_FIELDS = ['bike_id', 'brand', 'color', 'bike_type', 'status', 'hourly_rate'];

// Groß-/Kleinschreibung egal, Umlaute zählen: "grün" = "Grün", aber "grun" ≠ "Grün"
const matchCollator = new Intl.Collator('de', { sensitivity: 'accent' });
// Deutsche Sortierreihenfolge, Zahlen in Texten numerisch: BK-9 vor BK-10
const sortCollator = new Intl.Collator('de', { numeric: true });

function isSameText(a, b) {
  return matchCollator.compare(a, b) === 0;
}

function assertAllowedField(allowed, field) {
  if (!allowed.includes(field)) {
    throw new Error(`Feld "${field}" ist nicht erlaubt. Erlaubt: ${allowed.join(', ')}`);
  }
}

// Mehrere Werte eines Feldes: eines davon muss passen (oder).
// Verschiedene Felder und die Preisgrenzen: alle müssen passen (und).
// Preisgrenzen schließen den Grenzwert mit ein.
function filterBikes(bikes, { filters = {}, minPrice, maxPrice } = {}) {
  const activeFilters = Object.entries(filters).filter(([, values]) => values.length > 0);
  for (const [field] of activeFilters) {
    assertAllowedField(FILTER_FIELDS, field);
  }

  return bikes.filter(bike =>
    activeFilters.every(([field, values]) => values.some(value => isSameText(bike[field], value))) &&
    (minPrice === undefined || bike.hourly_rate >= minPrice) &&
    (maxPrice === undefined || bike.hourly_rate <= maxPrice)
  );
}

// Sortiert nach einem Feld. Bei gleichem Wert entscheidet immer die bike_id
// (aufsteigend), damit die Reihenfolge eindeutig ist.
// Gibt ein neues Array zurück, das Original bleibt unverändert.
function sortBikes(bikes, { field = 'bike_id', descending = false } = {}) {
  assertAllowedField(SORT_FIELDS, field);
  const direction = descending ? -1 : 1;

  return bikes.toSorted((a, b) =>
    direction * compareField(a, b, field) || sortCollator.compare(a.bike_id, b.bike_id)
  );
}

function compareField(a, b, field) {
  if (field === 'hourly_rate') {
    return a.hourly_rate - b.hourly_rate;
  }
  return sortCollator.compare(a[field], b[field]);
}

function queryBikes(bikes, query = {}) {
  return sortBikes(filterBikes(bikes, query), query.sort);
}

// Findet Filterwerte, die bei keinem Fahrrad vorkommen (z. B. Tippfehler),
// zusammen mit den tatsächlich vorhandenen Werten des Feldes.
function findUnknownValues(bikes, filters = {}) {
  const unknown = [];
  for (const [field, values] of Object.entries(filters)) {
    assertAllowedField(FILTER_FIELDS, field);
    const available = [...new Set(bikes.map(bike => bike[field]))].sort(sortCollator.compare);

    for (const value of values) {
      if (!available.some(existing => isSameText(existing, value))) {
        unknown.push({ field, value, available });
      }
    }
  }
  return unknown;
}

module.exports = {
  FILTER_FIELDS,
  SORT_FIELDS,
  isSameText,
  filterBikes,
  sortBikes,
  queryBikes,
  findUnknownValues,
};
