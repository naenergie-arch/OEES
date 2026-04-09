/**
 * Admin modul: SVR lookup tabulka + Zeleny bonus KVET sazby
 * Editovatelne ceníky pro kogeneracni jednotky
 */

'use strict';

// ─── Vychozi data (pouziji se pokud nejsou v ADMIN DB) ─────────────────────

const SVR_LOOKUP_DEFAULT = [
  { tep_kw: 100,  el_kw: 62,   inv_kc_kw: 6000, kap_platba: 250, hod_kap: 2500, akt_platba: 700,  hod_akt: 80  },
  { tep_kw: 150,  el_kw: 95,   inv_kc_kw: 6000, kap_platba: 250, hod_kap: 2500, akt_platba: 700,  hod_akt: 80  },
  { tep_kw: 200,  el_kw: 130,  inv_kc_kw: 4500, kap_platba: 280, hod_kap: 3000, akt_platba: 700,  hod_akt: 120 },
  { tep_kw: 250,  el_kw: 167,  inv_kc_kw: 4500, kap_platba: 280, hod_kap: 3000, akt_platba: 800,  hod_akt: 120 },
  { tep_kw: 300,  el_kw: 205,  inv_kc_kw: 3200, kap_platba: 310, hod_kap: 3500, akt_platba: 800,  hod_akt: 160 },
  { tep_kw: 350,  el_kw: 244,  inv_kc_kw: 3200, kap_platba: 310, hod_kap: 3500, akt_platba: 800,  hod_akt: 160 },
  { tep_kw: 400,  el_kw: 285,  inv_kc_kw: 3200, kap_platba: 310, hod_kap: 3500, akt_platba: 800,  hod_akt: 160 },
  { tep_kw: 450,  el_kw: 328,  inv_kc_kw: 2500, kap_platba: 340, hod_kap: 4000, akt_platba: 900,  hod_akt: 200 },
  { tep_kw: 500,  el_kw: 372,  inv_kc_kw: 2500, kap_platba: 340, hod_kap: 4000, akt_platba: 900,  hod_akt: 200 },
  { tep_kw: 550,  el_kw: 418,  inv_kc_kw: 2500, kap_platba: 340, hod_kap: 4000, akt_platba: 900,  hod_akt: 200 },
  { tep_kw: 600,  el_kw: 465,  inv_kc_kw: 2500, kap_platba: 340, hod_kap: 4000, akt_platba: 900,  hod_akt: 200 },
  { tep_kw: 650,  el_kw: 514,  inv_kc_kw: 2000, kap_platba: 360, hod_kap: 4500, akt_platba: 900,  hod_akt: 240 },
  { tep_kw: 700,  el_kw: 565,  inv_kc_kw: 2000, kap_platba: 360, hod_kap: 4500, akt_platba: 900,  hod_akt: 240 },
  { tep_kw: 750,  el_kw: 617,  inv_kc_kw: 2000, kap_platba: 360, hod_kap: 4500, akt_platba: 1000, hod_akt: 240 },
  { tep_kw: 800,  el_kw: 670,  inv_kc_kw: 2000, kap_platba: 360, hod_kap: 4500, akt_platba: 1000, hod_akt: 240 },
  { tep_kw: 850,  el_kw: 725,  inv_kc_kw: 1700, kap_platba: 380, hod_kap: 5000, akt_platba: 1000, hod_akt: 280 },
  { tep_kw: 900,  el_kw: 782,  inv_kc_kw: 1700, kap_platba: 380, hod_kap: 5000, akt_platba: 1000, hod_akt: 280 },
  { tep_kw: 950,  el_kw: 840,  inv_kc_kw: 1700, kap_platba: 380, hod_kap: 5000, akt_platba: 1000, hod_akt: 280 },
  { tep_kw: 1000, el_kw: 900,  inv_kc_kw: 1700, kap_platba: 380, hod_kap: 5000, akt_platba: 1000, hod_akt: 280 }
];

const ZB_SAZBY_DEFAULT = [
  { el_od: 0,   el_do: 50,  sazba: 1894, popis: 'do 50 kWe' },
  { el_od: 50,  el_do: 200, sazba: 1921, popis: '50–200 kWe' },
  { el_od: 200, el_do: 999, sazba: 957,  popis: '200–999 kWe' }
];

// ─── Nacteni z ADMIN DB (pokud existuje) ───────────────────────────────────

let ADMIN_SVR_DATA = null;
let ADMIN_ZB_DATA = null;

async function nactiSvrZbZAdminu() {
  try {
    const url = ADMIN_CONFIG?.gas_url;
    if (!url) return;
    const resp = await fetch(url + '?action=admin_svr_zb');
    if (resp.ok) {
      const data = await resp.json();
      if (data.svr_lookup && data.svr_lookup.length > 0) ADMIN_SVR_DATA = data.svr_lookup;
      if (data.zb_sazby && data.zb_sazby.length > 0) ADMIN_ZB_DATA = data.zb_sazby;
    }
  } catch (e) {
    // Pouziji se vychozi data
  }
}

