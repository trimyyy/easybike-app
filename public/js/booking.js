// Regeln der Reservierung (Demo): reine Funktionen ohne DOM, damit sie testbar sind.
// Öffnungszeit 08:00–18:00, Start in 30-Minuten-Schritten bis 17:30,
// Rückgabe spätestens 18:00, Reservierung bis 60 Tage im Voraus.

export const OPEN_FROM = 8 * 60;
export const OPEN_UNTIL = 18 * 60;
export const SLOT = 30;
export const MAX_DAYS_AHEAD = 60;

export const timeText = minutes =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const durationText = minutes =>
  (minutes < 60 ? `${minutes} Min.` : `${String(minutes / 60).replace('.', ',')} Std.`);

// Datum im Format JJJJ-MM-TT plus Tage (mit UTC-Mittag, damit die Zeitumstellung nicht stört)
export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Mögliche Startzeiten; heute nur die, die noch nicht vorbei sind
export function startSlots(isoDate, now) {
  const slots = [];
  for (let minutes = OPEN_FROM; minutes <= OPEN_UNTIL - SLOT; minutes += SLOT) {
    if (isoDate === now.date && minutes < now.minutes) continue;
    slots.push(minutes);
  }
  return slots;
}

// Mögliche Dauern ab einer Startzeit, damit die Rückgabe bis 18:00 klappt
export function durations(start) {
  const list = [];
  for (let minutes = SLOT; start + minutes <= OPEN_UNTIL; minutes += SLOT) list.push(minutes);
  return list;
}

// Frühestes Datum: heute, außer heute ist keine Startzeit mehr frei
export function firstBookableDate(now) {
  return startSlots(now.date, now).length > 0 ? now.date : addDays(now.date, 1);
}

// Prüft die Auswahl und berechnet den Preis (Dauer in Stunden × Stundensatz)
export function checkBooking({ date, start, duration, hourlyRate }, now) {
  if (!date) return { error: 'Bitte wähle ein Datum.' };
  if (date < now.date) return { error: 'Das Datum liegt in der Vergangenheit.' };
  if (date > addDays(now.date, MAX_DAYS_AHEAD)) return { error: `Reservierungen sind höchstens ${MAX_DAYS_AHEAD} Tage im Voraus möglich.` };
  if (!Number.isFinite(start) || !startSlots(date, now).includes(start)) {
    return { error: date === now.date
      ? 'Diese Startzeit ist heute nicht mehr möglich. Wähle eine spätere Zeit oder einen anderen Tag.'
      : 'Bitte wähle eine Startzeit zwischen 08:00 und 17:30.' };
  }
  if (!durations(start).includes(duration)) return { error: 'Die Rückgabe muss bis 18:00 Uhr möglich sein.' };
  return { date, start, end: start + duration, duration, total: (duration / 60) * hourlyRate };
}
