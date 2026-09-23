const fs = require('fs');
const path = require('path');

// Funktion zum Einlesen und Konvertieren der CSV-Datei in Objekte
function displayBicycleCSVData() {
  const filePath = path.join(__dirname, 'fahrrad.csv');

  try {
    // CSV-Datei zeilenweise einlesen
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.trim().split('\n');

    // Erste Zeile enthält die Spaltennamen (Header)
    const headers = lines[0].split(',').map(h => h.trim());

    console.log("=========================================");
    console.log("    EASYBIKE Fahrradverlei Datensatz      ");
    console.log("=========================================\n");

    const bicycles = [];

    // Zeilen ab Index 1 in Objekte umwandeln
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Leere Zeilen überspringen

      const values = lines[i].split(',').map(v => v.trim());
      const bikeObject = {
        [headers[0]]: values[0],
        [headers[1]]: values[1],
        [headers[2]]: values[2],
        [headers[3]]: values[3],
        [headers[4]]: parseFloat(values[4])
      };

      bicycles.push(bikeObject);

      // Jeden Datensatz als einzelnes Objekt im Terminal ausgeben
      console.log(`--- Datensatz #${i} ---`);
      console.log(bikeObject);
      console.log("");
    }

    console.log(`Gesamtanzahl eingelesener Fahrräder: ${bicycles.length}`);
  } catch (error) {
    console.error("Fehler beim Einlesen der CSV-Datei:", error.message);
  }
}

// Funktion ausführen
displayBicycleCSVData();


//Test Push Paul Hübner