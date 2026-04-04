/**
 * OEES Modul: Voda
 * Studena/tepla voda, rekuperace tepla z odpadni vody,
 * recyklace odpadni vody, usporne sprchy, stoupacky, WC, kanalizace
 */

'use strict';

// ─── Data voda ──────────────────────────────────────────────────────────────
const VODA_DATA = {
  // Prumerna cena vody (vodne + stocne) 2026
  cena_studena_m3: 110,    // Kc/m3 (CR prumer)
  cena_stocne_m3: 55,      // Kc/m3 (prum. stocne)
  cena_ohrev_kwh: 4.50,    // Kc/kWh pro ohrev vody (elektricky)
  cena_ohrev_plyn_kwh: 2.80, // Kc/kWh pro ohrev vody (plyn)

  // Spotreba tepla na ohrev 1 m3 studene → teple vody
  teplo_ohrev_kwh_m3: 58,  // kWh/m3 (z 10°C na 55°C)

  // Normy spotreby na osobu/den
  spotreba_studena_l_osoba_den: 100,
  spotreba_tepla_l_osoba_den: 40,

  // Rekuperace tepla z odpadni vody (DWHR)
  rekuperace: {
    'zadna':    { nazev: 'Bez rekuperace',             ucinnost: 0,    cena_jednotka: 0 },
    'sprchovy': { nazev: 'Sprchovy vymenik (DWHR)',    ucinnost: 0.30, cena_jednotka: 25000 },
    'centralni':{ nazev: 'Centralni vymenik odpadni vody', ucinnost: 0.45, cena_jednotka: 85000 },
    'tc_odpad': { nazev: 'TC na odpadni vodu',         ucinnost: 0.60, cena_jednotka: 250000 }
  },

  // Recyklace odpadni vody (sedova/seda voda)
  recyklace: {
    'zadna':     { nazev: 'Bez recyklace',                   procent_uspory: 0,    cena: 0 },
    'destova':   { nazev: 'Zachytavani destove vody',        procent_uspory: 0.15, cena: 45000 },
    'seda':      { nazev: 'Recyklace sede vody (umyvadla)',  procent_uspory: 0.25, cena: 180000 },
    'kompletni': { nazev: 'Kompletni recyklace + destova',   procent_uspory: 0.40, cena: 350000 }
  },

  // Usporne prvky
  usporne_prvky: {
    'sprchy':     { nazev: 'Usporne sprchove hlavice',     uspora_procent: 0.30, cena_ks: 1200 },
    'perlatory': { nazev: 'Perlatory na baterie',         uspora_procent: 0.20, cena_ks: 350 },
    'wc':         { nazev: 'Dvojtlacitko WC',              uspora_procent: 0.25, cena_ks: 2500 },
    'stoupacky':  { nazev: 'Vymena stoupacek',             uspora_procent: 0.10, cena_ks: 35000 }
  },

  // Specificke provozy
  wellness_litr_navstevnik: 150,
  hotel_litr_host_noc: 200,
  bazen_m3_doplneni_den: 0.5 // % objemu/den na doplneni
};

// ─── Vypocet vody ───────────────────────────────────────────────────────────

