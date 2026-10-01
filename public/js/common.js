// Gemeinsame Bausteine für Kundenansicht und Verwaltung.
// Wichtig: Hier wird NICHT gefiltert oder sortiert. Das macht allein der Server
// mit queryBikes() aus src/query.js, also dieselbe Funktion wie in der Kommandozeile.
// Die Seite schickt nur die Auswahl als URL-Parameter und zeigt die Antwort an.
import { createIcon, createBikeArt, hydrateIcons, colorInfo } from './art.js';
import { OPEN_FROM, OPEN_UNTIL } from './booking.js';

export { createIcon, hydrateIcons };

// Filter-Parameter mit denselben Namen wie die CLI-Optionen (--typ, --status …)
export const CHECK_PARAMS = ['typ', 'status', 'marke', 'farbe'];
export const PARAM_FIELDS = { typ: 'bike_type', status: 'status', marke: 'brand', farbe: 'color' };

// Alle 12 Sortierungen der Aufgabe (6 Felder, jeweils auf- und absteigend) in Klartext
export const SORT_CHOICES = [
  { sort: 'id', desc: false, label: 'Standard (Nr.)' },
  { sort: 'preis', desc: false, label: 'Preis: niedrig bis hoch' },
  { sort: 'preis', desc: true, label: 'Preis: hoch bis niedrig' },
  { sort: 'marke', desc: false, label: 'Marke: A bis Z' },
  { sort: 'marke', desc: true, label: 'Marke: Z bis A' },
  { sort: 'typ', desc: false, label: 'Typ: A bis Z' },
  { sort: 'typ', desc: true, label: 'Typ: Z bis A' },
  { sort: 'farbe', desc: false, label: 'Farbe: A bis Z' },
  { sort: 'farbe', desc: true, label: 'Farbe: Z bis A' },
  { sort: 'status', desc: false, label: 'Status: A bis Z' },
  { sort: 'status', desc: true, label: 'Status: Z bis A' },
  { sort: 'id', desc: true, label: 'Nr. absteigend' },
];

export const SORT_LABELS = {
  id: 'Nr.',
  marke: 'Marke',
  farbe: 'Farbe',
  typ: 'Typ',
  status: 'Status',
  preis: 'Preis',
};

// Groß-/Kleinschreibung egal, Umlaute zählen (wie isSameText in src/query.js).
// Wird nur benutzt, um Häkchen zu setzen, nie zum Filtern.
const sameText = new Intl.Collator('de', { sensitivity: 'accent' });
export const isSame = (a, b) => sameText.compare(a, b) === 0;

// ---------- Zustand in der URL ----------

export function readState(search = location.search) {
  const params = new URLSearchParams(search);
  const state = { 'preis-min': '', 'preis-max': '', sort: 'id', absteigend: false };
  for (const param of CHECK_PARAMS) {
    state[param] = params.getAll(param).map(value => value.trim()).filter(Boolean);
  }
  state['preis-min'] = (params.get('preis-min') ?? '').trim();
  state['preis-max'] = (params.get('preis-max') ?? '').trim();
  state.sort = (params.get('sort') ?? 'id').trim().toLowerCase() || 'id';
  state.absteigend = ['1', 'true'].includes((params.get('absteigend') ?? '').trim().toLowerCase());
  return state;
}

export function emptyState() {
  return readState('');
}

// Feste Reihenfolge, damit gleiche Auswahl immer dieselbe URL ergibt
export function toQueryString(state) {
  const params = new URLSearchParams();
  for (const param of CHECK_PARAMS) {
    for (const value of state[param]) params.append(param, value);
  }
  if (state['preis-min']) params.set('preis-min', state['preis-min']);
  if (state['preis-max']) params.set('preis-max', state['preis-max']);
  if (state.sort && state.sort !== 'id') params.set('sort', state.sort);
  if (state.absteigend) params.set('absteigend', '1');
  return params.toString();
}

