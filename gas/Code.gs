/* ================================================================
   OEES ADMIN API – Google Apps Script Backend
   NaEnergie.cz | v1.0

   Endpointy:
   GET  ?action=...  → cteni dat
   POST {action:...} → zapis dat + auth
   ================================================================ */

// ── Konfigurace ──
const CONFIG = {
  ADMIN_PASSWORD: 'oees_admin_2026',
  SHEET_NAME: 'OEES_ADMIN_DB'
};

// Sheet ID se nastavi po prvnim spusteni setupu
function getSheetId() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_SHEET_ID') || '';
}

function getDb() {
  const id = getSheetId();
  if (!id) throw new Error('OEES_ADMIN_DB neni nastaven. Spustte setup().');
  return SpreadsheetApp.openById(id);
}

// ── Web App Handlers ──

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  let result;

  try {
    switch (action) {
      case 'admin_load_all':
        result = loadAll();
        break;
      case 'admin_ceniky':
        result = loadSheet('Ceniky', e.parameter.tech);
        break;
      case 'admin_rozpocty':
        result = loadSheet('Rozpocty', e.parameter.tech);
        break;
      case 'admin_pd':
        result = loadSheet('ProjektovaDokumentace', e.parameter.tech);
        break;
      case 'admin_naklady':
        result = loadSheet('NakladyCeniky', e.parameter.tech);
        break;
      case 'admin_provize_tabulka':
        result = loadSheet('ProvizniTabulka');
        break;
      case 'admin_provize_etapy':
        result = loadSheet('ProvizniEtapy');
        break;
      case 'admin_poradci':
        result = loadSheet('Poradci');
        break;
      case 'admin_dodavatele':
        result = loadSheet('Dodavatele');
        break;
      case 'admin_technologie':
        result = loadSheet('Technologie');
        break;
      case 'admin_users':
        result = loadSheet('AdminUsers');
        break;
      case 'admin_upresneni':
        result = loadSheet('Upresneni', null);
        break;
      case 'admin_upresneni_by_case':
        result = loadUpresneniByCase(e.parameter.caseId);
        break;
      case 'admin_settings':
        result = loadSettings();
        break;
      case 'cases_list':
        result = loadSheet('Cases');
        break;
      case 'case_detail':
        result = loadCaseDetail(e.parameter.caseId);
        break;
      case 'ping':
        result = { success: true, message: 'OEES Admin API v1.0', timestamp: new Date().toISOString() };
        break;
      default:
        result = { success: false, error: 'Neznama akce: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return jsonResponse(result);
}

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Neplatny JSON payload.' });
  }

  const action = payload.action || '';
  let result;

  try {
    switch (action) {
      case 'admin_auth':
        result = authenticate(payload.heslo);
        break;
      case 'admin_save':
        result = saveSheet(payload.sheet, payload.data);
        break;
      case 'admin_save_all':
        result = saveAll(payload);
        break;
      case 'case_save':
        result = saveCase(payload);
        break;
      default:
        result = { success: false, error: 'Neznama POST akce: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return jsonResponse(result);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Auth ──

function authenticate(heslo) {
  if (heslo === CONFIG.ADMIN_PASSWORD) {
    return { success: true };
  }
  // Zkus heslo ze Settings
  try {
    const settings = loadSettings();
    if (settings.data && settings.data.admin_password === heslo) {
      return { success: true };
    }
  } catch (e) {}
  return { success: false, error: 'Nespravne heslo.' };
}

// ── Load Functions ──

function loadAll() {
  const db = getDb();
  // sheetToJson vraci [] pokud list neexistuje – to je OK
  return {
    success: true,
    ceniky: sheetToJson(db.getSheetByName('Ceniky')),
    rozpocty: sheetToJson(db.getSheetByName('Rozpocty')),
    pd: sheetToJson(db.getSheetByName('ProjektovaDokumentace')),
    naklady: sheetToJson(db.getSheetByName('NakladyCeniky')),
    provizniTabulka: sheetToJson(db.getSheetByName('ProvizniTabulka')),
    provizniEtapy: sheetToJson(db.getSheetByName('ProvizniEtapy')),
    poradci: sheetToJson(db.getSheetByName('Poradci')),
    dodavatele: sheetToJson(db.getSheetByName('Dodavatele')),
    technologie: sheetToJson(db.getSheetByName('Technologie')),
    adminUsers: sheetToJson(db.getSheetByName('AdminUsers')),
    settings: settingsToObj(db.getSheetByName('Settings'))
  };
}

function loadSheet(sheetName, techFilter) {
  const db = getDb();
  const sheet = db.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'List nenalezen: ' + sheetName };

  let data = sheetToJson(sheet);
  if (techFilter) {
    data = data.filter(r => r.technologie === techFilter);
  }
  return { success: true, data: data };
}

function loadCaseDetail(caseId) {
  if (!caseId) return { success: false, error: 'Chybi caseId.' };
  const db = getDb();
  const sheet = db.getSheetByName('Cases');
  if (!sheet) return { success: false, error: 'List Cases nenalezen.' };
  const rows = sheetToJson(sheet);
  const row = rows.find(r => r.case_id === caseId);
  if (!row) return { success: false, error: 'Pripad nenalezen: ' + caseId };
  return { success: true, data: row };
}

function saveCase(payload) {
  const db = getDb();
  let sheet = db.getSheetByName('Cases');
  const row = {
    case_id:       payload.case_id || ('CASE-' + Date.now().toString().slice(-8)),
    created:       payload.created || new Date().toISOString(),
    updated:       new Date().toISOString(),
    company:       payload.company || '',
    contact_email: payload.contact_email || '',
    contact_phone: payload.contact_phone || '',
    address:       payload.address || '',
    type:          payload.type || '',
    aktivni_moduly: payload.aktivni_moduly || '',
    data_json:     payload.data_json || '{}'
  };

  if (!sheet) {
    sheet = db.insertSheet('Cases');
    const headers = Object.keys(row);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f2fa');
    sheet.setFrozenRows(1);
  }

  // Najdi existujici radek s timto case_id
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const caseIdCol = headers.indexOf('case_id');
  let existingRow = -1;
  if (caseIdCol >= 0) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][caseIdCol] === row.case_id) { existingRow = i + 1; break; }
    }
  }

  const vals = headers.map(h => row[h] !== undefined ? row[h] : '');

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, vals.length).setValues([vals]);
  } else {
    sheet.appendRow(vals);
  }

  return { success: true, case_id: row.case_id };
}

