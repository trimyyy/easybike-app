// Kundenansicht: Fahrräder finden, filtern, sortieren und (als Demo) reservieren.
// Filtern und Sortieren übernimmt der Server mit queryBikes(), siehe controller.js.
import {
  el, icon, hydrateIcons, fetchOptions, euro, plural, statusSlug, statusBadge, swatch, bikeArt,
  renderNotices, setupProof, fillSortSelect, setSortSelect, readSortSelect,
  updateOpenStatus, viennaNow, isSame,
} from './common.js';
import { createController } from './controller.js';
import {
  timeText, durationText, addDays, startSlots, durations, firstBookableDate, checkBooking, OPEN_UNTIL, MAX_DAYS_AHEAD,
} from './booking.js';

const LABELS = {
  typ: 'Typ',
  preis: 'Preis pro Stunde',
  status: 'Verfügbarkeit',
  marke: 'Marke',
  farbe: 'Farbe',
};

const UNAVAILABLE_TEXT = {
  reserviert: 'Reserviert',
  'in-benutzung': 'Unterwegs',
  wartung: 'In Wartung',
};

const $ = id => document.getElementById(id);

let controller;
let options;

hydrateIcons();
updateOpenStatus($('open-status'));
setInterval(() => updateOpenStatus($('open-status')), 60_000);
setupProof();
fillSortSelect($('sort-select'), { statusLabel: 'Verfügbarkeit' });
setupBooking();
init();

async function init() {
  try {
    options = await fetchOptions();
  } catch (error) {
    renderNotices($('notices'), { error });
    showNothingLoaded();
    return;
  }
  buildTypeChips();
  controller = createController({
    options,
    groups: ['typ', 'preis', 'status', 'marke', 'farbe'],
    labels: LABELS,
    busyElement: $('bike-grid'),
    onRender: render,
    onFirstLoadError: showNothingLoaded,
  });
  $('sort-select').addEventListener('change', event => controller.update(readSortSelect(event.target)));
  controller.start();
}

function showNothingLoaded() {
  $('bike-grid').replaceChildren();
  $('result-count').textContent = 'Keine Fahrräder geladen';
}

// ---------- Anzeige ----------

function render(data, state) {
  $('result-count').replaceChildren(
    `${data.count} `,
    el('span', {}, `von ${data.total} ${plural(data.total, 'Fahrrad', 'Fahrrädern')}`));
  updateTypeChips(state);
  setSortSelect($('sort-select'), state);

  const grid = $('bike-grid');
  grid.setAttribute('aria-busy', 'false');
  grid.replaceChildren(...data.bikes.map(bikeCard));
  grid.hidden = data.count === 0;
}

function bikeCard(bike) {
  const slug = statusSlug(bike.status);
  const free = slug === 'frei';
  const title = `${bike.brand} ${bike.bike_type}`;
  return el('article', { class: free ? 'bike-card' : 'bike-card is-unavailable', 'aria-label': `${title}, ${bike.color}, Nr. ${bike.bike_id}` },
    el('div', { class: 'bike-visual' },
      bikeArt(bike, { label: `${bike.bike_type} in ${bike.color}` }),
      statusBadge(bike.status)),
    el('div', { class: 'bike-body' },
      el('p', { class: 'bike-kicker' }, bike.bike_type),
      el('h3', { class: 'bike-title' }, bike.brand),
      el('p', { class: 'bike-meta' },
        el('span', {}, swatch(bike.color), bike.color),
        el('span', { class: 'bike-id' }, `Nr. ${bike.bike_id}`))),
    el('div', { class: 'bike-foot' },
      el('p', { class: 'bike-price' },
        el('strong', {}, euro(bike.hourly_rate)),
        el('span', { 'aria-hidden': 'true' }, '/ Std.'),
        el('span', { class: 'visually-hidden' }, 'pro Stunde')),
      free
        ? el('button', { type: 'button', class: 'btn btn-primary btn-sm', 'aria-label': `${title} reservieren`, onclick: () => openBooking(bike) }, 'Reservieren')
        : el('p', { class: 'bike-unavailable' }, UNAVAILABLE_TEXT[slug] ?? 'Nicht verfügbar')));
}

// ---------- Typ-Chips (Schnellfilter mit Preisliste) ----------

function buildTypeChips() {
  const all = el('button', {
    type: 'button',
    class: 'type-chip',
    dataset: { value: '' },
    onclick: () => controller.update({ typ: [] }),
  }, 'Alle');
  const chips = options.filters.bike_type.map(type => el('button', {
    type: 'button',
    class: 'type-chip',
    dataset: { value: type.value },
    onclick: () => controller.toggle('typ', type.value),
  }, type.value, el('span', { class: 'chip-price' }, euro(type.hourly_rate))));
  $('type-chips').replaceChildren(all, ...chips);
}

function updateTypeChips(state) {
  for (const chip of $('type-chips').children) {
    const value = chip.dataset.value;
    const pressed = value ? state.typ.some(item => isSame(item, value)) : state.typ.length === 0;
    chip.setAttribute('aria-pressed', String(pressed));
  }
}