export function activeFilterCount(state) {
  const values = CHECK_PARAMS.reduce((sum, param) => sum + state[param].length, 0);
  return values + (state['preis-min'] || state['preis-max'] ? 1 : 0);
}

// Schreibweise aus den Daten übernehmen (?farbe=rot → "Rot"), unbekannte Werte bleiben
export function canonicalize(state, facets) {
  for (const param of CHECK_PARAMS) {
    const known = facets?.[PARAM_FIELDS[param]] ?? [];
    const values = state[param].map(value => known.find(option => isSame(option.value, value))?.value ?? value);
    state[param] = values.filter((value, index) => values.findIndex(other => isSame(other, value)) === index);
  }
  return state;
}

// ---------- Server ----------

export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message ?? `Der Server hat mit Status ${status} geantwortet.`);
    this.status = status;
    this.code = error?.code;
    this.param = error?.param;
  }
}

let bikesRequest;

async function getJson(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, {
      code: 'KEINE_VERBINDUNG',
      message: 'Keine Verbindung zum Server. Läuft „npm run web“ noch?',
    });
  }
  // Ein Abbruch beim Lesen der Antwort ist auch ein Abbruch, kein leeres Ergebnis
  const body = await response.json().catch(error => {
    if (error.name === 'AbortError') throw error;
    return null;
  });
  if (!response.ok) throw new ApiError(response.status, body?.error);
  if (body === null) {
    throw new ApiError(response.status, { code: 'UNGUELTIGE_ANTWORT', message: 'Die Antwort des Servers war unvollständig. Bitte lade die Seite neu.' });
  }
  return body;
}

// Bricht die vorige Anfrage ab, damit eine alte Antwort nie eine neuere überschreibt
export function fetchBikes(queryString) {
  bikesRequest?.abort();
  bikesRequest = new AbortController();
  return getJson(`/api/bikes${queryString ? `?${queryString}` : ''}`, bikesRequest.signal);
}

export function fetchOptions() {
  return getJson('/api/options');
}

export const isAbort = error => error?.name === 'AbortError';

// ---------- Formatierung ----------

const euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const euro = value => euroFormat.format(value);

// "4.5" oder "4,50" → "4,50 €" für Chips; ungültige Eingaben bleiben unverändert
export function euroText(text) {
  const number = Number(String(text).replace(',', '.'));
  return Number.isFinite(number) && /^\d+([.,]\d+)?$/.test(String(text)) ? euro(number) : `${text} €`;
}

export const plural = (count, one, many) => (count === 1 ? one : many);

export function statusSlug(status) {
  return String(status).toLowerCase().replace(/\s+/g, '-');
}

// ---------- DOM ----------

// Baut Elemente ohne innerHTML, damit Werte aus URL oder CSV nie als HTML landen
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

export function icon(name, size = 18) {
  return createIcon(name, { size });
}

const STATUS_ICONS = {
  frei: 'circle-check',
  reserviert: 'clock',
  'in-benutzung': 'bike',
  wartung: 'wrench',
};

export function statusBadge(status) {
  const slug = statusSlug(status);
  return el('span', { class: 'status-badge', dataset: { status: slug } },
    icon(STATUS_ICONS[slug] ?? 'info', 14), status);
}

export function swatch(color, { square = false } = {}) {
  const node = el('span', { class: square ? 'swatch is-square' : 'swatch', 'aria-hidden': 'true' });
  node.style.setProperty('--swatch', colorInfo(color).hex);
  return node;
}

// Sehr dunkle Farben (z. B. Schwarz) brauchen im Dark Mode eine helle Kontur
function isVeryDark(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.2;
}

// Illustration des Radtyps in der echten Farbe des Rads
export function bikeArt(bike, { label } = {}) {
  const info = colorInfo(bike.color);
  const art = createBikeArt(bike.bike_type, { label });
  art.style.setProperty('--bike-color', info.hex);
  if (info.light) art.classList.add('is-light');
  if (isVeryDark(info.hex)) art.classList.add('is-dark');
  return art;
}

