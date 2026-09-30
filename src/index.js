const { loadBikes } = require('./bikes');

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

// Gibt alle Fahrräder als Tabelle im Terminal aus
function printBikes(bikes) {
  console.log('=========================================');
  console.log('    EASYBIKE Fahrradverleih Datensatz');
  console.log('=========================================\n');

  console.table(bikes.map(bike => ({ ...bike, hourly_rate: euro.format(bike.hourly_rate) })));

  console.log(`\nGesamtanzahl eingelesener Fahrräder: ${bikes.length}`);
}

try {
  printBikes(loadBikes());
} catch (error) {
  console.error('Fehler beim Einlesen der Fahrrad-Daten:', error.message);
  process.exitCode = 1;
}
