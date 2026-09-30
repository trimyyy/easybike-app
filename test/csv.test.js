const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv } = require('../src/csv');

test('wandelt jede Zeile in ein Objekt mit den Spaltennamen um', () => {
  const records = parseCsv('bike_id,color\nBK-1,Rot\nBK-2,Blau\n');

  assert.deepEqual(records, [
    { bike_id: 'BK-1', color: 'Rot' },
    { bike_id: 'BK-2', color: 'Blau' },
  ]);
});

test('entfernt Leerzeichen um Spaltennamen und Werte', () => {
  assert.deepEqual(parseCsv(' bike_id , color \n BK-1 , Rot '), [{ bike_id: 'BK-1', color: 'Rot' }]);
});

test('überspringt leere Zeilen, auch mitten in der Datei', () => {
  const records = parseCsv('bike_id\nBK-1\n\n   \nBK-2\n\n');

  assert.deepEqual(records, [{ bike_id: 'BK-1' }, { bike_id: 'BK-2' }]);
});

test('behält zusätzliche Spalten', () => {
  const records = parseCsv('bike_id,color,location\nBK-1,Rot,Nord');

  assert.deepEqual(records, [{ bike_id: 'BK-1', color: 'Rot', location: 'Nord' }]);
});

test('versteht Windows-Zeilenenden und BOM am Dateianfang', () => {
  const records = parseCsv('\uFEFFbike_id,color\r\nBK-1,Rot\r\n');

  assert.deepEqual(records, [{ bike_id: 'BK-1', color: 'Rot' }]);
});

test('meldet fehlende Werte mit Zeilennummer', () => {
  assert.throws(
    () => parseCsv('bike_id,color,status\nBK-1,Rot,Frei\n\nBK-2,Blau'),
    { message: 'Zeile 4: 3 Werte erwartet, aber 2 gefunden' }
  );
});

test('meldet zu viele Werte, z. B. durch ein Komma im Wert', () => {
  assert.throws(
    () => parseCsv('bike_id,color\nBK-1,"Rot, matt"'),
    { message: 'Zeile 2: 2 Werte erwartet, aber 3 gefunden' }
  );
});

test('meldet eine leere Datei', () => {
  assert.throws(() => parseCsv(''), { message: 'CSV-Datei ist leer' });
  assert.throws(() => parseCsv('\n\n'), { message: 'CSV-Datei ist leer' });
});

test('liefert ein leeres Array, wenn nur die Kopfzeile vorhanden ist', () => {
  assert.deepEqual(parseCsv('bike_id,color\n'), []);
});
