/**
 * OEES Modul: Tepelne cerpadlo (TC)
 * Porovnani vytapeni plynem/elektro vs tepelnym cerpadlem
 * Investice, navratnost, rocni uspora
 */

'use strict';

// ─── Data tepelnych cerpadel ────────────────────────────────────────────────
const TC_DATA = {
  typy: {
    'vzduch_voda': {
      nazev: 'Vzduch/voda',
      popis: 'Nejbeznejsi typ, vhodny pro modernizace',
      cop_prumer: 3.2,
      cop_zima: 2.2,
      cop_jaro_podzim: 3.8,
      cena_kw_od: 18000,
      cena_kw_do: 28000,
      zivotnost: 20
    },
    'zeme_voda': {
      nazev: 'Zeme/voda (vrty)',
      popis: 'Vyssi ucinnost, vyzaduje vrty nebo kolektor',
      cop_prumer: 4.0,
      cop_zima: 3.2,
      cop_jaro_podzim: 4.5,
      cena_kw_od: 25000,
      cena_kw_do: 40000,
      zivotnost: 25
    },
    'voda_voda': {
      nazev: 'Voda/voda',
      popis: 'Nejvyssi ucinnost, nutna studna',
      cop_prumer: 4.5,
      cop_zima: 3.8,
      cop_jaro_podzim: 5.0,
      cena_kw_od: 22000,
      cena_kw_do: 35000,
      zivotnost: 25
    }
  },

  // Sazba pro TC (D57d – dvoutarifni)
  sazba_tc: 'D57d',

  // Ceny zdroju tepla pro porovnani (Kc/MWh paliva)
  zdroje: {
    'plyn_kotel':     { nazev: 'Plynovy kondenzacni kotel', ucinnost: 0.97, cena_mwh_paliva: 1350 },
    'plyn_stary':     { nazev: 'Plynovy kotel (stary)',     ucinnost: 0.85, cena_mwh_paliva: 1350 },
    'elektro_primo':  { nazev: 'Elektricke primotopy',      ucinnost: 1.00, cena_mwh_paliva: 3800 },
    'elektro_akum':   { nazev: 'Elektro akumulacni',        ucinnost: 0.95, cena_mwh_paliva: 2500 },
    'uhli':           { nazev: 'Uhli (automaticky kotel)',   ucinnost: 0.82, cena_mwh_paliva: 950 },
    'drevo':          { nazev: 'Drevo/pelety',               ucinnost: 0.85, cena_mwh_paliva: 1100 }
  },

  // Dotace NZU 2026 (orientacni)
  dotace: {
    'vzduch_voda': { zaklad: 80000, bonus_kombinace_fve: 30000 },
    'zeme_voda':   { zaklad: 120000, bonus_kombinace_fve: 30000 },
    'voda_voda':   { zaklad: 120000, bonus_kombinace_fve: 30000 }
  }
};

// ─── Vypocet ────────────────────────────────────────────────────────────────