// ---------- Aktive Filter als Chips ----------

export function renderActiveChips(container, state, { labels, onRemove, onReset }) {
  container.replaceChildren();
  let any = false;
  for (const param of CHECK_PARAMS) {
    state[param].forEach((value, index) => {
      if (index > 0) container.append(el('span', { class: 'chip-or', 'aria-hidden': 'true' }, 'oder'));
      container.append(el('button', {
        type: 'button',
        class: 'filter-chip',
        'aria-label': `Filter entfernen: ${labels[param]} ${value}`,
        onclick: () => onRemove(param, value),
      }, el('span', { class: 'chip-key' }, `${labels[param]}:`), value, icon('x', 14)));
      any = true;
    });
  }
  const min = state['preis-min'];
  const max = state['preis-max'];
  if (min || max) {
    const text = min && max ? `${euroText(min)} – ${euroText(max)}` : min ? `ab ${euroText(min)}` : `bis ${euroText(max)}`;
    container.append(el('button', {
      type: 'button',
      class: 'filter-chip',
      'aria-label': `Filter entfernen: Preis ${text}`,
      onclick: () => onRemove('preis'),
    }, el('span', { class: 'chip-key' }, 'Preis:'), text, icon('x', 14)));
    any = true;
  }
  if (any) {
    container.append(el('button', { type: 'button', class: 'link-btn', onclick: onReset }, 'Alle zurücksetzen'));
  }
}

// ---------- Hinweise und Fehler ----------

// notice = Hinweis, error = Fehler; action = { label, onClick } für einen Knopf im Kasten
export function renderNotices(container, { hints = [], notice = null, error = null } = {}) {
  container.replaceChildren();
  const box = (kind, iconName, lines, action) => el('div', { class: kind === 'error' ? 'notice is-error' : 'notice', role: kind === 'error' ? 'alert' : 'note' },
    icon(iconName, 18),
    el('div', {},
      lines.map(line => el('p', {}, line)),
      action ? el('p', {}, el('button', { type: 'button', class: 'link-btn', onclick: action.onClick }, action.label)) : null));
  if (hints.length > 0) container.append(box('info', 'info', hints.map(hint => hint.message)));
  if (notice) container.append(box('info', 'info', [notice.message], notice.action));
  if (error) container.append(box('error', 'alert', [error.message], error.action));
}

// ---------- Leerer Zustand ----------

// Vorschläge nennen den Wert, der wegfällt: „Farbe „Gelb“ weglassen · 3 Fahrräder“
export function renderEmpty(container, data, { state, labels, onRelax, onReset }) {
  const suggestions = (data.relax ?? []).filter(item => item.count > 0);
  const describe = param => {
    if (param === 'preis') return 'Preisgrenzen weglassen';
    const values = state[param].map(value => `„${value}“`).join(' oder ');
    return `${labels[param]} ${values} weglassen`;
  };
  container.replaceChildren(
    el('span', { class: 'empty-icon' }, icon('search-x', 26)),
    el('h3', {}, 'Keine Fahrräder passen zu diesen Filtern'),
    el('p', {}, suggestions.length > 0
      ? 'Lass einen Filter weg, dann gibt es wieder Treffer:'
      : 'Entferne einen Filter oder erweitere die Preisgrenzen.'),
    el('div', { class: 'empty-actions' },
      suggestions.map(item => el('button', {
        type: 'button',
        class: 'btn btn-secondary btn-sm',
        onclick: () => onRelax(item.param),
      }, `${describe(item.param)} · ${item.count} ${plural(item.count, 'Fahrrad', 'Fahrräder')}`)),
      el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: onReset }, 'Alle Filter zurücksetzen')),
  );
}

// ---------- Nachweis: gleicher CLI-Befehl und Rohdaten ----------

