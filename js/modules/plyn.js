/**
 * OEES Modul: Plyn
 * Stavajici vs budouci naklady na plyn, porovnani dodavatelu
 */

'use strict';

// ─── Cenova data plynu 2026 ─────────────────────────────────────────────────
const PLYN_DATA = {
  // Prumerne ceny dodavky plynu (Kc/MWh) - orientacni
  dodavatele: {
    'innogy':       { nazev: 'innogy Energie',   cena_mwh: 1350 },
    'cez':          { nazev: 'CEZ',              cena_mwh: 1380 },
    'pre':          { nazev: 'Prazska plynarenska', cena_mwh: 1410 },
    'epet':         { nazev: 'E.ON / EP Energy', cena_mwh: 1320 },
    'bohemia':      { nazev: 'Bohemia Energy',   cena_mwh: 1290 },
    'vlastni':      { nazev: 'Vlastni cena',     cena_mwh: 0 }
  },

  // Distribucni sazby (Kc/MWh) - prumer 2026
  distribuce: {
    'do_1890':   { popis: 'Do 1,89 MWh/rok (vaření)',        cena_mwh: 2850 },
    'do_7560':   { popis: 'Do 7,56 MWh/rok (vaření+ohřev)',  cena_mwh: 1180 },
    'do_15000':  { popis: 'Do 15 MWh/rok (vytápění malé)',    cena_mwh: 780 },
    'do_25000':  { popis: 'Do 25 MWh/rok (vytápění střední)', cena_mwh: 650 },
    'do_45000':  { popis: 'Do 45 MWh/rok (vytápění velké)',   cena_mwh: 580 },
    'do_63000':  { popis: 'Do 63 MWh/rok (průmysl malý)',     cena_mwh: 520 },
    'nad_63000': { popis: 'Nad 63 MWh/rok (průmysl velký)',   cena_mwh: 460 }
  },

  // Dan z plynu
  dan_kc_mwh: 30.60,

  // Mesicni plat za pristroj (prumer)
  mesicni_plat: 130,

  // Spalne teplo zemniho plynu
  spalne_teplo_kwh_m3: 10.55
};

// ─── Vypocet rocnich nakladu ─────────────────────────────────────────────────

function vypocetNakladuPlyn(spotreba_mwh, dodavatel_key, vlastni_cena, distrib_key) {
  const dodavatel = PLYN_DATA.dodavatele[dodavatel_key];
  const distribuce = PLYN_DATA.distribuce[distrib_key];

  const cena_dodavka = dodavatel_key === 'vlastni' ? vlastni_cena : dodavatel.cena_mwh;
  const cena_distribuce = distribuce ? distribuce.cena_mwh : 780;

  const naklad_dodavka = spotreba_mwh * cena_dodavka;
  const naklad_distribuce = spotreba_mwh * cena_distribuce;
  const naklad_dan = spotreba_mwh * PLYN_DATA.dan_kc_mwh;
  const naklad_mesicni = PLYN_DATA.mesicni_plat * 12;
  const meziSoucet = naklad_dodavka + naklad_distribuce + naklad_dan + naklad_mesicni;
  const dph = meziSoucet * 0.21;

  return {
    spotreba_mwh,
    cena_dodavka,
    cena_distribuce,
    naklad_dodavka: Math.round(naklad_dodavka),
    naklad_distribuce: Math.round(naklad_distribuce),
    naklad_dan: Math.round(naklad_dan),
    naklad_mesicni: Math.round(naklad_mesicni),
    bez_dph: Math.round(meziSoucet),
    dph: Math.round(dph),
    celkem: Math.round(meziSoucet + dph),
    prumer_kc_mwh: spotreba_mwh > 0 ? Math.round((meziSoucet + dph) / spotreba_mwh) : 0
  };
}

// ─── Porovnani stavajiciho a budouciho stavu ────────────────────────────────