function getSvrLookup() { return ADMIN_SVR_DATA || SVR_LOOKUP_DEFAULT; }
function getZbSazby() { return ADMIN_ZB_DATA || ZB_SAZBY_DEFAULT; }

// ─── Admin UI: SVR tabulka ─────────────────────────────────────────────────

function renderSvrZbAdmin(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const svr = getSvrLookup();
  const zb = getZbSazby();

  let svrRows = svr.map((r, i) => `
    <tr>
      <td><input type="number" value="${r.tep_kw}" data-svr="${i}" data-field="tep_kw" class="admin-input-sm"></td>
      <td><input type="number" value="${r.el_kw}" data-svr="${i}" data-field="el_kw" class="admin-input-sm"></td>
      <td><input type="number" value="${r.inv_kc_kw}" data-svr="${i}" data-field="inv_kc_kw" class="admin-input-sm"></td>
      <td><input type="number" value="${r.kap_platba}" data-svr="${i}" data-field="kap_platba" class="admin-input-sm"></td>
      <td><input type="number" value="${r.hod_kap}" data-svr="${i}" data-field="hod_kap" class="admin-input-sm"></td>
      <td><input type="number" value="${r.akt_platba}" data-svr="${i}" data-field="akt_platba" class="admin-input-sm"></td>
      <td><input type="number" value="${r.hod_akt}" data-svr="${i}" data-field="hod_akt" class="admin-input-sm"></td>
    </tr>`).join('');

  let zbRows = zb.map((r, i) => `
    <tr>
      <td>${r.popis}</td>
      <td><input type="number" value="${r.el_od}" data-zb="${i}" data-field="el_od" class="admin-input-sm"></td>
      <td><input type="number" value="${r.el_do}" data-zb="${i}" data-field="el_do" class="admin-input-sm"></td>
      <td><input type="number" value="${r.sazba}" data-zb="${i}" data-field="sazba" class="admin-input-sm"></td>
    </tr>`).join('');

  container.innerHTML = `
    <h2>SVR – Sluzby vykonove rovnovahy (lookup tabulka)</h2>
    <p class="text-muted">Parametry pro vypocet prijmu z SVR dle tepelneho vykonu KGJ. Zdroj: SVR_kalkulace_KGJ.xlsx</p>
    <div style="overflow-x:auto">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Tep. vykon kW</th><th>El. vykon kW</th><th>Investice Kc/kW</th>
            <th>Kap. platba Kc/MW/h</th><th>Hod. kapacity</th>
            <th>Akt. platba Kc/MWh</th><th>Hod. aktivace</th>
          </tr>
        </thead>
        <tbody>${svrRows}</tbody>
      </table>
    </div>
    <button class="btn btn-primary" onclick="ulozSvrData()" style="margin-top:12px">Ulozit SVR tabulku</button>

    <h2 style="margin-top:32px">Zeleny bonus KVET – sazby ERU</h2>
    <p class="text-muted">Rocni sazby zeleneho bonusu dle elektrickeho vykonu KGJ. Zdroj: ERU c. 10/2025</p>
    <table class="admin-table" style="max-width:600px">
      <thead><tr><th>Pasmo</th><th>Od kWe</th><th>Do kWe</th><th>Sazba Kc/MWh</th></tr></thead>
      <tbody>${zbRows}</tbody>
    </table>
    <button class="btn btn-primary" onclick="ulozZbData()" style="margin-top:12px">Ulozit ZB sazby</button>
  `;
}

// ─── Ulozeni do ADMIN DB ───────────────────────────────────────────────────

async function ulozSvrData() {
  const rows = [];
  document.querySelectorAll('[data-svr]').forEach(el => {
    const i = parseInt(el.dataset.svr);
    if (!rows[i]) rows[i] = {};
    rows[i][el.dataset.field] = parseFloat(el.value) || 0;
  });

  try {
    const url = ADMIN_CONFIG?.gas_url;
    if (!url) { alert('Admin API neni nastaveno.'); return; }
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_save_svr', data: rows })
    });
    if (resp.ok) alert('SVR tabulka ulozena.');
    else alert('Chyba pri ukladani.');
  } catch (e) {
    alert('Chyba: ' + e.message);
  }
}

async function ulozZbData() {
  const rows = [];
  document.querySelectorAll('[data-zb]').forEach(el => {
    const i = parseInt(el.dataset.zb);
    if (!rows[i]) rows[i] = {};
    rows[i][el.dataset.field] = parseFloat(el.value) || 0;
  });

  try {
    const url = ADMIN_CONFIG?.gas_url;
    if (!url) { alert('Admin API neni nastaveno.'); return; }
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'admin_save_zb', data: rows })
    });
    if (resp.ok) alert('ZB sazby ulozeny.');
    else alert('Chyba pri ukladani.');
  } catch (e) {
    alert('Chyba: ' + e.message);
  }
}
