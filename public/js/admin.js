// Verwaltung „Flotte“: alle Räder als Tabelle, filtern und sortieren.
// Filtern und Sortieren übernimmt der Server mit queryBikes(), siehe controller.js.
import {
  el, icon, hydrateIcons, fetchOptions, euro, plural, statusSlug, statusBadge, swatch,
  renderNotices, setupProof, fillSortSelect, setSortSelect, readSortSelect, isSame, SORT_LABELS,
} from './common.js';
import { createController } from './controller.js';

const LABELS = {
  status: 'Status',
  preis: 'Preis pro Stunde',
  typ: 'Typ',
  marke: 'Marke',
  farbe: 'Farbe',
};

const COLUMNS = [
  { key: 'id', label: 'Nr.' },
  { key: 'marke', label: 'Marke' },
  { key: 'farbe', label: 'Farbe' },
  { key: 'typ', label: 'Typ' },
  { key: 'preis', label: 'Preis/Std.', numeric: true },
  { key: 'status', label: 'Status' },
];

const KPI_ICONS = {
  frei: 'circle-check',
  reserviert: 'clock',
  'in-benutzung': 'bike',
  wartung: 'wrench',
};

const $ = id => document.getElementById(id);

let controller;
let options;
let announceNext = '';

hydrateIcons();
setupProof();
fillSortSelect($('sort-select'));
init();

async function init() {
  try {
    options = await fetchOptions();
  } catch (error) {
    renderNotices($('notices'), { error });
    showNothingLoaded();
    return;
  }
  $('fleet-meta').textContent = `Station Max-Musterplatz 1, 1000 Wien · ${options.total} ${plural(options.total, 'Rad', 'Räder')} im Bestand`;
  buildKpis();
  buildPriceTable();
  buildHead();
  controller = createController({
    options,
    groups: ['status', 'preis', 'typ', 'marke', 'farbe'],
    labels: LABELS,
    busyElement: $('table-card'),
    onRender: render,
    onFirstLoadError: showNothingLoaded,
  });
  $('sort-select').addEventListener('change', event => controller.update(readSortSelect(event.target)));
  controller.start();
}

function showNothingLoaded() {
  $('result-count').textContent = 'Keine Fahrräder geladen';
}

// ---------- Anzeige ----------

function render(data, state) {
  const direction = state.absteigend ? 'absteigend' : 'aufsteigend';
  $('result-count').replaceChildren(
    `${data.count} `,
    el('span', {}, `von ${data.total} ${plural(data.total, 'Rad', 'Rädern')} · sortiert nach ${SORT_LABELS[state.sort] ?? state.sort} ${direction}`));
  updateKpis(state);
  updateHead(state);
  setSortSelect($('sort-select'), state);

  $('fleet-body').replaceChildren(...data.bikes.map(bike => tableRow(bike, state)));
  $('fleet-list').replaceChildren(...data.bikes.map(listItem));
  const empty = data.count === 0;
  $('table-card').hidden = empty;
  $('fleet-list').hidden = empty;

  if (announceNext) {
    $('sort-announce').textContent = announceNext;
    announceNext = '';
  }
}

function tableRow(bike, state) {
  const cls = (key, ...extra) => [...extra, state.sort === key ? 'is-sorted' : null].filter(Boolean).join(' ') || null;
  return el('tr', {},
    el('td', { class: cls('id', 'is-id') }, bike.bike_id),
    el('td', { class: cls('marke') }, bike.brand),
    el('td', { class: cls('farbe') }, el('span', { class: 'cell-color' }, swatch(bike.color, { square: true }), bike.color)),
    el('td', { class: cls('typ') }, bike.bike_type),
    el('td', { class: cls('preis', 'is-num') }, euro(bike.hourly_rate)),
    el('td', { class: cls('status') }, statusBadge(bike.status)));
}

function listItem(bike) {
  return el('li', { class: 'fleet-item' },
    el('span', { class: 'fleet-id' }, bike.bike_id),
    el('span', {}, statusBadge(bike.status)),
    el('span', { class: 'fleet-sub' }, `${bike.brand} · ${bike.bike_type}`),
    el('span', { class: 'fleet-price' }, euro(bike.hourly_rate)),
    el('span', { class: 'fleet-sub cell-color' }, swatch(bike.color, { square: true }), bike.color));
}

// ---------- Kennzahlen: Anzahl pro Status, zugleich Statusfilter ----------

function buildKpis() {
  const total = options.total;
  const tiles = options.filters.status.map(({ value, count }) => {
    const slug = statusSlug(value);
    const bar = el('span');
    bar.style.setProperty('--share', `${total ? (count / total) * 100 : 0}%`);
    return el('button', {
      type: 'button',
      class: 'kpi',
      dataset: { status: slug, value },
      'aria-pressed': 'false',
      onclick: () => controller.toggle('status', value),
    },
    el('span', { class: 'kpi-check', 'aria-hidden': 'true' }, icon('check', 14)),
    el('span', { class: 'kpi-label' }, icon(KPI_ICONS[slug] ?? 'info', 18), value),
    el('span', { class: 'kpi-value' }, String(count), el('span', { class: 'kpi-total' }, ` von ${total}`)),
    el('span', { class: 'kpi-bar', 'aria-hidden': 'true' }, bar));
  });
  $('kpis').replaceChildren(...tiles);
}

function updateKpis(state) {
  for (const tile of $('kpis').children) {
    const pressed = state.status.some(value => isSame(value, tile.dataset.value));
    tile.setAttribute('aria-pressed', String(pressed));
  }
}

// ---------- Tabellenkopf: Klick sortiert, zweiter Klick dreht die Richtung ----------

function buildHead() {
  $('fleet-head').replaceChildren(...COLUMNS.map(column => el('th', {
    scope: 'col',
    class: column.numeric ? 'is-num' : null,
    dataset: { key: column.key },
  }, el('button', {
    type: 'button',
    class: 'th-sort',
    onclick: () => sortBy(column.key),
  }, el('span', {}, column.label), el('span', { class: 'sort-arrow', 'aria-hidden': 'true' }, icon('arrow-up', 15))))));
}

function updateHead(state) {
  for (const th of $('fleet-head').children) {
    const active = th.dataset.key === state.sort;
    const arrow = th.querySelector('.sort-arrow');
    if (active) {
      th.setAttribute('aria-sort', state.absteigend ? 'descending' : 'ascending');
      arrow.replaceChildren(icon(state.absteigend ? 'arrow-down' : 'arrow-up', 15));
    } else {
      th.removeAttribute('aria-sort');
      arrow.replaceChildren(icon('arrow-up', 15));
    }
  }
}

function sortBy(key) {
  const state = controller.state;
  const absteigend = state.sort === key ? !state.absteigend : false;
  announceNext = `Sortiert nach ${SORT_LABELS[key]}, ${absteigend ? 'absteigend' : 'aufsteigend'}`;
  controller.update({ sort: key, absteigend });
}

// ---------- Preise pro Typ (aus bike_types.csv, über die Räder) ----------

function buildPriceTable() {
  $('price-table').replaceChildren(...options.filters.bike_type.map(type => el('tr', {},
    el('td', {}, type.value),
    el('td', { class: 'is-num' }, euro(type.hourly_rate)),
    el('td', { class: 'is-num' }, String(type.count)))));
}
