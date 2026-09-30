// Wandelt CSV-Text in ein Array von Objekten um.
// Die erste Zeile enthält die Spaltennamen, jede weitere Zeile wird zu einem
// Objekt mit diesen Spaltennamen als Schlüssel. Alle Werte bleiben Strings.
//
// Einschränkung: Werte dürfen keine Kommas oder Anführungszeichen enthalten.
function parseCsv(text) {
  // Excel speichert CSV-Dateien oft mit unsichtbarem BOM am Anfang
  const content = text.replace(/^﻿/, '');
  if (!content.trim()) {
    throw new Error('CSV-Datei ist leer');
  }

  const lines = content.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Leere Zeilen überspringen

    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      throw new Error(
        `Zeile ${i + 1}: ${headers.length} Werte erwartet, aber ${values.length} gefunden`
      );
    }

    records.push(Object.fromEntries(headers.map((header, idx) => [header, values[idx]])));
  }

  return records;
}

module.exports = { parseCsv };
