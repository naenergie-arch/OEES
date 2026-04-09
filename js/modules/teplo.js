/**
 * OEES Modul: Tepelna bilance
 * Centralni model potreby tepla (vytapeni + TUV)
 * Rozdeleni zdroju tepla: TC, KGJ, Kotel, Teplarna (CZT)
 */

'use strict';

// ─── Vypocet tepelne bilance ───────────────────────────────────────────────

function vypocetTeplo() {
  const container = document.getElementById('teplo_vysledky');
  if (!container) return;

  // Vstupy
  const ztrata_kw = parseFloat(document.getElementById('teplo_ztrata')?.value) || 0;
  const rucni_mwh = parseFloat(document.getElementById('teplo_rucni_mwh')?.value) || 0;
  const otopne_hod = parseFloat(document.getElementById('teplo_otopne_hod')?.value) || 2200;
  const tuv_mwh = parseFloat(document.getElementById('teplo_tuv_mwh')?.value) || 0;
  const ztraty_pct = parseFloat(document.getElementById('teplo_ztraty_pct')?.value) || 0;

  // Zdroje tepla (MWh/rok)
  const mwh_tc = parseFloat(document.getElementById('teplo_mwh_tc')?.value) || 0;
  const mwh_kgj = parseFloat(document.getElementById('teplo_mwh_kgj')?.value) || 0;
  const mwh_kotel = parseFloat(document.getElementById('teplo_mwh_kotel')?.value) || 0;
  const mwh_czt = parseFloat(document.getElementById('teplo_mwh_czt')?.value) || 0;

  // Potreba tepla
  const vytapeni_mwh = rucni_mwh > 0 ? rucni_mwh : (ztrata_kw * otopne_hod / 1000);
  const potreba_cista = vytapeni_mwh + tuv_mwh;
  const ztraty_mwh = potreba_cista * ztraty_pct / 100;
  const celkem_mwh = potreba_cista + ztraty_mwh;

  if (potreba_cista <= 0) {
    container.innerHTML = '<p class="text-muted">Vyplnte tepelnou ztratu nebo rocni potrebu tepla.</p>';
    return;
  }

  const soucet_zdroju = mwh_tc + mwh_kgj + mwh_kotel + mwh_czt;
  const rozdil = soucet_zdroju - celkem_mwh;
  const rozdil_pct = celkem_mwh > 0 ? (rozdil / celkem_mwh * 100) : 0;

  // Uloz do OEES_STATE
  OEES_STATE.case.teplo = {
    ztrata_kw, vytapeni_mwh, tuv_mwh, ztraty_pct, ztraty_mwh,
    potreba_cista, celkem_mwh, otopne_hod,
    mwh_tc, mwh_kgj, mwh_kotel, mwh_czt,
    soucet_zdroju, rozdil, rozdil_pct
  };

  // Bilance – 3 stavy
  let bilanClass, bilanIcon, bilanMsg;
  if (Math.abs(rozdil_pct) <= 5) {
    bilanClass = 'text-success';
    bilanIcon = '&#9989;';
    bilanMsg = `Vyrovnana bilance (${rozdil >= 0 ? '+' : ''}${rozdil.toFixed(1)} MWh, ${rozdil_pct >= 0 ? '+' : ''}${rozdil_pct.toFixed(1)} %)`;
  } else if (rozdil_pct > 5) {
    bilanClass = 'text-warning';
    bilanIcon = '&#9888;&#65039;';
    bilanMsg = `Naddimenzovano: +${rozdil.toFixed(1)} MWh (+${rozdil_pct.toFixed(1)} % rezerva)`;
  } else {
    bilanClass = 'text-danger';
    bilanIcon = '&#10060;';
    bilanMsg = `Poddimenzovano: ${rozdil.toFixed(1)} MWh (${rozdil_pct.toFixed(1)} %) – zdroje nepokryji celou potrebu`;
  }

  container.innerHTML = `
    <div class="results-panel">
      <h3>Tepelna bilance objektu</h3>
      <table class="breakdown-table">
        <thead><tr><th>Slozka</th><th>MWh/rok</th></tr></thead>
        <tbody>
          <tr><td>Vytapeni</td><td>${vytapeni_mwh.toFixed(1)}</td></tr>
          <tr><td>Priprava TUV</td><td>${tuv_mwh.toFixed(1)}</td></tr>
          ${ztraty_mwh > 0 ? `<tr><td>Ztraty rozvodu (${ztraty_pct} %)</td><td>${ztraty_mwh.toFixed(1)}</td></tr>` : ''}
          <tr class="total-row"><td><strong>Celkova potreba vcetne ztrat</strong></td>
            <td><strong>${celkem_mwh.toFixed(1)} MWh/rok</strong></td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:16px">Rozdeleni na zdroje (budouci stav)</h3>
      <table class="breakdown-table">
        <thead><tr><th>Zdroj</th><th>MWh/rok</th></tr></thead>
        <tbody>
          ${mwh_tc > 0 ? `<tr><td>Tepelne cerpadlo</td><td>${mwh_tc.toFixed(1)}</td></tr>` : ''}
          ${mwh_kgj > 0 ? `<tr><td>Kogeneracni jednotka</td><td>${mwh_kgj.toFixed(1)}</td></tr>` : ''}
          ${mwh_kotel > 0 ? `<tr><td>Plynovy kotel</td><td>${mwh_kotel.toFixed(1)}</td></tr>` : ''}
          ${mwh_czt > 0 ? `<tr><td>Teplarna (CZT)</td><td>${mwh_czt.toFixed(1)}</td></tr>` : ''}
          <tr class="total-row"><td><strong>Soucet zdroju</strong></td><td><strong>${soucet_zdroju.toFixed(1)} MWh</strong></td></tr>
        </tbody>
      </table>

      <div style="margin-top:12px;padding:12px;border-radius:var(--radius-sm);border:2px solid;${Math.abs(rozdil_pct) <= 5 ? 'border-color:#4caf50;background:#e8f5e9' : rozdil_pct > 5 ? 'border-color:#ff9800;background:#fff3e0' : 'border-color:#f44336;background:#ffebee'}">
        <strong>${bilanIcon} Bilance:</strong> ${bilanMsg}
      </div>
    </div>`;
}

