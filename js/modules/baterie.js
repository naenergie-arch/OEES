/**
 * OEES Modul: Bateriove uloziste
 * Self-consumption zvyseni, peak shaving, zaloha, ekonomika
 */

'use strict';

// ─── Data baterii ───────────────────────────────────────────────────────────
const BATERIE_DATA = {
  technologie: {
    'lfp': {
      nazev: 'LiFePO4 (LFP)',
      popis: 'Nejbeznejsi, bezpecne, dlouha zivotnost',
      cyklu: 6000,
      ucinnost: 0.95,
      cena_kwh_od: 8000,
      cena_kwh_do: 14000,
      zivotnost_let: 15,
      degradace_rok: 0.02
    },
    'nmc': {
      nazev: 'NMC (Li-ion)',
      popis: 'Vyssi hustota energie, kratsi zivotnost',
      cyklu: 3000,
      ucinnost: 0.93,
      cena_kwh_od: 7000,
      cena_kwh_do: 12000,
      zivotnost_let: 12,
      degradace_rok: 0.03
    },
    'natriumion': {
      nazev: 'Sodium-ion (Na-ion)',
      popis: 'Nova technologie, levnejsi, siroka teplotni tolerance',
      cyklu: 4000,
      ucinnost: 0.90,
      cena_kwh_od: 5000,
      cena_kwh_do: 9000,
      zivotnost_let: 12,
      degradace_rok: 0.025
    }
  },

  // Zpusoby vyuziti
  rezimy: {
    'self_consumption': {
      nazev: 'Zvyseni vlastni spotreby (s FVE)',
      popis: 'Prebytky z FVE se ukladaji a spotrebuji vecer/v noci'
    },
    'peak_shaving': {
      nazev: 'Peak shaving (VN odberatele)',
      popis: 'Snizeni spickoveho odberu → nizsi kapacitni platba'
    },
    'zaloha': {
      nazev: 'Zalozni zdroj (UPS)',
      popis: 'Ochrana pred vypadky site'
    },
    'arbitraz': {
      nazev: 'Cenova arbitraz (spot)',
      popis: 'Nabijeni pri nizke cene, vybijeni pri vysoke'
    }
  },

  // Dotace
  dotace_rd: 50000, // NZU – rodinne domy
  dotace_firma_procent: 0.35, // MPO – firmy, az 35% nakladu
  dotace_firma_max: 500000
};

// ─── Vypocet ekonomiky baterie ──────────────────────────────────────────────

