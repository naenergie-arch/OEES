/**
 * OEES Modul: Financovani
 * Uver (Ano/Ne/castecne), castka, urokova sazba, splatnost,
 * NRB uver na FVE do 50 kWp, odklad splatek,
 * 25-leta tabulka s inflaci 3.5%
 */

'use strict';

// ─── Data financovani ───────────────────────────────────────────────────────
const FINANCOVANI_DATA = {
  inflace_procent: 3.5,       // rocni inflace pro projekci
  horizont_let: 25,
  nrb_max_kwp: 50,            // NRB uver jen do 50 kWp
  nrb_sazba_procent: 2.0,     // zvyhodnena sazba NRB
  nrb_max_splatnost: 15,      // let
  nrb_max_odklad: 3           // roky odkladu
};

// ─── Vypocet financovani ────────────────────────────────────────────────────

function vypocetFinancovani() {
  const container = document.getElementById('financovani_vysledky');
  if (!container) return;

  const chceUver = document.getElementById('fin_uver')?.value || 'ne';
  const castka = parseFloat(document.getElementById('fin_castka')?.value) || 0;
  const sazba = parseFloat(document.getElementById('fin_sazba')?.value) || 5.0;
  const splatnost = parseInt(document.getElementById('fin_splatnost')?.value) || 10;
  const odklad = parseInt(document.getElementById('fin_odklad')?.value) || 0;

  const chceNRB = document.getElementById('fin_nrb')?.checked || false;
  const nrb_castka = parseFloat(document.getElementById('fin_nrb_castka')?.value) || 0;
  const nrb_splatnost = parseInt(document.getElementById('fin_nrb_splatnost')?.value) || 10;

  const celkova_investice = parseFloat(document.getElementById('fin_investice')?.value) || 0;
  const rocni_uspora = parseFloat(document.getElementById('fin_rocni_uspora')?.value) || 0;
  const dotace = parseFloat(document.getElementById('fin_dotace')?.value) || 0;

  const smlouva_reklama = document.getElementById('fin_reklama')?.checked || false;
  const varianta_prvni_platby = document.getElementById('fin_prvni_platba')?.value || 'standard';

  if (celkova_investice <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte celkovou investici pro zobrazeni.</p>';
    return;
  }

  // Vlastni zdroje vs uver
  const investice_po_dotaci = Math.max(0, celkova_investice - dotace);
  const uverova_castka = (chceUver === 'ano') ? investice_po_dotaci
                       : (chceUver === 'castecne') ? castka
                       : 0;
  const vlastni_zdroje = investice_po_dotaci - uverova_castka;

  // Mesicni splatka (anuita)
  let mesicni_splatka = 0;
  let celkem_urok = 0;
  if (uverova_castka > 0 && splatnost > 0) {
    const r = sazba / 100 / 12;
    const n = splatnost * 12;
    if (r > 0) {
      mesicni_splatka = uverova_castka * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      celkem_urok = Math.round(mesicni_splatka * n - uverova_castka);
    } else {
      mesicni_splatka = uverova_castka / n;
    }
    mesicni_splatka = Math.round(mesicni_splatka);
  }

  // NRB uver
  let nrb_mesicni = 0;
  let nrb_celkem_urok = 0;
  if (chceNRB && nrb_castka > 0) {
    const r2 = FINANCOVANI_DATA.nrb_sazba_procent / 100 / 12;
    const n2 = nrb_splatnost * 12;
    if (r2 > 0) {
      nrb_mesicni = nrb_castka * r2 * Math.pow(1 + r2, n2) / (Math.pow(1 + r2, n2) - 1);
      nrb_celkem_urok = Math.round(nrb_mesicni * n2 - nrb_castka);
    }
    nrb_mesicni = Math.round(nrb_mesicni);
  }

  // 25-leta projekce
  const inflace = FINANCOVANI_DATA.inflace_procent / 100;
  let tabulkaHTML = '';
  let kumulativni_cf = -investice_po_dotaci;
  let navratnost = null;

  for (let rok = 1; rok <= FINANCOVANI_DATA.horizont_let; rok++) {
    const uspora_rok = Math.round(rocni_uspora * Math.pow(1 + inflace, rok - 1));
    let splatka_rok = 0;

    // Hlavni uver (s odkladem)
    if (rok > odklad && rok <= (splatnost + odklad) && uverova_castka > 0) {
      splatka_rok += mesicni_splatka * 12;
    }

    // NRB
    if (chceNRB && rok <= nrb_splatnost && nrb_castka > 0) {
      splatka_rok += nrb_mesicni * 12;
    }

    const cashflow = uspora_rok - splatka_rok;
    kumulativni_cf += cashflow;

    if (navratnost === null && kumulativni_cf >= 0) {
      navratnost = rok;
    }

    tabulkaHTML += `
      <tr>
        <td>${rok}</td>
        <td>${uspora_rok.toLocaleString('cs-CZ')}</td>
        <td>${splatka_rok > 0 ? '-' + splatka_rok.toLocaleString('cs-CZ') : '—'}</td>
        <td class="${cashflow >= 0 ? 'text-success' : 'text-danger'}">${cashflow.toLocaleString('cs-CZ')}</td>
        <td class="${kumulativni_cf >= 0 ? 'text-success' : 'text-danger'}">${kumulativni_cf.toLocaleString('cs-CZ')}</td>
      </tr>`;
  }

  // Uloz do stavu
  OEES_STATE.case.financovani = {
    chceUver, uverova_castka, vlastni_zdroje, sazba, splatnost,
    mesicni_splatka, celkem_urok, dotace, navratnost,
    smlouva_reklama, varianta_prvni_platby
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Financovani projektu</h3>

      <table class="breakdown-table">
        <tbody>
          <tr><td>Celkova investice</td><td>${celkova_investice.toLocaleString('cs-CZ')} Kc</td></tr>
          <tr><td>Dotace</td><td class="text-success">-${dotace.toLocaleString('cs-CZ')} Kc</td></tr>
          <tr><td>Investice po dotaci</td><td><strong>${investice_po_dotaci.toLocaleString('cs-CZ')} Kc</strong></td></tr>
          ${uverova_castka > 0 ? `
            <tr><td>Uverova castka</td><td>${uverova_castka.toLocaleString('cs-CZ')} Kc</td></tr>
            <tr><td>Urokova sazba</td><td>${sazba} % p.a.</td></tr>
            <tr><td>Splatnost</td><td>${splatnost} let ${odklad > 0 ? '(odklad ' + odklad + ' roky)' : ''}</td></tr>
            <tr><td>Mesicni splatka</td><td>${mesicni_splatka.toLocaleString('cs-CZ')} Kc/mesic</td></tr>
            <tr><td>Celkem zaplaceno na urocich</td><td>${celkem_urok.toLocaleString('cs-CZ')} Kc</td></tr>
          ` : ''}
          ${vlastni_zdroje > 0 ? `<tr><td>Vlastni zdroje</td><td>${vlastni_zdroje.toLocaleString('cs-CZ')} Kc</td></tr>` : ''}
          ${chceNRB && nrb_castka > 0 ? `
            <tr><td>NRB uver (zvyhodneny)</td><td>${nrb_castka.toLocaleString('cs-CZ')} Kc @ ${FINANCOVANI_DATA.nrb_sazba_procent}%</td></tr>
            <tr><td>NRB mesicni splatka</td><td>${nrb_mesicni.toLocaleString('cs-CZ')} Kc/mesic</td></tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Navratnost investice</strong></td>
            <td><strong>${navratnost ? navratnost + ' let' : 'Vice nez 25 let'}</strong></td>
          </tr>
        </tbody>
      </table>

      <h3 style="margin-top:20px">25-leta projekce (inflace ${FINANCOVANI_DATA.inflace_procent}%/rok)</h3>
      <div style="max-height:400px;overflow-y:auto">
        <table class="breakdown-table">
          <thead>
            <tr><th>Rok</th><th>Uspora</th><th>Splatky</th><th>Cash flow</th><th>Kumulativne</th></tr>
          </thead>
          <tbody>${tabulkaHTML}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulFinancovani(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128176;</span> Financovani projektu
      </div>

      <div class="state-grid">
        <div class="state-panel stavajici">
          <h3>Investice a dotace</h3>

          <div class="field">
            <label>Celkova investice projektu <span class="unit">Kc</span></label>
            <input type="number" id="fin_investice" placeholder="napr. 2000000" min="0" oninput="vypocetFinancovani()">
            <small class="text-muted">Soucet vsech investic ze vsech modulu</small>
          </div>

          <div class="field">
            <label>Predpokladana dotace <span class="unit">Kc</span></label>
            <input type="number" id="fin_dotace" placeholder="0" min="0" oninput="vypocetFinancovani()">
          </div>

          <div class="field">
            <label>Celkova rocni uspora <span class="unit">Kc/rok</span></label>
            <input type="number" id="fin_rocni_uspora" placeholder="napr. 150000" min="0" oninput="vypocetFinancovani()">
            <small class="text-muted">Soucet rocnich uspor ze vsech modulu</small>
          </div>

          <div class="field">
            <label>Varianta prvni platby</label>
            <select id="fin_prvni_platba" onchange="vypocetFinancovani()">
              <option value="standard">Standardni</option>
              <option value="odlozena">Odlozena</option>
              <option value="zaloha">Se zalohou</option>
            </select>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="fin_reklama" onchange="vypocetFinancovani()">
              Smlouva o reklame
            </label>
          </div>
        </div>

        <div class="state-panel budouci">
          <h3>Uverove financovani</h3>

          <div class="field">
            <label>Financovani uveram</label>
            <select id="fin_uver" onchange="toggleUverFields(); vypocetFinancovani()">
              <option value="ne">Ne – vlastni zdroje</option>
              <option value="ano">Ano – cele z uveru</option>
              <option value="castecne">Castecne</option>
            </select>
          </div>

          <div id="fin_uver_fields" style="display:none">
            <div class="field">
              <label>Castka uveru <span class="unit">Kc</span></label>
              <input type="number" id="fin_castka" placeholder="Castka" min="0" oninput="vypocetFinancovani()">
              <small class="text-muted">Pouze u castecneho financovani</small>
            </div>

            <div class="field">
              <label>Urokova sazba <span class="unit">% p.a.</span></label>
              <input type="number" id="fin_sazba" value="5.0" min="0" max="20" step="0.1" oninput="vypocetFinancovani()">
            </div>

            <div class="field">
              <label>Splatnost <span class="unit">let</span></label>
              <input type="number" id="fin_splatnost" value="10" min="1" max="30" oninput="vypocetFinancovani()">
            </div>

            <div class="field">
              <label>Odklad splatek <span class="unit">roky (0-3)</span></label>
              <input type="number" id="fin_odklad" value="0" min="0" max="3" oninput="vypocetFinancovani()">
            </div>
          </div>

          <div class="card-subtitle">NRB uver (zvyhodneny pro FVE do ${FINANCOVANI_DATA.nrb_max_kwp} kWp)</div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="fin_nrb" onchange="vypocetFinancovani()">
              Vyuzit NRB uver (${FINANCOVANI_DATA.nrb_sazba_procent}% p.a.)
            </label>
          </div>

          <div class="field">
            <label>Castka NRB <span class="unit">Kc</span></label>
            <input type="number" id="fin_nrb_castka" placeholder="0" min="0" oninput="vypocetFinancovani()">
          </div>

          <div class="field">
            <label>Splatnost NRB <span class="unit">let</span></label>
            <input type="number" id="fin_nrb_splatnost" value="10" min="1" max="${FINANCOVANI_DATA.nrb_max_splatnost}" oninput="vypocetFinancovani()">
          </div>
        </div>
      </div>

      <div id="financovani_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte celkovou investici pro zobrazeni financni analyzy.</p>
      </div>
    </div>`;
}

// ─── Toggle uver fields ─────────────────────────────────────────────────────
function toggleUverFields() {
  const uver = document.getElementById('fin_uver')?.value || 'ne';
  const fields = document.getElementById('fin_uver_fields');
  if (fields) fields.style.display = (uver === 'ne') ? 'none' : 'block';
}