// ─── Pomocna funkce: aktualizace podilu pri zmene ──────────────────────────

function aktualizujSoucetZdroju() {
  const tc = parseFloat(document.getElementById('teplo_mwh_tc')?.value) || 0;
  const kgj = parseFloat(document.getElementById('teplo_mwh_kgj')?.value) || 0;
  const kotel = parseFloat(document.getElementById('teplo_mwh_kotel')?.value) || 0;
  const czt = parseFloat(document.getElementById('teplo_mwh_czt')?.value) || 0;
  const el = document.getElementById('teplo_soucet_zdroju');
  if (el) {
    const s = tc + kgj + kotel + czt;
    el.textContent = s.toFixed(1) + ' MWh';
  }
  vypocetTeplo();
}

// ─── Inicializace modulu ───────────────────────────────────────────────────

function inicializujModulTeplo(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128293;</span> Tepelna bilance – potreba tepla a rozdeleni zdroju
      </div>

      <div class="state-grid">
        <!-- POTREBA TEPLA -->
        <div class="state-panel stavajici">
          <h3>Potreba tepla</h3>

          <div class="field">
            <label>Tepelna ztrata objektu <span class="unit">kW</span></label>
            <input type="number" id="teplo_ztrata" placeholder="napr. 80" min="0" step="1" oninput="vypocetTeplo()">
            <small class="text-muted">Z energetickeho auditu nebo prukazu</small>
          </div>

          <div class="field">
            <label>Rocni potreba tepla (rucne) <span class="unit">MWh</span></label>
            <input type="number" id="teplo_rucni_mwh" placeholder="napr. 180" min="0" step="1" oninput="vypocetTeplo()">
            <small class="text-muted">Pokud znate, ma prednost pred vypoctem ze ztraty</small>
          </div>

          <div class="field">
            <label>Otopne hodiny <span class="unit">hod/rok</span></label>
            <input type="number" id="teplo_otopne_hod" value="2200" min="1000" max="3500" step="100" oninput="vypocetTeplo()">
            <small class="text-muted">Typicky 1800-2600 pro CR</small>
          </div>

          <div class="field">
            <label>Priprava TUV <span class="unit">MWh/rok</span></label>
            <input type="number" id="teplo_tuv_mwh" placeholder="napr. 15" min="0" step="0.5" oninput="vypocetTeplo()">
            <small class="text-muted">Prebirano z modulu Voda (pokud je aktivni)</small>
          </div>

          <div class="field">
            <label>Ztraty rozvodu tepla <span class="unit">%</span></label>
            <input type="number" id="teplo_ztraty_pct" value="10" min="0" max="30" step="1" oninput="vypocetTeplo()">
            <small class="text-muted">Typicky 5–15 %. Ztrata v rozvodech, predavacich stanicich apod.</small>
          </div>
        </div>

        <!-- ROZDELENI ZDROJU -->
        <div class="state-panel budouci">
          <h3>Rozdeleni zdroju tepla (budouci stav)</h3>
          <p class="text-muted" style="margin-bottom:12px">Kolik MWh/rok ma pokryt kazdy zdroj:</p>

          <div class="field">
            <label>Tepelne cerpadlo <span class="unit">MWh/rok</span></label>
            <input type="number" id="teplo_mwh_tc" value="0" min="0" step="1" oninput="aktualizujSoucetZdroju()">
          </div>

          <div class="field">
            <label>Kogeneracni jednotka <span class="unit">MWh/rok</span></label>
            <input type="number" id="teplo_mwh_kgj" value="0" min="0" step="1" oninput="aktualizujSoucetZdroju()">
          </div>

          <div class="field">
            <label>Plynovy kotel <span class="unit">MWh/rok</span></label>
            <input type="number" id="teplo_mwh_kotel" value="0" min="0" step="1" oninput="aktualizujSoucetZdroju()">
          </div>

          <div class="field">
            <label>Teplarna / CZT <span class="unit">MWh/rok</span></label>
            <input type="number" id="teplo_mwh_czt" value="0" min="0" step="1" oninput="aktualizujSoucetZdroju()">
          </div>

          <div style="padding:8px 12px;background:var(--bg-light);border-radius:var(--radius-sm);margin-top:8px">
            Soucet zdroju: <strong id="teplo_soucet_zdroju">0.0 MWh</strong>
          </div>
        </div>
      </div>

      <div id="teplo_vysledky" style="margin-top:20px">
        <p class="text-muted">Vyplnte tepelnou ztratu nebo rocni potrebu tepla.</p>
      </div>
    </div>`;
}
