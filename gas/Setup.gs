/* ================================================================
   OEES ADMIN – Setup: vytvoreni OEES_ADMIN_DB sheetu s 8 listy
   Spustit JEDNOU z Apps Script editoru: setup()
   ================================================================ */

function setup() {
  // Vytvor novy spreadsheet
  const ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
  const sheetId = ss.getId();

  // Uloz ID do Script Properties
  PropertiesService.getScriptProperties().setProperty('ADMIN_SHEET_ID', sheetId);

  // Smazat vychozi "Sheet1"
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('List1');

  // ── 1. Ceniky ──
  const sCeniky = ss.insertSheet('Ceniky');
  sCeniky.getRange(1, 1, 1, 9).setValues([[
    'cenikId', 'technologie', 'nazev_polozky', 'mj', 'cena_nakup', 'marze_pct', 'cena_prodej', 'poznamka', 'platnost_od'
  ]]);
  formatHeader(sCeniky);

  // ── 2. Rozpocty (rozsirene schema v2) ──
  const sRozpocty = ss.insertSheet('Rozpocty');
  sRozpocty.getRange(1, 1, 1, 11).setValues([[
    'rozpocetId', 'technologie', 'typ_rozpoctu', 'nazev_polozky', 'mj',
    'podil_pct', 'poradi', 'mnozstvi_vzorec', 'cena_ref_cenikId', 'cena_vzorec', 'poznamka'
  ]]);
  formatHeader(sRozpocty);

  // ── 3. ProjektovaDokumentace ──
  const sPD = ss.insertSheet('ProjektovaDokumentace');
  sPD.getRange(1, 1, 1, 8).setValues([[
    'pdId', 'technologie', 'nazev_polozky', 'popis', 'cena_bd', 'cena_firmy', 'cena_mesta', 'zahrnuto_v_base'
  ]]);
  formatHeader(sPD);

  // ── 4. NakladyCeniky ──
  const sNaklady = ss.insertSheet('NakladyCeniky');
  sNaklady.getRange(1, 1, 1, 7).setValues([[
    'nakladId', 'dodavatel', 'technologie', 'nazev_polozky', 'cena_nakup', 'datum', 'poznamka'
  ]]);
  formatHeader(sNaklady);

  // ── 5. ProvizniTabulka ──
  const sProvize = ss.insertSheet('ProvizniTabulka');
  sProvize.getRange(1, 1, 1, 5).setValues([[
    'pasmoId', 'dolni_kc', 'horni_kc', 'dolni_marze', 'horni_marze'
  ]]);
  // Naplnit vychozi skalovaci tabulku
  sProvize.getRange(2, 1, 8, 5).setValues([
    [1, 0,        1000000,   20, 20],
    [2, 1000000,  2000000,   14, 12],
    [3, 2000000,  3000000,   12, 10],
    [4, 3000000,  5000000,   10, 8],
    [5, 5000000,  10000000,  8,  7],
    [6, 10000000, 15000000,  7,  6],
    [7, 15000000, 20000000,  6,  5],
    [8, 20000000, 999999999, 5,  4]
  ]);
  formatHeader(sProvize);

  // ── 6. ProvizniEtapy ──
  const sEtapy = ss.insertSheet('ProvizniEtapy');
  sEtapy.getRange(1, 1, 1, 5).setValues([[
    'etapaId', 'podil_pct', 'cinnost', 'za_obchod_pct', 'za_odbornost_pct'
  ]]);
  sEtapy.getRange(2, 1, 9, 5).setValues([
    [1, 5,  'Poskytnuti kontaktu na klienta',              5,  0],
    [2, 10, 'Domluveni 1. schuzky, zalozeni OP v NIS',     10, 0],
    [3, 20, 'Absolvovani 1. schuzky u klienta',            10, 10],
    [4, 5,  'Nahrani zakladnich podkladu do NIS',           5,  0],
    [5, 10, 'Vypracovani predbezne studie v kalkulatoru',   0,  10],
    [6, 10, 'Vypracovani modelace v PVSol/SolarEdge',       0,  10],
    [7, 30, 'Obhajoba + podpis studie/smlouvy',            15, 15],
    [8, 5,  'Obstarani podkladu za EP a nahrani do NIS',    5,  0],
    [9, 5,  'Obstarani podkladu za ESO a nahrani do NIS',   0,  5]
  ]);
  formatHeader(sEtapy);

  // ── 7. Poradci ──
  const sPoradci = ss.insertSheet('Poradci');
  sPoradci.getRange(1, 1, 1, 6).setValues([[
    'poradceId', 'jmeno', 'telefon', 'email', 'role', 'aktivni'
  ]]);
  formatHeader(sPoradci);

  // ── 8. Dodavatele ──
  const sDodavatele = ss.insertSheet('Dodavatele');
  sDodavatele.getRange(1, 1, 1, 8).setValues([[
    'nazev', 'ico', 'kontakt', 'telefon', 'email', 'technologie', 'poznamka', 'aktivni'
  ]]);
  formatHeader(sDodavatele);

  // ── 9. Technologie ──
  const sTechnologie = ss.insertSheet('Technologie');
  sTechnologie.getRange(1, 1, 1, 4).setValues([[
    'value', 'label', 'cenovy_vzorec', 'nazev_rozpocet'
  ]]);
  formatHeader(sTechnologie);

  // ── 10. AdminUsers ──
  const sAdminUsers = ss.insertSheet('AdminUsers');
  sAdminUsers.getRange(1, 1, 1, 4).setValues([[
    'jmeno', 'email', 'heslo', 'aktivni'
  ]]);
  formatHeader(sAdminUsers);

  // ── 11. Settings ──
  const sSettings = ss.insertSheet('Settings');
  sSettings.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  sSettings.getRange(2, 1, 6, 2).setValues([
    ['admin_password', CONFIG.ADMIN_PASSWORD],
    ['fixni_slozka_kc', 1000000],
    ['fixni_slozka_pct', 20],
    ['bod_delic', 222.22],
    ['es_podil', 50],
    ['voda_marze_pct', 20]
  ]);
  formatHeader(sSettings);

  // ── 12. Upresneni (workflow predbezna → finalni studie) ──
  const sUpresneni = ss.insertSheet('Upresneni');
  sUpresneni.getRange(1, 1, 1, 12).setValues([[
    'upresneniId', 'caseId', 'rozpocetId', 'technologie', 'typ_rozpoctu',
    'nazev_polozky', 'cena_predbezna', 'cena_upresnena', 'upresneno',
    'upresneno_kym', 'upresneno_kdy', 'poznamka'
  ]]);
  formatHeader(sUpresneni);

  // Smazat prazdny vychozi list
  if (defaultSheet) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  Logger.log('=== OEES_ADMIN_DB SETUP COMPLETE ===');
  Logger.log('Sheet ID: ' + sheetId);
  Logger.log('Sheet URL: ' + ss.getUrl());

  return {
    success: true,
    sheetId: sheetId,
    url: ss.getUrl()
  };
}

