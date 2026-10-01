// Reine Funktionen der Website (ohne Browser): URL-Zustand und Regeln der Reservierung.
// Die Module in public/js sind ES-Module und werden deshalb mit import() geladen.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');

let common;
let booking;

before(async () => {
  common = await import('../public/js/common.js');
  booking = await import('../public/js/booking.js');
});

// ---------- URL-Zustand ----------

test('readState liest dieselben Parameter wie die Kommandozeile', () => {
  const state = common.readState('?farbe=Rot&farbe=%20Blau%20&typ=E-Bike&preis-min=4,50&sort=PREIS&absteigend=TRUE&colour=x');
  assert.deepEqual(state.farbe, ['Rot', 'Blau']);
  assert.deepEqual(state.typ, ['E-Bike']);
  assert.deepEqual(state.status, []);
  assert.equal(state['preis-min'], '4,50');
  assert.equal(state['preis-max'], '');
  assert.equal(state.sort, 'preis');
  assert.equal(state.absteigend, true);
});

test('toQueryString: feste Reihenfolge, Standard-Sortierung weggelassen', () => {
  const state = common.readState('?sort=id&farbe=Rot&status=In%20Benutzung&typ=E-Bike');
  assert.equal(common.toQueryString(state), 'typ=E-Bike&status=In+Benutzung&farbe=Rot');
  assert.equal(common.toQueryString(common.emptyState()), '');
  assert.equal(common.toQueryString(common.readState('?absteigend=1')), 'absteigend=1');
  assert.equal(common.toQueryString(common.readState('?preis-max=5&sort=preis')), 'preis-max=5&sort=preis');
});

test('readState und toQueryString passen zusammen', () => {
  const query = 'typ=E-Bike&typ=Citybike&status=Frei&marke=Riese+%26+M%C3%BCller&farbe=Gr%C3%BCn&preis-min=3.5&preis-max=6&sort=marke&absteigend=1';
  assert.equal(common.toQueryString(common.readState(`?${query}`)), query);
});

test('canonicalize übernimmt die Schreibweise aus den Daten und entfernt Doppelte', () => {
  const facets = {
    color: [{ value: 'Rot', count: 2 }, { value: 'Grün', count: 1 }],
    bike_type: [{ value: 'E-Bike', count: 4 }],
    brand: [],
    status: [{ value: 'Frei', count: 5 }],
  };
  const state = common.canonicalize(common.readState('?farbe=rot&farbe=ROT&farbe=grün&farbe=grun&typ=e-bike&status=frei'), facets);
  assert.deepEqual(state.farbe, ['Rot', 'Grün', 'grun']);
  assert.deepEqual(state.typ, ['E-Bike']);
  assert.deepEqual(state.status, ['Frei']);
});

test('activeFilterCount zählt Werte, Preis als ein Filter', () => {
  assert.equal(common.activeFilterCount(common.readState('?farbe=Rot&farbe=Blau&preis-min=4&preis-max=5')), 3);
  assert.equal(common.activeFilterCount(common.emptyState()), 0);
});

test('euroText formatiert gültige Preise, lässt ungültige stehen', () => {
  assert.equal(common.euroText('4,5').replace(/\s/g, ' '), '4,50 €');
  assert.equal(common.euroText('6').replace(/\s/g, ' '), '6,00 €');
  assert.equal(common.euroText('abc'), 'abc €');
});

// ---------- Reservierung ----------

const NOW_MORNING = { date: '2026-10-01', minutes: 10 * 60 + 5 }; // 10:05 in Wien
const NOW_LATE = { date: '2026-10-01', minutes: 17 * 60 + 31 }; // 17:31

test('Startzeiten: 08:00 bis 17:30, heute nur zukünftige', () => {
  const tomorrow = booking.startSlots('2026-10-02', NOW_MORNING);
  assert.equal(tomorrow.length, 20);
  assert.equal(booking.timeText(tomorrow[0]), '08:00');
  assert.equal(booking.timeText(tomorrow.at(-1)), '17:30');
  assert.equal(booking.timeText(booking.startSlots('2026-10-01', NOW_MORNING)[0]), '10:30');
  assert.deepEqual(booking.startSlots('2026-10-01', NOW_LATE), []);
});

test('frühestes Datum ist morgen, wenn heute nichts mehr frei ist', () => {
  assert.equal(booking.firstBookableDate(NOW_MORNING), '2026-10-01');
  assert.equal(booking.firstBookableDate(NOW_LATE), '2026-10-02');
});

test('Dauer nur so lange, dass die Rückgabe bis 18:00 klappt', () => {
  assert.deepEqual(booking.durations(17 * 60 + 30), [30]);
  assert.equal(booking.durations(8 * 60).at(-1), 10 * 60);
  assert.equal(booking.durationText(30), '30 Min.');
  assert.equal(booking.durationText(90), '1,5 Std.');
  assert.equal(booking.durationText(120), '2 Std.');
});

test('checkBooking berechnet den Preis aus Dauer und Stundensatz', () => {
  const result = booking.checkBooking({ date: '2026-10-01', start: 16 * 60, duration: 90, hourlyRate: 3.5 }, NOW_MORNING);
  assert.equal(result.error, undefined);
  assert.equal(result.total, 5.25);
  assert.equal(result.end, 17 * 60 + 30);
});

test('checkBooking lehnt ungültige Angaben mit verständlicher Meldung ab', () => {
  const base = { date: '2026-10-02', start: 10 * 60, duration: 60, hourlyRate: 6 };
  assert.match(booking.checkBooking({ ...base, date: '' }, NOW_MORNING).error, /Datum/);
  assert.match(booking.checkBooking({ ...base, date: '2026-09-30' }, NOW_MORNING).error, /Vergangenheit/);
  assert.match(booking.checkBooking({ ...base, date: '2026-12-31' }, NOW_MORNING).error, /60 Tage/);
  assert.match(booking.checkBooking({ ...base, date: '2026-10-01', start: 10 * 60 }, NOW_MORNING).error, /heute nicht mehr/);
  assert.match(booking.checkBooking({ ...base, start: 7 * 60 }, NOW_MORNING).error, /08:00 und 17:30/);
  assert.match(booking.checkBooking({ ...base, start: 17 * 60, duration: 90 }, NOW_MORNING).error, /18:00/);
});

test('addDays rechnet über Monatsende und Zeitumstellung', () => {
  assert.equal(booking.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(booking.addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(booking.addDays('2026-10-01', 60), '2026-11-30');
});