function loadSettings() {
  const db = getDb();
  const sheet = db.getSheetByName('Settings');
  if (!sheet) return { success: false, error: 'List Settings nenalezen.' };
  return { success: true, data: settingsToObj(sheet) };
}

// ── Save Functions ──

function saveSheet(sheetName, data) {
  if (!sheetName || !Array.isArray(data)) {
    return { success: false, error: 'Chybi sheetName nebo data (array).' };
  }

  const db = getDb();
  let sheet = db.getSheetByName(sheetName);

  // Auto-create: pokud list neexistuje, vytvorime ho s hlavickou z prvniho objektu
  if (!sheet) {
    if (data.length === 0) return { success: true, saved: 0 };
    sheet = db.insertSheet(sheetName);
    const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e8f2fa');
    sheet.setFrozenRows(1);
  }

  // Smazat existujici data (zachovat hlavicku)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  if (data.length === 0) return { success: true, saved: 0 };

  // Zapsat nova data
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = data.map(item => headers.map(h => {
    if (h.startsWith('_')) return '';
    return item[h] !== undefined ? item[h] : '';
  }));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  return { success: true, saved: rows.length };
}

function saveAll(payload) {
  const results = {};
  const sheets = ['ceniky', 'rozpocty', 'pd', 'naklady', 'provizniTabulka', 'provizniEtapy', 'poradci', 'dodavatele', 'technologie', 'adminUsers'];
  const sheetMap = {
    ceniky: 'Ceniky',
    rozpocty: 'Rozpocty',
    pd: 'ProjektovaDokumentace',
    naklady: 'NakladyCeniky',
    provizniTabulka: 'ProvizniTabulka',
    provizniEtapy: 'ProvizniEtapy',
    poradci: 'Poradci',
    dodavatele: 'Dodavatele',
    technologie: 'Technologie',
    adminUsers: 'AdminUsers'
  };

  sheets.forEach(key => {
    if (payload[key] && Array.isArray(payload[key])) {
      results[key] = saveSheet(sheetMap[key], payload[key]);
    }
  });

  // Settings zvlast (key-value)
  if (payload.settings && typeof payload.settings === 'object') {
    results.settings = saveSettings(payload.settings);
  }

  return { success: true, results };
}

function saveSettings(obj) {
  const db = getDb();
  const sheet = db.getSheetByName('Settings');
  if (!sheet) return { success: false, error: 'List Settings nenalezen.' };

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
  }

  const entries = Object.entries(obj);
  if (entries.length > 0) {
    sheet.getRange(2, 1, entries.length, 2).setValues(entries);
  }
  return { success: true, saved: entries.length };
}

// ── Upresneni by Case ──

function loadUpresneniByCase(caseId) {
  const db = getDb();
  const sheet = db.getSheetByName('Upresneni');
  if (!sheet) return { success: false, error: 'List Upresneni nenalezen.' };
  let data = sheetToJson(sheet);
  if (caseId) data = data.filter(r => r.caseId === caseId);
  return { success: true, data: data };
}

// ── Sheet <-> JSON Helpers ──

function sheetToJson(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  return data.slice(1).filter(row => row.some(cell => cell !== '')).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function settingsToObj(sheet) {
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const obj = {};
  data.slice(1).forEach(row => {
    if (row[0]) obj[row[0]] = row[1];
  });
  return obj;
}