// ---------- Reservierung (Demo, es wird nichts gespeichert) ----------

let bookingBike = null;
let bookingOpener = null;

function longDate(isoDate) {
  return new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${isoDate}T12:00:00Z`));
}

function setupBooking() {
  const dialog = $('booking');
  for (const button of dialog.querySelectorAll('[data-close-booking]')) {
    button.addEventListener('click', () => dialog.close());
  }
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  // Fokus zurück auf den Button „Reservieren“, von dem aus der Dialog geöffnet wurde
  dialog.addEventListener('close', () => {
    if (bookingOpener?.isConnected) bookingOpener.focus();
  });
  $('booking-date').addEventListener('change', () => {
    fillStarts();
    updateBookingPrice();
  });
  $('booking-start').addEventListener('change', () => {
    fillDurations();
    updateBookingPrice();
  });
  $('booking-hours').addEventListener('change', updateBookingPrice);
  $('booking-form').addEventListener('submit', event => {
    event.preventDefault();
    confirmBooking();
  });
}

function openBooking(bike) {
  bookingBike = bike;
  bookingOpener = document.activeElement;
  const now = viennaNow();
  const date = $('booking-date');
  date.min = firstBookableDate(now);
  date.max = addDays(now.date, MAX_DAYS_AHEAD);
  if (!date.value || date.value < date.min || date.value > date.max) date.value = date.min;

  $('booking-bike').replaceChildren(
    bikeArt(bike),
    el('div', {},
      el('h3', {}, `${bike.brand} · ${bike.bike_type}`),
      el('p', {}, `${bike.color} · Nr. ${bike.bike_id}`),
      el('p', {}, `${euro(bike.hourly_rate)} pro Stunde`)));

  fillStarts();
  updateBookingPrice();
  $('booking-form').hidden = false;
  $('booking-done').hidden = true;
  $('booking').showModal();
}

function fillStarts() {
  const select = $('booking-start');
  const previous = Number(select.value);
  const slots = startSlots($('booking-date').value, viennaNow());
  select.replaceChildren(...slots.map(minutes => el('option', { value: String(minutes) }, `${timeText(minutes)} Uhr`)));
  if (slots.includes(previous)) select.value = String(previous);
  else if (slots.includes(10 * 60)) select.value = String(10 * 60);
  fillDurations();
}

function fillDurations() {
  const select = $('booking-hours');
  const previous = Number(select.value) || 120;
  const start = $('booking-start').value === '' ? NaN : Number($('booking-start').value);
  const list = Number.isFinite(start) ? durations(start) : [];
  select.replaceChildren(...list.map(minutes => el('option', { value: String(minutes) }, durationText(minutes))));
  const pick = list.includes(previous) ? previous : list.filter(minutes => minutes <= previous).at(-1) ?? list[0];
  if (pick) select.value = String(pick);
}

function bookingSelection() {
  return checkBooking({
    date: $('booking-date').value,
    start: $('booking-start').value === '' ? NaN : Number($('booking-start').value),
    duration: Number($('booking-hours').value),
    hourlyRate: bookingBike.hourly_rate,
  }, viennaNow());
}

function updateBookingPrice() {
  const error = $('booking-error');
  const selection = bookingSelection();
  if (selection.error) {
    error.replaceChildren(icon('alert', 16), selection.error);
    error.hidden = false;
    $('booking-range').textContent = '–';
    $('booking-calc').textContent = '–';
    $('booking-total').textContent = '–';
    return selection;
  }
  error.hidden = true;
  $('booking-range').textContent = `${timeText(selection.start)}–${timeText(selection.end)} Uhr`;
  $('booking-calc').textContent = `${durationText(selection.duration)} × ${euro(bookingBike.hourly_rate)}`;
  $('booking-total').textContent = euro(selection.total);
  return selection;
}

function confirmBooking() {
  // Uhrzeit neu prüfen: Der Dialog kann länger offen gewesen sein
  fillStarts();
  const selection = updateBookingPrice();
  if (selection.error) return;
  const rows = [
    ['Fahrrad', `${bookingBike.brand} · ${bookingBike.bike_type} (Nr. ${bookingBike.bike_id})`],
    ['Datum', longDate(selection.date)],
    ['Zeitraum', `${timeText(selection.start)}–${timeText(selection.end)} Uhr`],
    ['Mietpreis', euro(selection.total)],
    ['Kaution', '50,00 € vor Ort'],
    ['Abholung', `Max-Musterplatz 1, bis ${timeText(Math.min(selection.start + 60, OPEN_UNTIL))} Uhr`],
  ];
  $('booking-summary').replaceChildren(...rows.map(([term, value]) => el('div', {}, el('dt', {}, term), el('dd', {}, value))));
  $('booking-form').hidden = true;
  $('booking-done').hidden = false;
  $('booking-done-title').focus();
}
