// Filterformular für Kundenansicht und Verwaltung.
// Es sammelt nur die Auswahl. Die Anzahlen neben den Optionen und das Ergebnis
// berechnet der Server mit filterBikes() bzw. queryBikes() aus src/query.js.
import { el, icon, swatch, isSame, PARAM_FIELDS } from './common.js';

const PRICE_DELAY = 600;

export function createFilters({ options, groups, labels, onChange }) {
  const checkboxes = [];
  const reset = el('button', { type: 'button', class: 'link-btn', hidden: true, onclick: () => onChange({ type: 'reset' }) }, 'Alle zurücksetzen');
  const form = el('form', { class: 'filters', id: 'filters', novalidate: true, 'aria-labelledby': 'filters-title' },
    el('div', { class: 'filters-head' }, el('h2', { id: 'filters-title' }, 'Filter'), reset),
    el('p', { class: 'filters-help' }, 'In jeder Gruppe kannst du mehrere Häkchen setzen.'));

  let priceError;
  let priceInputs = {};

  for (const group of groups) {
    if (group === 'preis') {
      form.append(buildPriceGroup());
      continue;
    }
    const field = PARAM_FIELDS[group];
    const list = el('ul', { class: 'check-list' });
    for (const option of options.filters[field] ?? []) {
      const input = el('input', { type: 'checkbox', name: group, value: option.value });
      const count = el('span', { class: 'check-count' }, String(option.count));
      const label = el('label', { class: 'check' },
        input,
        el('span', { class: 'check-box', 'aria-hidden': 'true' }, icon('check', 14)),
        el('span', { class: 'check-label' }, group === 'farbe' ? swatch(option.value) : null, option.value),
        count);
      input.addEventListener('change', () => onChange({ type: 'toggle', param: group, value: option.value, checked: input.checked }));
      checkboxes.push({ param: group, field, value: option.value, input, count, label });
      list.append(el('li', {}, label));
    }
    form.append(el('fieldset', { class: 'filter-group' }, el('legend', {}, labels[group]), list));
  }

  // Enter im Preisfeld soll nicht die Seite neu laden
  form.addEventListener('submit', event => {
    event.preventDefault();
    commitPrice();
  });

  function buildPriceGroup() {
    const timers = {};
    const makeField = (param, text, fullText, placeholder) => {
      const input = el('input', {
        class: 'input',
        id: `filter-${param}`,
        name: param,
        type: 'text',
        inputmode: 'decimal',
        autocomplete: 'off',
        spellcheck: 'false',
        placeholder,
        'aria-describedby': 'price-hint',
      });
      input.addEventListener('input', () => {
        clearTimeout(timers[param]);
        timers[param] = setTimeout(() => onChange({ type: 'price', param, value: input.value.trim(), commit: false }), PRICE_DELAY);
      });
      input.addEventListener('change', () => {
        clearTimeout(timers[param]);
        onChange({ type: 'price', param, value: input.value.trim(), commit: true });
      });
      priceInputs[param] = input;
      return el('div', {},
        el('label', { class: 'field-label', for: input.id },
          el('span', { 'aria-hidden': 'true' }, text),
          el('span', { class: 'visually-hidden' }, fullText)),
        el('span', { class: 'input-wrap' }, input, el('span', { class: 'input-suffix', 'aria-hidden': 'true' }, '€')));
    };
    const format = value => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2 }).format(value);
    priceError = el('p', { class: 'field-error', id: 'price-error', role: 'alert', hidden: true });
    return el('fieldset', { class: 'filter-group' },
      el('legend', {}, labels.preis),
      el('div', { class: 'price-fields' },
        makeField('preis-min', 'mind.', 'Mindestpreis pro Stunde in Euro', format(options.price.min)),
        el('span', { class: 'price-dash', 'aria-hidden': 'true' }, '–'),
        makeField('preis-max', 'max.', 'Höchstpreis pro Stunde in Euro', format(options.price.max))),
      priceError,
      el('p', { class: 'field-hint', id: 'price-hint' }, 'Grenzen zählen mit: max. 5 findet auch Räder für genau 5,00 €.'));
  }

  function commitPrice() {
    for (const [param, input] of Object.entries(priceInputs)) {
      onChange({ type: 'price', param, value: input.value.trim(), commit: true });
    }
  }

  return {
    form,

    // Häkchen, Anzahlen und Preisfelder an den aktuellen Zustand anpassen
    update(state, facets) {
      for (const box of checkboxes) {
        const checked = state[box.param].some(value => isSame(value, box.value));
        box.input.checked = checked;
        const facet = facets?.[box.field]?.find(option => option.value === box.value);
        const count = facet ? facet.count : 0;
        box.count.textContent = String(count);
        box.label.classList.toggle('is-zero', count === 0 && !checked);
      }
      for (const [param, input] of Object.entries(priceInputs)) {
        if (document.activeElement !== input) input.value = state[param];
      }
      const active = ['typ', 'status', 'marke', 'farbe'].some(param => state[param].length > 0)
        || state['preis-min'] || state['preis-max'];
      reset.hidden = !active;
    },

    setPriceError(param, message) {
      priceError.replaceChildren(icon('alert', 16), message);
      priceError.hidden = false;
      for (const [name, input] of Object.entries(priceInputs)) {
        input.setAttribute('aria-invalid', String(name === param || param === 'preis'));
        input.setAttribute('aria-describedby', 'price-error price-hint');
      }
    },

    clearPriceError() {
      priceError.hidden = true;
      priceError.replaceChildren();
      for (const input of Object.values(priceInputs)) {
        input.removeAttribute('aria-invalid');
        input.setAttribute('aria-describedby', 'price-hint');
      }
    },
  };
}