function vypocetTC() {
  const container = document.getElementById('tc_vysledky');
  if (!container) return;

  const tepelna_ztrata = parseFloat(document.getElementById('tc_ztrata')?.value) || 0;
  const spotreba_tepla = parseFloat(document.getElementById('tc_spotreba')?.value) || 0;
  const podil_tepla = parseFloat(document.getElementById('tc_podil_tepla')?.value) || 0;
  const typ_tc = document.getElementById('tc_typ')?.value || 'vzduch_voda';
  const stavajici_zdroj = document.getElementById('tc_zdroj')?.value || 'plyn_kotel';
  const chceDotaci = document.getElementById('tc_dotace')?.checked || false;
  const maFVE = document.getElementById('tc_fve')?.checked || false;

  // Prevezmi z tepelne bilance pokud je aktivni
  const bilance = OEES_STATE.case.teplo;
  if (bilance && bilance.mwh_tc > 0) {
    const el = document.getElementById('tc_podil_tepla');
    if (el && parseFloat(el.value) !== bilance.mwh_tc) el.value = bilance.mwh_tc;
  }

  // Priorita: podil_tepla > spotreba > ztrata
  const potreba_mwh_raw = podil_tepla > 0 ? podil_tepla : (spotreba_tepla > 0 ? spotreba_tepla : (tepelna_ztrata * 2200 / 1000));

  if (potreba_mwh_raw <= 0) {
    container.innerHTML = '<p class="text-muted">Vyplnte podil tepla, spotrebu nebo tepelnou ztratu.</p>';
    return;
  }

  const tc = TC_DATA.typy[typ_tc];
  const zdroj = TC_DATA.zdroje[stavajici_zdroj];

  // Rocni potreba tepla (MWh)
  const potreba_mwh = potreba_mwh_raw;

  // Stavajici naklady
  const potreba_paliva_mwh = potreba_mwh / zdroj.ucinnost;
  const naklad_stavajici = Math.round(potreba_paliva_mwh * zdroj.cena_mwh_paliva);

  // TC naklady (elektrina pro pohon TC)
  const spotreba_tc_mwh = potreba_mwh / tc.cop_prumer;
  const cena_elektro_tc = 2500; // Kc/MWh – sazba D57d prumer
  const naklad_tc = Math.round(spotreba_tc_mwh * cena_elektro_tc);

  // Rocni uspora
  const uspora = naklad_stavajici - naklad_tc;

  // Investice
  const vykon_tc = tepelna_ztrata > 0 ? tepelna_ztrata : Math.ceil(potreba_mwh / 2.2); // priblizne
  const investice_od = vykon_tc * tc.cena_kw_od;
  const investice_do = vykon_tc * tc.cena_kw_do;
  const investice_prumer = Math.round((investice_od + investice_do) / 2);

  // Dotace
  let dotace = 0;
  if (chceDotaci) {
    dotace = TC_DATA.dotace[typ_tc]?.zaklad || 0;
    if (maFVE) dotace += TC_DATA.dotace[typ_tc]?.bonus_kombinace_fve || 0;
  }

  const investice_po_dotaci = Math.max(0, investice_prumer - dotace);
  const navratnost = uspora > 0 ? (investice_po_dotaci / uspora).toFixed(1) : '---';

  // Uloz do stavu
  OEES_STATE.case.tc = {
    typ: typ_tc,
    stavajici_zdroj: stavajici_zdroj,
    potreba_mwh: potreba_mwh,
    cop: tc.cop_prumer,
    naklad_stavajici,
    naklad_tc,
    uspora,
    investice_prumer,
    dotace,
    investice_po_dotaci,
    navratnost
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Porovnani: ${zdroj.nazev} vs ${tc.nazev}</h3>

      <table class="breakdown-table">
        <thead><tr><th>Parametr</th><th>Hodnota</th></tr></thead>
        <tbody>
          <tr><td>Rocni potreba tepla</td><td><strong>${potreba_mwh.toFixed(1)} MWh</strong></td></tr>
          <tr><td>Naklady stavajici (${zdroj.nazev})</td><td>${naklad_stavajici.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr><td>Naklady TC (COP ${tc.cop_prumer})</td><td>${naklad_tc.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr class="total-row"><td><strong>Rocni uspora</strong></td><td class="text-success"><strong>${uspora.toLocaleString('cs-CZ')} Kc/rok</strong></td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:20px">Investice a navratnost</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Odhadovany vykon TC</td><td>${vykon_tc} kW</td></tr>
          <tr><td>Investice (odhad)</td><td>${investice_od.toLocaleString('cs-CZ')} – ${investice_do.toLocaleString('cs-CZ')} Kc</td></tr>
          ${dotace > 0 ? `<tr><td>Dotace NZU${maFVE ? ' + bonus FVE' : ''}</td><td class="text-success">-${dotace.toLocaleString('cs-CZ')} Kc</td></tr>` : ''}
          <tr><td>Investice po dotaci</td><td><strong>${investice_po_dotaci.toLocaleString('cs-CZ')} Kc</strong></td></tr>
          <tr class="total-row"><td><strong>Navratnost</strong></td><td><strong>${navratnost} let</strong></td></tr>
          <tr><td>Zivotnost TC</td><td>${tc.zivotnost} let</td></tr>
        </tbody>
      </table>

      <div style="margin-top:16px;padding:12px;background:var(--primary-light);border-radius:var(--radius-sm)">
        <strong>COP (Coefficient of Performance):</strong> TC ${tc.nazev} vyroba z 1 kWh elektriny
        priblizne ${tc.cop_prumer} kWh tepla. V zime ${tc.cop_zima}, na jare/podzimu ${tc.cop_jaro_podzim}.
      </div>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulTC(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const typyOptions = Object.entries(TC_DATA.typy).map(([key, t]) =>
    `<option value="${key}">${t.nazev} – ${t.popis} (COP ${t.cop_prumer})</option>`
  ).join('');

  const zdrojOptions = Object.entries(TC_DATA.zdroje).map(([key, z]) =>
    `<option value="${key}">${z.nazev}</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#10052;&#65039;</span> Tepelne cerpadlo – analyza nahrazeni zdroje tepla
      </div>

      <div class="state-grid">
        <!-- STAVAJICI ZDROJ -->
        <div class="state-panel stavajici">
          <h3>Stavajici zdroj tepla</h3>

          <div class="field">
            <label>Typ stavajiciho zdroje</label>
            <select id="tc_zdroj" onchange="vypocetTC()">
              ${zdrojOptions}
            </select>
          </div>

          <div class="field">
            <label>Tepelna ztrata objektu <span class="unit">kW</span></label>
            <input type="number" id="tc_ztrata" placeholder="napr. 15" min="0" step="0.5" oninput="vypocetTC()">
            <small class="text-muted">Z energetickeho stitku nebo auditu</small>
          </div>

          <div class="field">
            <label>Rocni spotreba tepla <span class="unit">MWh</span></label>
            <input type="number" id="tc_spotreba" placeholder="napr. 30" min="0" step="0.1" oninput="vypocetTC()">
            <small class="text-muted">Alternativa k tepelne ztrate</small>
          </div>
        </div>

        <!-- BUDOUCI – TC -->
        <div class="state-panel budouci">
          <h3>Tepelne cerpadlo</h3>

          <div class="field">
            <label>Typ tepelneho cerpadla</label>
            <select id="tc_typ" onchange="vypocetTC()">
              ${typyOptions}
            </select>
          </div>

          <div class="field">
            <label>Podil na vyrobe tepla <span class="unit">MWh/rok</span></label>
            <input type="number" id="tc_podil_tepla" placeholder="napr. 200" min="0" step="1" oninput="vypocetTC()">
            <small class="text-muted">Kolik MWh tepla ma TC pokryt. Zbytek pokryji ostatni zdroje (KGJ, kotel).</small>
          </div>

          <div class="field">
            <label>Provozni hodiny <span class="unit">hod/rok</span></label>
            <input type="number" id="tc_hodiny" placeholder="napr. 4000" min="0" max="8760" oninput="vypocetTC()">
            <small class="text-muted">Typicky 2000-5000 hod/rok</small>
          </div>

          <div class="field">
            <label>Vykonovy rozsah TC <span class="unit">kW</span></label>
            <select id="tc_vykon_rozsah" onchange="vypocetTC()">
              <option value="0_20">0 – 20 kW (rodinne domy)</option>
              <option value="20_40">20 – 40 kW (mensi BD)</option>
              <option value="40_60">40 – 60 kW (stredni objekty)</option>
              <option value="60_100">60 – 100 kW (vetsi objekty)</option>
              <option value="100_150">100 – 150 kW (velke prumyslove)</option>
            </select>
          </div>

          <div class="field">
            <label>Pocet cerpadel</label>
            <input type="number" id="tc_pocet" value="1" min="1" max="10" oninput="vypocetTC()">
          </div>

          <div class="field">
            <label>Naddimenzovani <span class="unit">%</span></label>
            <input type="number" id="tc_naddimenzovani" value="0" min="0" max="50" step="5" oninput="vypocetTC()">
            <small class="text-muted">Doporucene 10-20% pro spicky</small>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="tc_dotace" checked onchange="vypocetTC()">
              Uvazovat dotaci NZU (Nova zelena usporam)
            </label>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="tc_fve" onchange="vypocetTC()">
              Kombinace s FVE (bonus k dotaci)
            </label>
          </div>
        </div>
      </div>

      <div id="tc_vysledky" style="margin-top:20px">
        <p class="text-muted">Vyplnte tepelnou ztratu nebo spotrebu tepla pro zobrazeni analyzy.</p>
      </div>
    </div>`;
}
