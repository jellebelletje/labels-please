// =============================================================
// Google Apps Script — Leaderboard API for "Labels, Please"
// =============================================================
//
// SETUP INSTRUCTIES:
//
// 1. Ga naar https://sheets.google.com en maak een nieuw spreadsheet aan.
//
// 2. Hernoem het eerste tabblad naar: "Leaderboard"
//
// 3. Voeg in rij 1 de volgende koppen toe:
//    A1: Timestamp
//    B1: Name
//    C1: Score
//    D1: Correct
//    E1: TimeUsed
//
// 4. Kopieer het SPREADSHEET_ID uit de URL van je sheet:
//    https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
//    en plak dat hieronder bij de variabele SPREADSHEET_ID.
//
// 5. Ga naar Google Apps Script:
//    - In je spreadsheet: Extensies → Apps Script
//    - Of ga naar https://script.google.com
//
// 6. Plak deze volledige code in het Code.gs bestand
//    (verwijder eventuele bestaande code).
//
// 7. Sla op en klik op "Implementeren" → "Nieuwe implementatie":
//    - Type: Webapp
//    - Uitvoeren als: Jezelf
//    - Wie heeft toegang: Iedereen
//    - Klik "Implementeren"
//
// 8. Kopieer de URL van de webapp en plak die in index.html
//    bij de variabele SHEET_API_URL (bovenaan het <script> blok).
//
// 9. Klaar! Het leaderboard werkt nu.
//
// =============================================================

// >>> VUL HIER JE SPREADSHEET ID IN <<<
const SPREADSHEET_ID = 'HIER_JE_SPREADSHEET_ID';
const SHEET_NAME = 'Leaderboard';
const MAX_LEADERBOARD_ENTRIES = 50;

// =============================================================
// GET endpoint — leaderboard ophalen
// =============================================================
function doGet(e) {
  try {
    const leaderboard = getLeaderboard();
    return ContentService
      .createTextOutput(JSON.stringify({ leaderboard: leaderboard }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================================
// POST endpoint — score indienen + leaderboard terugsturen
// =============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'submit') {
      // Validatie
      const name = String(data.name || '').substring(0, 50);
      const score = parseInt(data.score) || 0;
      const correct = parseInt(data.correct) || 0;
      const timeUsed = parseInt(data.timeUsed) || 0;

      if (!name) {
        throw new Error('Naam is verplicht');
      }

      // Score toevoegen aan sheet
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      const timestamp = new Date().toISOString();
      sheet.appendRow([timestamp, name, score, correct, timeUsed]);

      // Leaderboard ophalen en positie bepalen
      const leaderboard = getLeaderboard();
      const playerRank = findPlayerRank(leaderboard, name, score, timestamp);

      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          leaderboard: leaderboard,
          playerRank: playerRank
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error('Onbekende actie');
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================================
// Helper: Leaderboard data ophalen (gesorteerd op score, desc)
// =============================================================
function getLeaderboard() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return []; // Alleen header, geen data
  }

  // Alle data ophalen (behalve header)
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  // Omzetten naar objecten
  const entries = data.map(function(row) {
    return {
      timestamp: row[0],
      name: row[1],
      score: parseInt(row[2]) || 0,
      correct: parseInt(row[3]) || 0,
      timeUsed: parseInt(row[4]) || 0
    };
  });

  // Sorteer op score (hoog naar laag), dan op tijd (sneller = beter)
  entries.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeUsed - b.timeUsed; // bij gelijke score: snelste bovenaan
  });

  // Beperk tot max entries
  return entries.slice(0, MAX_LEADERBOARD_ENTRIES);
}

// =============================================================
// Helper: Speler positie vinden in leaderboard
// =============================================================
function findPlayerRank(leaderboard, name, score, timestamp) {
  // Zoek de meest recente entry van deze speler met deze score
  for (var i = 0; i < leaderboard.length; i++) {
    if (leaderboard[i].name === name && leaderboard[i].score === score) {
      return i + 1; // 1-based rank
    }
  }
  return -1; // Niet gevonden (buiten top)
}