function porovnejPlyn() {
  const container = document.getElementById('plyn_vysledky');
  if (!container) return;

  // Stavajici
  const s_spotreba = parseFloat(document.getElementById('plyn_s_spotreba')?.value) || 0;
  const s_dodavatel = document.getElementById('plyn_s_dodavatel')?.value || 'innogy';
  const s_vlastni = parseFloat(document.getElementById('plyn_s_vlastni_cena')?.value) || 0;
  const s_distrib = document.getElementById('plyn_s_distribuce')?.value || 'do_15000';

  // Budouci
  const b_spotreba = parseFloat(document.getElementById('plyn_b_spotreba')?.value) || s_spotreba;
  const b_dodavatel = document.getElementById('plyn_b_dodavatel')?.value || s_dodavatel;
  const b_vlastni = parseFloat(document.getElementById('plyn_b_vlastni_cena')?.value) || 0;
  const b_distrib = document.getElementById('plyn_b_distribuce')?.value || s_distrib;

  if (s_spotreba <= 0) {
    container.innerHTML = '<p class="text-muted">Vyplnte spotrebu plynu pro zobrazeni vysledku.</p>';
    return;
  }

  const stavajici = vypocetNakladuPlyn(s_spotreba, s_dodavatel, s_vlastni, s_distrib);
  const budouci = vypocetNakladuPlyn(b_spotreba, b_dodavatel, b_vlastni, b_distrib);
  const uspora = stavajici.celkem - budouci.celkem;
  const usporaProcent = stavajici.celkem > 0 ? ((uspora / stavajici.celkem) * 100).toFixed(1) : 0;

  // Uloz do stavu
  OEES_STATE.case.plyn = { stavajici, budouci, uspora, usporaProcent };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Porovnani nakladu na plyn</h3>
      <table class="breakdown-table">
        <thead>
          <tr><th>Polozka</th><th>Stavajici</th><th>Budouci</th><th>Rozdil</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Spotreba</td>
            <td>${stavajici.spotreba_mwh} MWh</td>
            <td>${budouci.spotreba_mwh} MWh</td>
            <td>${(budouci.spotreba_mwh - stavajici.spotreba_mwh).toFixed(1)} MWh</td>
          </tr>
          <tr>
            <td>Dodavka</td>
            <td>${stavajici.naklad_dodavka.toLocaleString('cs-CZ')} Kc</td>
            <td>${budouci.naklad_dodavka.toLocaleString('cs-CZ')} Kc</td>
            <td>${(budouci.naklad_dodavka - stavajici.naklad_dodavka).toLocaleString('cs-CZ')} Kc</td>
          </tr>
          <tr>
            <td>Distribuce</td>
            <td>${stavajici.naklad_distribuce.toLocaleString('cs-CZ')} Kc</td>
            <td>${budouci.naklad_distribuce.toLocaleString('cs-CZ')} Kc</td>
            <td>${(budouci.naklad_distribuce - stavajici.naklad_distribuce).toLocaleString('cs-CZ')} Kc</td>
          </tr>
          <tr>
            <td>Dan + mesicni plat</td>
            <td>${(stavajici.naklad_dan + stavajici.naklad_mesicni).toLocaleString('cs-CZ')} Kc</td>
            <td>${(budouci.naklad_dan + budouci.naklad_mesicni).toLocaleString('cs-CZ')} Kc</td>
            <td>–</td>
          </tr>
          <tr class="total-row">
            <td><strong>Celkem s DPH</strong></td>
            <td><strong>${stavajici.celkem.toLocaleString('cs-CZ')} Kc</strong></td>
            <td><strong>${budouci.celkem.toLocaleString('cs-CZ')} Kc</strong></td>
            <td class="${uspora > 0 ? 'text-success' : 'text-danger'}">
              <strong>${uspora > 0 ? '-' : '+'}${Math.abs(uspora).toLocaleString('cs-CZ')} Kc</strong>
            </td>
          </tr>
          <tr>
            <td>Prumer</td>
            <td>${stavajici.prumer_kc_mwh.toLocaleString('cs-CZ')} Kc/MWh</td>
            <td>${budouci.prumer_kc_mwh.toLocaleString('cs-CZ')} Kc/MWh</td>
            <td>${usporaProcent} %</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

// ─── Generovani selectu dodavatelu ──────────────────────────────────────────

function plynDodavatelOptions() {
  return Object.entries(PLYN_DATA.dodavatele).map(([key, d]) =>
    `<option value="${key}">${d.nazev}${d.cena_mwh > 0 ? ' (~' + d.cena_mwh + ' Kc/MWh)' : ''}</option>`
  ).join('');
}

function plynDistribuceOptions() {
  return Object.entries(PLYN_DATA.distribuce).map(([key, d]) =>
    `<option value="${key}">${d.popis} (${d.cena_mwh} Kc/MWh)</option>`
  ).join('');
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulPlyn(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128293;</span> Naklady na plyn – stavajici vs budouci stav
      </div>

      <div class="state-grid">
        <!-- STAVAJICI -->
        <div class="state-panel stavajici">
          <h3>Stavajici stav</h3>

          <div class="field">
            <label>Plynovy distributor</label>
            <select id="plyn_s_distributor" onchange="porovnejPlyn()">
              <option value="PPD">Prazska plynarenska distribuce (PPD)</option>
              <option value="GasNet" selected>GasNet (innogy Grid Holding)</option>
              <option value="EGD_plyn">EG.D (E.ON Distribuce)</option>
            </select>
          </div>

          <div class="field">
            <label>Rocni spotreba plynu <span class="unit">MWh</span></label>
            <input type="number" id="plyn_s_spotreba" placeholder="25" min="0" step="0.1" oninput="porovnejPlyn()">
            <small class="text-muted">Najdete na rocnim vyuctovani</small>
          </div>

          <div class="field">
            <label>Dodavatel</label>
            <select id="plyn_s_dodavatel" onchange="document.getElementById('plyn_s_vlastni_wrap').style.display = this.value === 'vlastni' ? 'block' : 'none'; porovnejPlyn();">
              ${plynDodavatelOptions()}
            </select>
          </div>

          <div class="field" id="plyn_s_vlastni_wrap" style="display:none">
            <label>Vlastni cena dodavky <span class="unit">Kc/MWh</span></label>
            <input type="number" id="plyn_s_vlastni_cena" placeholder="1350" oninput="porovnejPlyn()">
          </div>

          <div class="field">
            <label>Distribucni pasmo</label>
            <select id="plyn_s_distribuce" onchange="porovnejPlyn()">
              ${plynDistribuceOptions()}
            </select>
          </div>
        </div>

        <!-- BUDOUCI -->
        <div class="state-panel budouci">
          <h3>Budouci stav</h3>

          <div class="field">
            <label>Rocni spotreba plynu <span class="unit">MWh</span></label>
            <input type="number" id="plyn_b_spotreba" placeholder="Stejna jako stavajici" min="0" step="0.1" oninput="porovnejPlyn()">
            <small class="text-muted">Nechte prazdne = stejna</small>
          </div>

          <div class="field">
            <label>Dodavatel</label>
            <select id="plyn_b_dodavatel" onchange="document.getElementById('plyn_b_vlastni_wrap').style.display = this.value === 'vlastni' ? 'block' : 'none'; porovnejPlyn();">
              ${plynDodavatelOptions()}
            </select>
          </div>

          <div class="field" id="plyn_b_vlastni_wrap" style="display:none">
            <label>Vlastni cena dodavky <span class="unit">Kc/MWh</span></label>
            <input type="number" id="plyn_b_vlastni_cena" placeholder="1350" oninput="porovnejPlyn()">
          </div>

          <div class="field">
            <label>Distribucni pasmo</label>
            <select id="plyn_b_distribuce" onchange="porovnejPlyn()">
              ${plynDistribuceOptions()}
            </select>
          </div>
        </div>
      </div>

      <div id="plyn_vysledky" style="margin-top:20px">
        <p class="text-muted">Vyplnte spotrebu pro zobrazeni porovnani.</p>
      </div>
    </div>`;
}