function vypocetVoda() {
  const container = document.getElementById('voda_vysledky');
  if (!container) return;

  // Zakladni udaje
  const pocet_osob = parseInt(document.getElementById('voda_pocet_osob')?.value) || 0;
  const pocet_navstevniku = parseInt(document.getElementById('voda_navstevniku')?.value) || 0;
  const studenaDenL = parseFloat(document.getElementById('voda_studena_den')?.value) || VODA_DATA.spotreba_studena_l_osoba_den;
  const teplaDenL = parseFloat(document.getElementById('voda_tepla_den')?.value) || VODA_DATA.spotreba_tepla_l_osoba_den;
  const zdroj_ohrevu = document.getElementById('voda_zdroj_ohrevu')?.value || 'elektro';
  const cena_vody = parseFloat(document.getElementById('voda_cena_m3')?.value) || VODA_DATA.cena_studena_m3;
  const cena_stocne = parseFloat(document.getElementById('voda_stocne_m3')?.value) || VODA_DATA.cena_stocne_m3;

  // Rekuperace & recyklace
  const typ_rekuperace = document.getElementById('voda_rekuperace')?.value || 'zadna';
  const typ_recyklace = document.getElementById('voda_recyklace')?.value || 'zadna';

  // Usporne prvky
  const chce_sprchy = document.getElementById('voda_sprchy')?.checked || false;
  const chce_perlatory = document.getElementById('voda_perlatory')?.checked || false;
  const chce_wc = document.getElementById('voda_wc')?.checked || false;
  const chce_stoupacky = document.getElementById('voda_stoupacky')?.checked || false;
  const pocet_sprch = parseInt(document.getElementById('voda_pocet_sprch')?.value) || 0;
  const pocet_baterif = parseInt(document.getElementById('voda_pocet_baterif')?.value) || 0;
  const pocet_wc_ks = parseInt(document.getElementById('voda_pocet_wc')?.value) || 0;
  const pocet_stoupacek = parseInt(document.getElementById('voda_pocet_stoupacek')?.value) || 0;

  if (pocet_osob <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte pocet osob pro zobrazeni analyzy.</p>';
    return;
  }

  // === STAVAJICI STAV ===
  const celkem_osob = pocet_osob + pocet_navstevniku;
  const studena_rok_m3 = celkem_osob * studenaDenL * 365 / 1000;
  const tepla_rok_m3 = celkem_osob * teplaDenL * 365 / 1000;
  const celkem_voda_m3 = studena_rok_m3 + tepla_rok_m3;

  // Naklady za vodu
  const naklad_vodne = Math.round(celkem_voda_m3 * cena_vody);
  const naklad_stocne = Math.round(celkem_voda_m3 * cena_stocne);

  // Naklady za ohrev teple vody
  const teplo_ohrev_kwh = tepla_rok_m3 * VODA_DATA.teplo_ohrev_kwh_m3;
  const cena_ohrev = zdroj_ohrevu === 'plyn' ? VODA_DATA.cena_ohrev_plyn_kwh : VODA_DATA.cena_ohrev_kwh;
  const naklad_ohrev = Math.round(teplo_ohrev_kwh * cena_ohrev);

  const stavajici_celkem = naklad_vodne + naklad_stocne + naklad_ohrev;

  // === BUDOUCI STAV ===
  let uspora_vody_procent = 0;
  let investice = 0;

  // Usporne prvky
  if (chce_sprchy && pocet_sprch > 0) {
    uspora_vody_procent += VODA_DATA.usporne_prvky.sprchy.uspora_procent * 0.4; // sprchy = cast spotreby
    investice += pocet_sprch * VODA_DATA.usporne_prvky.sprchy.cena_ks;
  }
  if (chce_perlatory && pocet_baterif > 0) {
    uspora_vody_procent += VODA_DATA.usporne_prvky.perlatory.uspora_procent * 0.2;
    investice += pocet_baterif * VODA_DATA.usporne_prvky.perlatory.cena_ks;
  }
  if (chce_wc && pocet_wc_ks > 0) {
    uspora_vody_procent += VODA_DATA.usporne_prvky.wc.uspora_procent * 0.2;
    investice += pocet_wc_ks * VODA_DATA.usporne_prvky.wc.cena_ks;
  }
  if (chce_stoupacky && pocet_stoupacek > 0) {
    uspora_vody_procent += VODA_DATA.usporne_prvky.stoupacky.uspora_procent;
    investice += pocet_stoupacek * VODA_DATA.usporne_prvky.stoupacky.cena_ks;
  }

  // Recyklace odpadni vody
  const recyklace = VODA_DATA.recyklace[typ_recyklace];
  uspora_vody_procent += recyklace.procent_uspory;
  investice += recyklace.cena;

  // Omezeni uspory na max 60%
  uspora_vody_procent = Math.min(uspora_vody_procent, 0.60);

  const budouci_voda_m3 = celkem_voda_m3 * (1 - uspora_vody_procent);
  const uspora_vodne = Math.round((celkem_voda_m3 - budouci_voda_m3) * cena_vody);
  const uspora_stocne = Math.round((celkem_voda_m3 - budouci_voda_m3) * cena_stocne);

  // Rekuperace tepla z odpadni vody
  const rekuperace = VODA_DATA.rekuperace[typ_rekuperace];
  const uspora_ohrev_kwh = teplo_ohrev_kwh * rekuperace.ucinnost;
  const uspora_ohrev_kc = Math.round(uspora_ohrev_kwh * cena_ohrev);
  investice += rekuperace.cena_jednotka;

  const budouci_celkem = stavajici_celkem - uspora_vodne - uspora_stocne - uspora_ohrev_kc;
  const uspora_celkem = stavajici_celkem - budouci_celkem;
  const navratnost = uspora_celkem > 0 ? (investice / uspora_celkem).toFixed(1) : '---';

  // Uloz do stavu
  OEES_STATE.case.voda = {
    stavajici_celkem, budouci_celkem, uspora_celkem,
    investice, navratnost,
    uspora_vodne, uspora_stocne, uspora_ohrev_kc,
    rekuperace_typ: typ_rekuperace, recyklace_typ: typ_recyklace
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Analyza uspor vody</h3>

      <table class="breakdown-table">
        <thead><tr><th>Polozka</th><th>Stavajici</th><th>Budouci</th></tr></thead>
        <tbody>
          <tr><td>Spotreba vody</td>
              <td>${celkem_voda_m3.toFixed(0)} m3/rok</td>
              <td>${budouci_voda_m3.toFixed(0)} m3/rok</td></tr>
          <tr><td>Vodne</td>
              <td>${naklad_vodne.toLocaleString('cs-CZ')} Kc</td>
              <td>${(naklad_vodne - uspora_vodne).toLocaleString('cs-CZ')} Kc</td></tr>
          <tr><td>Stocne</td>
              <td>${naklad_stocne.toLocaleString('cs-CZ')} Kc</td>
              <td>${(naklad_stocne - uspora_stocne).toLocaleString('cs-CZ')} Kc</td></tr>
          <tr><td>Ohrev teple vody</td>
              <td>${naklad_ohrev.toLocaleString('cs-CZ')} Kc</td>
              <td>${(naklad_ohrev - uspora_ohrev_kc).toLocaleString('cs-CZ')} Kc</td></tr>
          ${uspora_ohrev_kc > 0 ? `<tr><td>&nbsp;&nbsp;z toho rekuperace tepla</td><td>—</td>
              <td class="text-success">-${uspora_ohrev_kc.toLocaleString('cs-CZ')} Kc</td></tr>` : ''}
          <tr class="total-row">
            <td><strong>Celkem rocne</strong></td>
            <td><strong>${stavajici_celkem.toLocaleString('cs-CZ')} Kc</strong></td>
            <td><strong>${budouci_celkem.toLocaleString('cs-CZ')} Kc</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="results-grid" style="margin-top:16px">
        <div class="result-box highlight">
          <div class="val">${uspora_celkem.toLocaleString('cs-CZ')} Kc</div>
          <div class="lbl">Rocni uspora</div>
        </div>
        <div class="result-box">
          <div class="val">${investice.toLocaleString('cs-CZ')} Kc</div>
          <div class="lbl">Investice</div>
        </div>
        <div class="result-box">
          <div class="val">${navratnost} let</div>
          <div class="lbl">Navratnost</div>
        </div>
        <div class="result-box">
          <div class="val">${Math.round(uspora_ohrev_kwh)} kWh</div>
          <div class="lbl">Uspora tepla (rekuperace)</div>
        </div>
      </div>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulVoda(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rekuperaceOptions = Object.entries(VODA_DATA.rekuperace).map(([key, r]) =>
    `<option value="${key}">${r.nazev} ${r.ucinnost > 0 ? '(ucinnost ' + (r.ucinnost * 100) + '%)' : ''}</option>`
  ).join('');

  const recyklaceOptions = Object.entries(VODA_DATA.recyklace).map(([key, r]) =>
    `<option value="${key}">${r.nazev} ${r.procent_uspory > 0 ? '(uspora ' + (r.procent_uspory * 100) + '% vody)' : ''}</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128167;</span> Voda – analyza spotreby a uspor
      </div>

      <div class="state-grid">
        <!-- STAVAJICI -->
        <div class="state-panel stavajici">
          <h3>Stavajici spotreba</h3>

          <div class="field">
            <label>Pocet obyvatel / zamestnancu</label>
            <input type="number" id="voda_pocet_osob" placeholder="100" min="0" oninput="vypocetVoda()">
          </div>

          <div class="field">
            <label>Pocet navstevniku <span class="unit">osoby/den</span></label>
            <input type="number" id="voda_navstevniku" value="0" min="0" oninput="vypocetVoda()">
          </div>

          <div class="field">
            <label>Spotreba studene vody <span class="unit">l/osoba/den</span></label>
            <input type="number" id="voda_studena_den" value="${VODA_DATA.spotreba_studena_l_osoba_den}" min="0" oninput="vypocetVoda()">
          </div>

          <div class="field">
            <label>Spotreba teple vody <span class="unit">l/osoba/den</span></label>
            <input type="number" id="voda_tepla_den" value="${VODA_DATA.spotreba_tepla_l_osoba_den}" min="0" oninput="vypocetVoda()">
          </div>

          <div class="field">
            <label>Zdroj ohrevu vody</label>
            <select id="voda_zdroj_ohrevu" onchange="vypocetVoda()">
              <option value="elektro">Elektricky (${VODA_DATA.cena_ohrev_kwh} Kc/kWh)</option>
              <option value="plyn">Plynovy (${VODA_DATA.cena_ohrev_plyn_kwh} Kc/kWh)</option>
            </select>
          </div>

          <div class="field">
            <label>Cena vodneho <span class="unit">Kc/m3</span></label>
            <input type="number" id="voda_cena_m3" value="${VODA_DATA.cena_studena_m3}" min="0" step="1" oninput="vypocetVoda()">
          </div>

          <div class="field">
            <label>Cena stocneho <span class="unit">Kc/m3</span></label>
            <input type="number" id="voda_stocne_m3" value="${VODA_DATA.cena_stocne_m3}" min="0" step="1" oninput="vypocetVoda()">
          </div>
        </div>

        <!-- USPORNA OPATRENI -->
        <div class="state-panel budouci">
          <h3>Usporna opatreni</h3>

          <div class="field">
            <label>Rekuperace tepla z odpadni vody</label>
            <select id="voda_rekuperace" onchange="vypocetVoda()">
              ${rekuperaceOptions}
            </select>
            <small class="text-muted">Ziskavani tepla z odpadni vody pro predohrev studene</small>
          </div>

          <div class="field">
            <label>Recyklace odpadni vody</label>
            <select id="voda_recyklace" onchange="vypocetVoda()">
              ${recyklaceOptions}
            </select>
            <small class="text-muted">Seda/destova voda pro WC splachovani, zalevani</small>
          </div>

          <div class="card-subtitle">Usporne prvky</div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_sprchy" onchange="vypocetVoda()">
              Usporne sprchove hlavice
            </label>
            <div class="form-grid-2" style="margin-top:6px">
              <input type="number" id="voda_pocet_sprch" placeholder="Pocet ks" min="0" oninput="vypocetVoda()">
            </div>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_perlatory" onchange="vypocetVoda()">
              Perlatory na baterie
            </label>
            <div class="form-grid-2" style="margin-top:6px">
              <input type="number" id="voda_pocet_baterif" placeholder="Pocet ks" min="0" oninput="vypocetVoda()">
            </div>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_wc" onchange="vypocetVoda()">
              Dvojtlacitko WC
            </label>
            <div class="form-grid-2" style="margin-top:6px">
              <input type="number" id="voda_pocet_wc" placeholder="Pocet ks" min="0" oninput="vypocetVoda()">
            </div>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_stoupacky" onchange="vypocetVoda()">
              Vymena stoupacek
            </label>
            <div class="form-grid-2" style="margin-top:6px">
              <input type="number" id="voda_pocet_stoupacek" placeholder="Pocet stoupacek" min="0" oninput="vypocetVoda()">
            </div>
          </div>
        </div>
      </div>

      <div id="voda_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte pocet osob pro zobrazeni analyzy.</p>
      </div>
    </div>`;
}
