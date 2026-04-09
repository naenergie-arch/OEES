/**
 * OEES Modul: Teplarna (CZT – centralni zasobovani teplem)
 * Stavajici naklady na CZT, srovnani s vlastnimi zdroji
 */

'use strict';

// ─── Data CZT ──────────────────────────────────────────────────────────────

const CZT_DATA = {
  // Typicke ceny CZT v CR (Kc/MWh) – orientacni rozsah
  cena_prumer_mwh: 1800,
  cena_min_mwh: 1200,
  cena_max_mwh: 2800,

  // Pausalove slozky (Kc/rok za pripojeny vykon kW)
  pausal_kw_rok: 3500, // typicky fixni poplatek

  // Srovnavaci zdroje a jejich naklady na vyrobu tepla (Kc/MWh tepla)
  srovnani: {
    'tc_vzduch':  { nazev: 'Tepelne cerpadlo (vzduch/voda)', cena_mwh_tepla: 780 },
    'tc_zeme':    { nazev: 'Tepelne cerpadlo (zeme/voda)',   cena_mwh_tepla: 625 },
    'kotel_kond': { nazev: 'Plynovy kondenzacni kotel',      cena_mwh_tepla: 1390 },
    'kotel_stary':{ nazev: 'Plynovy kotel (stary)',          cena_mwh_tepla: 1590 },
    'kgj':        { nazev: 'Kogeneracni jednotka',           cena_mwh_tepla: 900 }
  }
};

// ─── Vypocet ────────────────────────────────────────────────────────────────

function vypocetTeplarna() {
  const container = document.getElementById('teplarna_vysledky');
  if (!container) return;

  const spotreba_mwh = parseFloat(document.getElementById('czt_spotreba_mwh')?.value) || 0;
  const cena_mwh = parseFloat(document.getElementById('czt_cena_mwh')?.value) || 0;
  const pripojeny_vykon = parseFloat(document.getElementById('czt_vykon_kw')?.value) || 0;
  const pausal_kw = parseFloat(document.getElementById('czt_pausal_kw')?.value) || CZT_DATA.pausal_kw_rok;
  const srovnani_typ = document.getElementById('czt_srovnani')?.value || 'tc_vzduch';

  // Prevezmi z tepelne bilance pokud je aktivni
  const bilance = OEES_STATE.case.teplo;
  if (bilance && bilance.mwh_czt > 0) {
    const el = document.getElementById('czt_spotreba_mwh');
    if (el && parseFloat(el.value) !== bilance.mwh_czt) el.value = bilance.mwh_czt;
  }

  const spotreba = parseFloat(document.getElementById('czt_spotreba_mwh')?.value) || 0;

  if (spotreba <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte rocni spotrebu tepla z CZT.</p>';
    return;
  }

  // Stavajici naklady CZT
  const naklad_variabilni = Math.round(spotreba * cena_mwh);
  const naklad_fixni = Math.round(pripojeny_vykon * pausal_kw);
  const naklad_czt_celkem = naklad_variabilni + naklad_fixni;

  // Srovnani s alternativou
  const alt = CZT_DATA.srovnani[srovnani_typ];
  const naklad_alt = Math.round(spotreba * alt.cena_mwh_tepla);
  const uspora = naklad_czt_celkem - naklad_alt;

  // Uloz do OEES_STATE
  OEES_STATE.case.teplarna = {
    spotreba_mwh: spotreba, cena_mwh, pripojeny_vykon,
    naklad_czt_celkem, naklad_variabilni, naklad_fixni,
    srovnani_typ, naklad_alt, uspora
  };

  const usporaClass = uspora > 0 ? 'text-success' : 'text-danger';
  const usporaText = uspora > 0
    ? `Vlastni zdroj je levnejsi o ${uspora.toLocaleString('cs-CZ')} Kc/rok`
    : `CZT je levnejsi o ${Math.abs(uspora).toLocaleString('cs-CZ')} Kc/rok`;

  container.innerHTML = `
    <div class="results-panel">
      <h3>Naklady CZT (stavajici stav)</h3>
      <table class="breakdown-table">
        <thead><tr><th>Polozka</th><th>Kc/rok</th></tr></thead>
        <tbody>
          <tr><td>Variabilni (${spotreba.toFixed(1)} MWh x ${cena_mwh.toLocaleString('cs-CZ')} Kc/MWh)</td>
            <td>${naklad_variabilni.toLocaleString('cs-CZ')}</td></tr>
          ${naklad_fixni > 0 ? `<tr><td>Fixni (${pripojeny_vykon} kW x ${pausal_kw.toLocaleString('cs-CZ')} Kc/kW/rok)</td>
            <td>${naklad_fixni.toLocaleString('cs-CZ')}</td></tr>` : ''}
          <tr class="total-row"><td><strong>Celkem CZT</strong></td>
            <td><strong>${naklad_czt_celkem.toLocaleString('cs-CZ')} Kc/rok</strong></td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:16px">Srovnani: CZT vs ${alt.nazev}</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Naklady CZT</td><td>${naklad_czt_celkem.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr><td>Naklady ${alt.nazev} (${alt.cena_mwh_tepla} Kc/MWh)</td><td>${naklad_alt.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr class="total-row"><td><strong>Rozdil</strong></td>
            <td class="${usporaClass}"><strong>${uspora > 0 ? '+' : ''}${uspora.toLocaleString('cs-CZ')} Kc/rok</strong></td></tr>
        </tbody>
      </table>
      <p class="${usporaClass}" style="margin-top:8px"><strong>${usporaText}</strong></p>
    </div>`;
}