function vypocetBaterie() {
  const container = document.getElementById('baterie_vysledky');
  if (!container) return;

  const kapacita = parseFloat(document.getElementById('bat_kapacita')?.value) || 0;
  const technologie = document.getElementById('bat_technologie')?.value || 'lfp';
  const rezim = document.getElementById('bat_rezim')?.value || 'self_consumption';
  const rocni_spotreba = parseFloat(document.getElementById('bat_spotreba')?.value) || 0;
  const fve_vykon = parseFloat(document.getElementById('bat_fve_vykon')?.value) || 0;
  const cena_nakup = parseFloat(document.getElementById('bat_cena_nakup')?.value) || 0; // Kc/MWh nizka
  const cena_prodej = parseFloat(document.getElementById('bat_cena_prodej')?.value) || 0; // Kc/MWh vysoka
  const chceDotaci = document.getElementById('bat_dotace')?.checked || false;
  const jeFirma = document.getElementById('bat_firma')?.checked || false;

  if (kapacita <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte kapacitu baterie.</p>';
    return;
  }

  const tech = BATERIE_DATA.technologie[technologie];

  // Investice
  const cena_prumer = (tech.cena_kwh_od + tech.cena_kwh_do) / 2;
  const investice = Math.round(kapacita * cena_prumer);

  // Rocni cykly (odhad)
  let cyklu_rok = 300; // prumerne 300 cyklu za rok
  let uspora_rok = 0;

  if (rezim === 'self_consumption' && fve_vykon > 0) {
    // Uspora = energie z baterie * rozdil ceny (cena site vs. cena FVE = ~0)
    const vyuzitelna_kwh = kapacita * cyklu_rok * tech.ucinnost;
    const cena_site = cena_prodej > 0 ? cena_prodej : 4500; // Kc/MWh default
    uspora_rok = Math.round(vyuzitelna_kwh * cena_site / 1000);
  } else if (rezim === 'peak_shaving') {
    // Uspora na kapacitni platbe – odhad
    const snizeni_kw = kapacita * 0.5; // baterie muze snizit spicku o ~50% kapacity
    const kapacitni_platba = 180; // Kc/kW/mesic (prumer VN)
    uspora_rok = Math.round(snizeni_kw * kapacitni_platba * 12);
  } else if (rezim === 'arbitraz' && cena_nakup > 0 && cena_prodej > 0) {
    const spread = (cena_prodej - cena_nakup); // Kc/MWh
    const vyuzitelna_mwh = kapacita * cyklu_rok * tech.ucinnost / 1000;
    uspora_rok = Math.round(vyuzitelna_mwh * spread);
  } else if (rezim === 'zaloha') {
    uspora_rok = 0; // Zaloha nema primou financi usporu
  }

  // Dotace
  let dotace = 0;
  if (chceDotaci) {
    if (jeFirma) {
      dotace = Math.min(Math.round(investice * BATERIE_DATA.dotace_firma_procent), BATERIE_DATA.dotace_firma_max);
    } else {
      dotace = BATERIE_DATA.dotace_rd;
    }
  }

  const investice_po_dotaci = Math.max(0, investice - dotace);
  const navratnost = uspora_rok > 0 ? (investice_po_dotaci / uspora_rok).toFixed(1) : '---';

  // Uloz do stavu
  OEES_STATE.case.baterie = {
    kapacita, technologie, rezim,
    investice, dotace, investice_po_dotaci,
    uspora_rok, navratnost
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Ekonomika baterioveho uloziste</h3>

      <table class="breakdown-table">
        <thead><tr><th>Parametr</th><th>Hodnota</th></tr></thead>
        <tbody>
          <tr><td>Technologie</td><td>${tech.nazev}</td></tr>
          <tr><td>Kapacita</td><td>${kapacita} kWh</td></tr>
          <tr><td>Ucinnost cyklu</td><td>${(tech.ucinnost * 100).toFixed(0)} %</td></tr>
          <tr><td>Zivotnost</td><td>${tech.cyklu.toLocaleString('cs-CZ')} cyklu / ${tech.zivotnost_let} let</td></tr>
          <tr><td>Degradace</td><td>${(tech.degradace_rok * 100).toFixed(0)} % / rok</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:20px">Financni analyza</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Investice (odhad)</td><td>${investice.toLocaleString('cs-CZ')} Kc</td></tr>
          ${dotace > 0 ? `<tr><td>Dotace</td><td class="text-success">-${dotace.toLocaleString('cs-CZ')} Kc</td></tr>` : ''}
          <tr><td>Investice po dotaci</td><td><strong>${investice_po_dotaci.toLocaleString('cs-CZ')} Kc</strong></td></tr>
          <tr><td>Rezim vyuziti</td><td>${BATERIE_DATA.rezimy[rezim].nazev}</td></tr>
          <tr class="total-row"><td><strong>Rocni uspora/vynos</strong></td>
            <td class="${uspora_rok > 0 ? 'text-success' : ''}"><strong>${uspora_rok > 0 ? uspora_rok.toLocaleString('cs-CZ') + ' Kc/rok' : 'Neaplikovatelne (zaloha)'}</strong></td></tr>
          <tr><td>Navratnost</td><td><strong>${navratnost} let</strong></td></tr>
        </tbody>
      </table>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulBaterie(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const techOptions = Object.entries(BATERIE_DATA.technologie).map(([key, t]) =>
    `<option value="${key}">${t.nazev} – ${t.popis}</option>`
  ).join('');

  const rezimOptions = Object.entries(BATERIE_DATA.rezimy).map(([key, r]) =>
    `<option value="${key}">${r.nazev}</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128267;</span> Bateriove uloziste – analyza a ekonomika
      </div>

      <div class="state-grid">
        <!-- PARAMETRY BATERIE -->
        <div class="state-panel stavajici">
          <h3>Parametry baterie</h3>

          <div class="field">
            <label>Kapacita baterie <span class="unit">kWh</span></label>
            <input type="number" id="bat_kapacita" placeholder="napr. 10" min="0" step="0.5" oninput="vypocetBaterie()">
          </div>

          <div class="field">
            <label>Technologie</label>
            <select id="bat_technologie" onchange="vypocetBaterie()">
              ${techOptions}
            </select>
          </div>

          <div class="field">
            <label>Rezim vyuziti</label>
            <select id="bat_rezim" onchange="vypocetBaterie()">
              ${rezimOptions}
            </select>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="bat_firma" onchange="vypocetBaterie()">
              Firemni objekt (MPO dotace)
            </label>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="bat_dotace" checked onchange="vypocetBaterie()">
              Uvazovat dotaci
            </label>
          </div>
        </div>

        <!-- DOPLNUJICI UDAJE -->
        <div class="state-panel budouci">
          <h3>Doplnujici udaje</h3>

          <div class="field">
            <label>Rocni spotreba objektu <span class="unit">MWh</span></label>
            <input type="number" id="bat_spotreba" placeholder="napr. 15" min="0" step="0.1" oninput="vypocetBaterie()">
          </div>

          <div class="field">
            <label>Vykon FVE (pokud je) <span class="unit">kWp</span></label>
            <input type="number" id="bat_fve_vykon" placeholder="napr. 10" min="0" step="0.1" oninput="vypocetBaterie()">
          </div>

          <div class="field">
            <label>Cena elektriny – nizky tarif <span class="unit">Kc/MWh</span></label>
            <input type="number" id="bat_cena_nakup" placeholder="1500" min="0" oninput="vypocetBaterie()">
            <small class="text-muted">Pro cenovou arbitraz (spot)</small>
          </div>

          <div class="field">
            <label>Cena elektriny – vysoky tarif <span class="unit">Kc/MWh</span></label>
            <input type="number" id="bat_cena_prodej" placeholder="4500" min="0" oninput="vypocetBaterie()">
          </div>
        </div>
      </div>

      <div id="baterie_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte kapacitu baterie pro zobrazeni analyzy.</p>
      </div>
    </div>`;
}