export function setupProof() {
  const copy = document.getElementById('proof-copy');
  copy?.addEventListener('click', async () => {
    const text = document.getElementById('proof-cli').textContent;
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = 'Kopiert';
    } catch {
      copy.textContent = 'Bitte markieren';
    }
    setTimeout(() => { copy.textContent = 'Kopieren'; }, 1600);
  });
}

export function updateProof(data, queryString) {
  document.getElementById('proof-cli').textContent = data.cli;
  document.getElementById('proof-json').href = `/api/bikes${queryString ? `?${queryString}` : ''}`;
}

// ---------- Sortier-Auswahl ----------

// statusLabel: in der Kundenansicht heißt der Status „Verfügbarkeit“
export function fillSortSelect(select, { statusLabel = 'Status' } = {}) {
  select.replaceChildren(...SORT_CHOICES.map(choice =>
    el('option', { value: `${choice.sort}|${choice.desc ? 1 : 0}` }, choice.label.replace(/^Status:/, `${statusLabel}:`))));
}

export function setSortSelect(select, state) {
  const value = `${state.sort}|${state.absteigend ? 1 : 0}`;
  if ([...select.options].some(option => option.value === value)) select.value = value;
}

export function readSortSelect(select) {
  const [sort, desc] = select.value.split('|');
  return { sort, absteigend: desc === '1' };
}

// ---------- Mobiles Filter-Panel ----------

// Auf kleinen Bildschirmen wandert dasselbe Formular in einen Dialog
// und beim Schließen wieder zurück in die Seitenleiste.
export function setupFilterSheet({ form, onReset, onOpen }) {
  const aside = document.getElementById('filter-aside');
  const sheet = document.getElementById('filter-sheet');
  const body = document.getElementById('filter-sheet-body');
  const openButton = document.getElementById('filter-open');
  const apply = document.getElementById('filter-sheet-apply');
  let blocked = false;
  let count = 0;

  aside.append(form);

  openButton.addEventListener('click', () => {
    body.append(form);
    onOpen?.();
    sheet.showModal();
  });
  sheet.addEventListener('close', () => {
    aside.append(form);
    openButton.focus();
  });
  sheet.addEventListener('click', event => {
    if (event.target === sheet) sheet.close();
  });
  document.getElementById('filter-close').addEventListener('click', () => sheet.close());
  // Bei einem ungültigen Preis nicht schließen, sondern zum Feld springen
  apply.addEventListener('click', () => {
    if (blocked) form.querySelector('[aria-invalid="true"]')?.focus();
    else sheet.close();
  });
  document.getElementById('filter-sheet-reset').addEventListener('click', onReset);

  const desktop = window.matchMedia('(min-width: 1024px)');
  desktop.addEventListener('change', event => {
    if (event.matches && sheet.open) sheet.close();
  });

  const label = () => {
    if (blocked) return 'Preis korrigieren';
    return count === 0 ? 'Keine Treffer' : `${count} ${plural(count, 'Fahrrad', 'Fahrräder')} anzeigen`;
  };

  return {
    isOpen: () => sheet.open,
    update(state, newCount) {
      count = newCount;
      const pill = document.getElementById('filter-count');
      const active = activeFilterCount(state);
      pill.hidden = active === 0;
      pill.replaceChildren(String(active), el('span', { class: 'visually-hidden' }, ` ${plural(active, 'aktiver Filter', 'aktive Filter')}`));
      apply.textContent = label();
    },
    setBlocked(value) {
      blocked = value;
      apply.textContent = label();
    },
  };
}

// ---------- Uhrzeit in Wien ----------

export function viennaNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function updateOpenStatus(node) {
  if (!node) return;
  const { minutes } = viennaNow();
  const open = minutes >= OPEN_FROM && minutes < OPEN_UNTIL;
  node.classList.toggle('is-open', open);
  if (open) node.textContent = 'Jetzt geöffnet · bis 18:00';
  else if (minutes < OPEN_FROM) node.textContent = 'Geschlossen · öffnet um 08:00';
  else node.textContent = 'Geschlossen · öffnet morgen um 08:00';
}
