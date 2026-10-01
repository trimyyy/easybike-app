// Gemeinsamer Ablauf für Kundenansicht und Verwaltung:
// Auswahl → URL-Parameter → /api/bikes (queryBikes() auf dem Server) → Anzeige.
// Die Seite selbst filtert und sortiert nie.
import {
  readState, emptyState, toQueryString, canonicalize, fetchBikes, isAbort, isSame,
  renderActiveChips, renderNotices, renderEmpty, updateProof, setupFilterSheet,
} from './common.js';
import { createFilters } from './filters.js';

const PRICE_PARAMS = ['preis-min', 'preis-max'];

export function createController({ options, groups, labels, busyElement, onRender, onFirstLoadError }) {
  let state = readState();
  let lastValidPrice = { 'preis-min': '', 'preis-max': '' };
  let pendingNotice = null;
  let keepPriceError = false;
  let retried = false;
  let loaded = false;
  let sheetPushed = false;
  const $ = id => document.getElementById(id);

  const filters = createFilters({ options, groups, labels, onChange: handleFilterChange });
  const sheet = setupFilterSheet({
    form: filters.form,
    onReset: reset,
    onOpen: () => { sheetPushed = false; },
  });

  window.addEventListener('popstate', () => {
    state = readState();
    refresh('none');
  });

  // Im offenen Filter-Panel (Handy) nur EIN Verlaufseintrag pro Sitzung, sonst einer pro Änderung
  function userHistory() {
    if (!sheet.isOpen()) return 'push';
    if (sheetPushed) return 'replace';
    sheetPushed = true;
    return 'push';
  }

  async function refresh(history = 'push', rawQuery = null) {
    const queryString = rawQuery ?? toQueryString(state);
    busyElement.classList.add('is-loading');
    let data;
    try {
      data = await fetchBikes(queryString);
    } catch (error) {
      if (isAbort(error)) return;
      busyElement.classList.remove('is-loading');
      handleError(error);
      return;
    }
    busyElement.classList.remove('is-loading');
    retried = false;
    loaded = true;
    if (keepPriceError) {
      keepPriceError = false;
    } else {
      filters.clearPriceError();
      sheet.setBlocked(false);
    }

    canonicalize(state, data.facets);
    lastValidPrice = { 'preis-min': state['preis-min'], 'preis-max': state['preis-max'] };
    const canonical = toQueryString(state);
    const target = canonical ? `?${canonical}` : '';
    const url = target || location.pathname;
    if (history === 'push' && target !== location.search) window.history.pushState(null, '', url);
    else if (history !== 'none') window.history.replaceState(null, '', url);

    filters.update(state, data.facets);
    sheet.update(state, data.count);
    renderActiveChips($('active-filters'), state, { labels, onRemove: removeFilter, onReset: reset });
    renderNotices($('notices'), { hints: data.hints, notice: pendingNotice });
    pendingNotice = null;
    updateProof(data, canonical);
    onRender(data, state);
    const empty = $('empty-state');
    empty.hidden = data.count > 0;
    if (data.count === 0) renderEmpty(empty, data, { state, labels, onRelax: relax, onReset: reset });
  }

  // Bedienfehler (400): den fehlerhaften Wert verwerfen, erklären und einmal neu laden,
  // damit die Seite nie in einem Zustand hängen bleibt, den der Server ablehnt.
  function handleError(error) {
    if (error.status === 400 && error.code === 'BEDIENFEHLER' && !retried) {
      retried = true;
      if (PRICE_PARAMS.includes(error.param)) {
        filters.setPriceError(error.param, error.message);
        sheet.setBlocked(true);
        keepPriceError = true;
        Object.assign(state, lastValidPrice);
        pendingNotice = {
          message: `${error.message}. Die letzte Änderung am Preis wurde deshalb nicht übernommen.`,
          action: { label: 'Preisgrenzen entfernen', onClick: () => removeFilter('preis') },
        };
      } else {
        if (error.param === 'sort') {
          state.sort = 'id';
          state.absteigend = false;
        } else if (error.param === 'absteigend') {
          state.absteigend = false;
        } else if (error.param === 'status') {
          const known = options.filters.status.map(option => option.value);
          state.status = state.status.filter(value => known.some(item => isSame(item, value)));
        }
        pendingNotice = { message: `Ein Wert im Link wurde nicht übernommen: ${error.message}` };
      }
      refresh('replace');
      return;
    }
    renderNotices($('notices'), { error: { message: error.message, action: { label: 'Alle Filter zurücksetzen', onClick: reset } } });
    if (!loaded) {
      filters.update(state, options.filters);
      onFirstLoadError?.();
    }
  }

  function handleFilterChange(change) {
    if (change.type === 'reset') return reset();
    if (change.type === 'toggle') {
      const others = state[change.param].filter(value => !isSame(value, change.value));
      state[change.param] = change.checked ? [...others, change.value] : others;
      return refresh(userHistory());
    }
    if (change.type === 'price') {
      if (state[change.param] === change.value && !change.commit) return;
      state[change.param] = change.value;
      // Zwischenstände beim Tippen ändern die URL nicht, erst Enter oder Verlassen des Felds
      return refresh(change.commit ? userHistory() : 'none');
    }
  }

  function focusResults() {
    $('results').focus({ preventScroll: true });
  }

  function removeFilter(param, value) {
    if (param === 'preis') {
      state['preis-min'] = '';
      state['preis-max'] = '';
    } else {
      state[param] = state[param].filter(item => !isSame(item, value));
    }
    refresh(userHistory());
    focusResults();
  }

  // Vorschlag aus dem leeren Zustand: eine ganze Filtergruppe weglassen
  function relax(param) {
    if (param === 'preis') {
      state['preis-min'] = '';
      state['preis-max'] = '';
    } else {
      state[param] = [];
    }
    refresh(userHistory());
    focusResults();
  }

  // Filter zurücksetzen, die Sortierung bleibt
  function reset() {
    const { sort, absteigend } = state;
    state = { ...emptyState(), sort, absteigend };
    refresh(userHistory());
    focusResults();
  }

  return {
    get state() {
      return state;
    },
    // Direkte Änderungen der Seite (Typ-Chips, Status-Kacheln, Sortierung)
    update(changes) {
      Object.assign(state, changes);
      return refresh(userHistory());
    },
    toggle(param, value) {
      const on = state[param].some(item => isSame(item, value));
      state[param] = on ? state[param].filter(item => !isSame(item, value)) : [...state[param], value];
      return refresh(userHistory());
    },
    // Erster Aufruf mit der URL, wie sie ist: so meldet der Server auch Tippfehler in Links
    start() {
      return refresh('replace', location.search.slice(1));
    },
  };
}