function formatHeader(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;
  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8f2fa');
  sheet.setFrozenRows(1);
}

// Pomocna funkce pro pripadne presmerovani na existujici sheet
function setSheetId(id) {
  PropertiesService.getScriptProperties().setProperty('ADMIN_SHEET_ID', id);
  Logger.log('ADMIN_SHEET_ID nastaven na: ' + id);
}

// Prida chybejici listy do existujici DB (spustit rucne pokud DB uz existuje)
function addMissingSheets() {
  const db = getDb();
  const existujici = db.getSheets().map(s => s.getName());

  if (!existujici.includes('Dodavatele')) {
    const s = db.insertSheet('Dodavatele');
    s.getRange(1, 1, 1, 8).setValues([['nazev', 'ico', 'kontakt', 'telefon', 'email', 'technologie', 'poznamka', 'aktivni']]);
    formatHeader(s);
    Logger.log('Pridan list: Dodavatele');
  }

  if (!existujici.includes('Technologie')) {
    const s = db.insertSheet('Technologie');
    s.getRange(1, 1, 1, 4).setValues([['value', 'label', 'cenovy_vzorec', 'nazev_rozpocet']]);
    formatHeader(s);
    Logger.log('Pridan list: Technologie');
  }

  if (!existujici.includes('AdminUsers')) {
    const s = db.insertSheet('AdminUsers');
    s.getRange(1, 1, 1, 4).setValues([['jmeno', 'email', 'heslo', 'aktivni']]);
    formatHeader(s);
    Logger.log('Pridan list: AdminUsers');
  }

  Logger.log('addMissingSheets() dokonceno.');
}