// ─── Inicializace modulu ───────────────────────────────────────────────────

function inicializujModulTeplarna(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const srovnaniOptions = Object.entries(CZT_DATA.srovnani).map(([key, s]) =>
    `<option value="${key}">${s.nazev} (${s.cena_mwh_tepla} Kc/MWh)</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#127981;</span> Teplarna (CZT) – naklady a srovnani
      </div>

      <div class="state-grid">
        <!-- STAVAJICI CZT -->
        <div class="state-panel stavajici">
          <h3>Stavajici pripojeni na CZT</h3>

          <div class="field">
            <label>Rocni spotreba tepla z CZT <span class="unit">MWh</span></label>
            <input type="number" id="czt_spotreba_mwh" placeholder="napr. 150" min="0" step="1" oninput="vypocetTeplarna()">
            <small class="text-muted">Prebirano z Tepelne bilance (pokud je aktivni)</small>
          </div>

          <div class="field">
            <label>Cena tepla z CZT <span class="unit">Kc/MWh</span></label>
            <input type="number" id="czt_cena_mwh" value="${CZT_DATA.cena_prumer_mwh}" min="0" step="50" oninput="vypocetTeplarna()">
            <small class="text-muted">Rozsah v CR: ${CZT_DATA.cena_min_mwh}–${CZT_DATA.cena_max_mwh} Kc/MWh</small>
          </div>

          <div class="field">
            <label>Pripojeny vykon <span class="unit">kW</span></label>
            <input type="number" id="czt_vykon_kw" placeholder="napr. 80" min="0" step="1" oninput="vypocetTeplarna()">
            <small class="text-muted">Urcuje fixni poplatek (pausal)</small>
          </div>

          <div class="field">
            <label>Fixni poplatek <span class="unit">Kc/kW/rok</span></label>
            <input type="number" id="czt_pausal_kw" value="${CZT_DATA.pausal_kw_rok}" min="0" step="100" oninput="vypocetTeplarna()">
            <small class="text-muted">Rocni pausal za pripojeny vykon</small>
          </div>
        </div>

        <!-- SROVNANI -->
        <div class="state-panel budouci">
          <h3>Srovnani s alternativou</h3>

          <div class="field">
            <label>Srovnat CZT s</label>
            <select id="czt_srovnani" onchange="vypocetTeplarna()">
              ${srovnaniOptions}
            </select>
          </div>

          <div style="padding:12px;background:var(--bg-light);border-radius:var(--radius-sm);margin-top:12px">
            <small class="text-muted">
              Ceny alternativnich zdroju jsou orientacni a zahrnuji provozni naklady
              (palivo/elektrina). Investicni naklady na porizeni vlastniho zdroje
              se zobrazi v prislusnem modulu (TC, KGJ, Kotel).
            </small>
          </div>
        </div>
      </div>

      <div id="teplarna_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte rocni spotrebu tepla z CZT.</p>
      </div>
    </div>`;
}
