/**
 * OEES – Modul Optimalizace distribuční sazby (V15 kompat)
 * - Tabulka budoucích spotřebičů (17 typů)
 * - Až 4 odběrná místa (OM) se stávajícím + budoucím stavem
 * - Optimalizační náklady (bez/s investicí do spotřebičů)
 * - Výběr nové sazby per OM
 */

'use strict';

// Stav modulu
const DIST_STATE = {
  pocetOM: 1,
  om: [{}, {}, {}, {}],       // data per OM
  spotrebice: [],              // tabulka budoucích spotřebičů
  vybranaNovasazba: [null, null, null, null]
};

function inicializujModulDistribuce(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Inicializace spotřebičů z šablony
  if (DIST_STATE.spotrebice.length === 0) {
    DIST_STATE.spotrebice = SPOTREBICE_TYPY.map(s => ({
      ...s, stavajici_kw: 0, rozsireni_kw: 0, budouci_kw: 0
    }));
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-title"><span class="icon">🔌</span> Optimalizace distribuční sazby</div>
      <p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:20px">
        Zadejte spotřebiče, profil spotřeby per odběrné místo a systém porovná všechny sazby.
      </p>

      <!-- TABULKA SPOTŘEBIČŮ -->
      <div class="card" style="margin-bottom:20px;background:rgba(255,255,255,0.03)">
        <div class="card-title" style="font-size:0.9rem">📋 Tabulka budoucích spotřebičů</div>
        <table class="breakdown" id="d_spotrebice_tbl" style="font-size:0.82rem">
          <thead><tr>
            <th>Spotřebič</th>
            <th class="num" style="width:90px">Stávající kW</th>
            <th class="num" style="width:90px">Rozšíření kW</th>
            <th class="num" style="width:90px">Budoucí kW</th>
          </tr></thead>
          <tbody>
            ${DIST_STATE.spotrebice.map((s, i) => `
              <tr>
                <td>${s.nazev}</td>
                <td class="num"><input type="number" min="0" step="0.1" value="${s.stavajici_kw}"
                  style="width:70px;text-align:right" onchange="zmenSpotrebic(${i},'stavajici_kw',this.value)"></td>
                <td class="num"><input type="number" min="0" step="0.1" value="${s.rozsireni_kw}"
                  style="width:70px;text-align:right" onchange="zmenSpotrebic(${i},'rozsireni_kw',this.value)"></td>
                <td class="num" id="d_sp_bud_${i}" style="font-weight:600">${s.budouci_kw}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot><tr style="font-weight:700">
            <td>Celkem</td>
            <td class="num" id="d_sp_celk_stav">0</td>
            <td class="num" id="d_sp_celk_roz">0</td>
            <td class="num" id="d_sp_celk_bud">0</td>
          </tr></tfoot>
        </table>
      </div>

      <!-- POČET OM -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
        <label style="font-weight:600">Počet odběrných míst:</label>
        <select id="d_pocet_om" onchange="zmenPocetOM()" style="width:80px">
          <option value="1" selected>1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>

      <!-- OM PANELY -->
      <div id="d_om_panely"></div>

      <!-- VN sekce (zachována) -->
      <div id="d_vn_sekce" style="display:none">
        <div class="doporuceni" style="margin-bottom:16px">
          <strong>ℹ️ VN – vysoké napětí</strong>
          U VN se distribuce skládá z kapacitní platby + ceny za distribuované MWh.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="field">
            <label>Spotřeba celkem <span class="unit">MWh/rok</span></label>
            <input type="number" id="d_vn_spotreba" value="500" min="0" step="10" oninput="prepocitejVN()">
          </div>
          <div class="field">
            <label>Rezervovaný příkon <span class="unit">kW</span></label>
            <input type="number" id="d_vn_rezerv_vykon" value="200" min="0" step="5" oninput="prepocitejVN()">
          </div>
          <div class="field">
            <label>Cena za kapacitu <span class="unit">Kč/kW/měsíc</span></label>
            <input type="number" id="d_vn_cena_kapacita" value="180" min="0" step="5" oninput="prepocitejVN()">
          </div>
          <div class="field">
            <label>Cena za distribuci energie <span class="unit">Kč/MWh</span></label>
            <input type="number" id="d_vn_cena_energie" value="850" min="0" step="10" oninput="prepocitejVN()">
          </div>
          <div class="field">
            <label>Stálé měsíční poplatky <span class="unit">Kč/měsíc</span></label>
            <input type="number" id="d_vn_stale" value="500" min="0" step="50" oninput="prepocitejVN()">
          </div>
          <div class="field">
            <label>Load factor <span class="unit">%</span></label>
            <input type="number" id="d_vn_load_factor" value="65" min="1" max="100" oninput="prepocitejVN()">
          </div>
        </div>
        <div id="d_vysledky_vn"></div>
      </div>
    </div>
  `;

  aktualizujSouctySpotrebicu();
  renderOMPanely();
}

// ─── Spotřebiče ──────────────────────────────────────────────────────────────

function zmenSpotrebic(idx, pole, val) {
  DIST_STATE.spotrebice[idx][pole] = parseFloat(val) || 0;
  DIST_STATE.spotrebice[idx].budouci_kw =
    DIST_STATE.spotrebice[idx].stavajici_kw + DIST_STATE.spotrebice[idx].rozsireni_kw;
  const el = document.getElementById(`d_sp_bud_${idx}`);
  if (el) el.textContent = DIST_STATE.spotrebice[idx].budouci_kw.toFixed(1);
  aktualizujSouctySpotrebicu();
  prepocitejVsechnyOM();
}

function aktualizujSouctySpotrebicu() {
  let stav = 0, roz = 0, bud = 0;
  DIST_STATE.spotrebice.forEach(s => {
    stav += s.stavajici_kw; roz += s.rozsireni_kw; bud += s.budouci_kw;
  });
  const s = id => document.getElementById(id);
  if (s('d_sp_celk_stav')) s('d_sp_celk_stav').textContent = stav.toFixed(1);
  if (s('d_sp_celk_roz'))  s('d_sp_celk_roz').textContent = roz.toFixed(1);
  if (s('d_sp_celk_bud'))  s('d_sp_celk_bud').textContent = bud.toFixed(1);
}

// ─── Odběrná místa ───────────────────────────────────────────────────────────

function zmenPocetOM() {
  DIST_STATE.pocetOM = parseInt(document.getElementById('d_pocet_om').value) || 1;
  renderOMPanely();
}

function renderOMPanely() {
  const wrap = document.getElementById('d_om_panely');
  if (!wrap) return;
  let html = '';
  const jisticOpts = ['1x10','1x16','1x20','1x25','3x10','3x16','3x20','3x25','3x32','3x40','3x50','3x63','3x80','3x100','3x160']
    .map(j => `<option value="${j}" ${j === '3x25' ? 'selected' : ''}>${j.replace('x','×')} A</option>`).join('');
  const sazbaOpts = Object.keys(TARIFY_2026.CEZ.sazby)
    .map(s => `<option value="${s}">${s} – ${TARIFY_2026.CEZ.sazby[s].popis}</option>`).join('');

  for (let i = 0; i < DIST_STATE.pocetOM; i++) {
    html += `
    <div class="card" style="margin-bottom:16px;background:rgba(255,255,255,0.03)">
      <div class="card-title" style="font-size:0.9rem">⚡ Odběrné místo ${i + 1}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
        <div class="field">
          <label>Distributor</label>
          <select id="d_om${i}_dist" onchange="prepocitejOM(${i})">
            <option value="CEZ">ČEZ Distribuce</option>
            <option value="EGD">EG.D (E.ON)</option>
            <option value="PRE">PREdistribuce</option>
          </select>
        </div>
        <div class="field">
          <label>Napěťová hladina</label>
          <select id="d_om${i}_napeti" onchange="zmenNapetiOM(${i})">
            <option value="NN">NN</option>
            <option value="VN">VN</option>
          </select>
        </div>
        <div class="field">
          <label>Jistič</label>
          <select id="d_om${i}_jistic" onchange="prepocitejOM(${i})">${jisticOpts}</select>
        </div>
      </div>
      <div id="d_om${i}_nn">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <div class="field">
            <label>Aktuální sazba</label>
            <select id="d_om${i}_sazba" onchange="prepocitejOM(${i})">${sazbaOpts}</select>
          </div>
          <div class="field">
            <label>Spotřeba VT <span class="unit">MWh/rok</span></label>
            <input type="number" id="d_om${i}_vt" value="8" min="0" step="0.5" oninput="prepocitejOM(${i})">
          </div>
          <div class="field">
            <label>Spotřeba NT <span class="unit">MWh/rok</span></label>
            <input type="number" id="d_om${i}_nt" value="4" min="0" step="0.5" oninput="prepocitejOM(${i})">
          </div>
        </div>
        <div id="d_om${i}_vysledky"></div>
      </div>
    </div>`;
  }
  wrap.innerHTML = html;
  for (let i = 0; i < DIST_STATE.pocetOM; i++) prepocitejOM(i);
}

function zmenNapetiOM(idx) {
  const napeti = document.getElementById(`d_om${idx}_napeti`).value;
  const nnEl = document.getElementById(`d_om${idx}_nn`);
  if (nnEl) nnEl.style.display = napeti === 'NN' ? 'block' : 'none';
}

// ─── Výpočet per OM ──────────────────────────────────────────────────────────

function prepocitejVsechnyOM() {
  for (let i = 0; i < DIST_STATE.pocetOM; i++) prepocitejOM(i);
}

function prepocitejOM(idx) {
  const g = id => document.getElementById(`d_om${idx}_${id}`);
  const distributor = g('dist')?.value || 'CEZ';
  const jistic = g('jistic')?.value || '3x25';
  const sazbaAkt = g('sazba')?.value || 'D02d';
  const vt = parseFloat(g('vt')?.value) || 0;
  const nt = parseFloat(g('nt')?.value) || 0;
  const dist = TARIFY_2026[distributor];
  const sazby = Object.keys(dist.sazby);
  const celkKw = DIST_STATE.spotrebice.reduce((s, sp) => s + sp.budouci_kw, 0);

  const vysledky = sazby.map(sazba => {
    const s = dist.sazby[sazba];
    const spol = TARIFY_2026.spolecne;
    let en_vt, en_nt;
    if (s.tarif === 'JT') {
      en_vt = (vt + nt) * s.cena_vt / 1000; en_nt = 0;
    } else {
      en_vt = vt * s.cena_vt / 1000; en_nt = nt * s.cena_nt / 1000;
    }
    const dist_rok = en_vt + en_nt;
    const jistic_rok = (dist.jistic[jistic] || 0) * 12;
    const celkSpotr = vt + nt;
    const sys = celkSpotr * (spol.systemove_sluzby_vt + spol.poze + spol.ote + spol.dan_elektriny) / 1000;
    const bezDph = dist_rok + jistic_rok + sys;
    const sDph = bezDph * 1.21;

    // Investice do spotřebičů pro tuto sazbu
    const invKw = INVESTICE_KW_SAZBA[sazba] || 0;
    const investice = invKw * celkKw;

    // Optimalizační náklady (bez investice)
    const optNakl = (sazba !== sazbaAkt)
      ? OPTIMALIZACE_NAKLADY.admin_poplatek + OPTIMALIZACE_NAKLADY.prace_hodina * OPTIMALIZACE_NAKLADY.prace_hodiny
      : 0;

    // Způsobilost
    const minKw = MIN_KW_SAZBA[sazba] || 0;
    const zpusobilost = minKw === 0 || celkKw >= minKw;

    const celkNaklady = sDph + investice + optNakl;

    return {
      sazba, popis: s.popis, tarif: s.tarif, nt_hodiny: s.nt_hodiny,
      rocni_dist: Math.round(sDph),
      investice: Math.round(investice),
      opt_naklady: Math.round(optNakl),
      celk_naklady_1rok: Math.round(celkNaklady),
      prumer_mwh: celkSpotr > 0 ? Math.round(sDph / celkSpotr * 1000) : 0,
      zpusobilost,
      je_aktualni: sazba === sazbaAkt
    };
  });

  // Seřazení: nejnižší celkové náklady 1. roku
  vysledky.sort((a, b) => {
    if (a.zpusobilost !== b.zpusobilost) return a.zpusobilost ? -1 : 1;
    return a.celk_naklady_1rok - b.celk_naklady_1rok;
  });

  const nejlepsi = vysledky.find(v => v.zpusobilost) || vysledky[0];
  const aktualni = vysledky.find(v => v.je_aktualni) || vysledky[0];

  // Ulož do state
  DIST_STATE.om[idx] = { distributor, jistic, sazbaAkt, vt, nt, vysledky, nejlepsi, aktualni };

  // Ulož do OEES_STATE
  ulozDistribuciDoState();

  // Render
  renderOMVysledky(idx, vysledky, aktualni, nejlepsi);
}

function renderOMVysledky(idx, vysledky, aktualni, nejlepsi) {
  const el = document.getElementById(`d_om${idx}_vysledky`);
  if (!el) return;
  const fmt = n => new Intl.NumberFormat('cs-CZ').format(n);
  const vybrSazba = DIST_STATE.vybranaNovasazba[idx];

  let html = `
    <h4 style="font-size:0.85rem;margin:14px 0 8px;color:var(--text-muted)">
      Porovnání sazeb – OM ${idx + 1}
    </h4>
    <div style="overflow-x:auto">
    <table class="breakdown" style="font-size:0.78rem;min-width:700px">
      <thead><tr>
        <th>Sazba</th><th>NT h/den</th>
        <th class="num">Roční dist. vč. DPH</th>
        <th class="num">Investice kW</th>
        <th class="num">Opt. náklady</th>
        <th class="num">Celkem 1. rok</th>
        <th class="num">Úspora/rok</th>
        <th>Způs.</th>
        <th>Výběr</th>
      </tr></thead>
      <tbody>`;

  vysledky.forEach(v => {
    const uspora = aktualni.rocni_dist - v.rocni_dist;
    const isSelected = vybrSazba === v.sazba;
    const isBest = v.sazba === nejlepsi.sazba;
    const rowCls = v.je_aktualni ? 'style="background:rgba(100,180,255,0.1)"' :
                   isBest ? 'style="background:rgba(100,255,100,0.08)"' : '';
    html += `<tr ${rowCls}>
      <td><strong>${v.sazba}</strong> ${v.je_aktualni ? '(akt.)' : ''} ${isBest ? '⭐' : ''}</td>
      <td>${v.nt_hodiny || '–'}</td>
      <td class="num">${fmt(v.rocni_dist)} Kč</td>
      <td class="num">${v.investice > 0 ? fmt(v.investice) + ' Kč' : '–'}</td>
      <td class="num">${v.opt_naklady > 0 ? fmt(v.opt_naklady) + ' Kč' : '–'}</td>
      <td class="num"><strong>${fmt(v.celk_naklady_1rok)} Kč</strong></td>
      <td class="num" style="color:${uspora > 0 ? 'var(--success)' : uspora < 0 ? 'var(--danger,#e74c3c)' : 'inherit'}">
        ${uspora > 0 ? '↓ ' + fmt(uspora) : uspora < 0 ? '↑ ' + fmt(Math.abs(uspora)) : '–'} Kč
      </td>
      <td>${v.zpusobilost ? '✅' : '❌'}</td>
      <td>${!v.je_aktualni && v.zpusobilost ?
        `<button class="btn btn-sm ${isSelected ? 'btn-primary' : ''}"
          onclick="vyberSazbuOM(${idx},'${v.sazba}')" style="font-size:0.72rem;padding:2px 8px">
          ${isSelected ? 'Vybráno' : 'Vybrat'}
        </button>` : ''}</td>
    </tr>`;
  });

  html += '</tbody></table></div>';

  // Doporučení
  if (nejlepsi.sazba !== aktualni.sazba) {
    const usp = aktualni.rocni_dist - nejlepsi.rocni_dist;
    html += `<div class="doporuceni" style="margin-top:12px">
      <strong>✅ Doporučení: přejít na ${nejlepsi.sazba}</strong> –
      roční úspora <strong>${fmt(usp)} Kč</strong> na distribuci.
      ${nejlepsi.investice > 0 ? `Investice: ${fmt(nejlepsi.investice)} Kč.` : ''}
      ${nejlepsi.opt_naklady > 0 ? `Opt. náklady: ${fmt(nejlepsi.opt_naklady)} Kč.` : ''}
    </div>`;
  } else {
    html += `<div class="doporuceni" style="margin-top:12px">
      <strong>✅ Aktuální sazba ${aktualni.sazba} je optimální</strong> pro tento profil spotřeby.
    </div>`;
  }

  el.innerHTML = html;
}

function vyberSazbuOM(idx, sazba) {
  DIST_STATE.vybranaNovasazba[idx] = (DIST_STATE.vybranaNovasazba[idx] === sazba) ? null : sazba;
  prepocitejOM(idx);
  ulozDistribuciDoState();
}

function ulozDistribuciDoState() {
  const omData = [];
  for (let i = 0; i < DIST_STATE.pocetOM; i++) {
    const om = DIST_STATE.om[i];
    if (!om.aktualni) continue;
    omData.push({
      distributor: om.distributor, jistic: om.jistic,
      sazba_stavajici: om.sazbaAkt,
      sazba_nova: DIST_STATE.vybranaNovasazba[i] || om.nejlepsi?.sazba,
      spotreba_vt: om.vt, spotreba_nt: om.nt,
      naklady_stavajici: om.aktualni?.rocni_dist,
      naklady_nova: DIST_STATE.vybranaNovasazba[i]
        ? om.vysledky?.find(v => v.sazba === DIST_STATE.vybranaNovasazba[i])?.rocni_dist
        : om.nejlepsi?.rocni_dist,
      investice: DIST_STATE.vybranaNovasazba[i]
        ? om.vysledky?.find(v => v.sazba === DIST_STATE.vybranaNovasazba[i])?.investice
        : om.nejlepsi?.investice
    });
  }
  const celkUspora = omData.reduce((s, o) => s + ((o.naklady_stavajici || 0) - (o.naklady_nova || 0)), 0);
  const celkInvestice = omData.reduce((s, o) => s + (o.investice || 0), 0);

  OEES_STATE.case.distribuce = {
    pocet_om: DIST_STATE.pocetOM,
    spotrebice: DIST_STATE.spotrebice.filter(s => s.budouci_kw > 0),
    celkovy_budouci_kw: DIST_STATE.spotrebice.reduce((s, sp) => s + sp.budouci_kw, 0),
    om: omData,
    uspora_celkem_kc_rok: Math.round(celkUspora),
    investice_celkem: Math.round(celkInvestice)
  };
}

// ─── Přepínání NN / VN (zachováno) ───────────────────────────────────────────

function zmenNapetiDistribuce() {
  const napeti = document.getElementById('d_napeti')?.value;
  if (!napeti) return;
  document.getElementById('d_nn_sekce')?.style && (document.getElementById('d_nn_sekce').style.display = napeti === 'NN' ? 'block' : 'none');
  document.getElementById('d_vn_sekce')?.style && (document.getElementById('d_vn_sekce').style.display = napeti === 'VN' ? 'block' : 'none');
  if (napeti === 'VN') prepocitejVN();
}

// Starý alias pro zpětnou kompatibilitu
function prepocitejDistribuci() {
  prepocitejVsechnyOM();
}

// ─── Výpočet VN (zachováno beze změny) ──────────────────────────────────────

function prepocitejVN() {
  const spotreba       = parseFloat(document.getElementById('d_vn_spotreba')?.value) || 0;
  const rezerv_vykon   = parseFloat(document.getElementById('d_vn_rezerv_vykon')?.value) || 0;
  const cena_kapacita  = parseFloat(document.getElementById('d_vn_cena_kapacita')?.value) || 0;
  const cena_energie   = parseFloat(document.getElementById('d_vn_cena_energie')?.value) || 0;
  const stale          = parseFloat(document.getElementById('d_vn_stale')?.value) || 0;
  const load_factor    = parseFloat(document.getElementById('d_vn_load_factor')?.value) || 65;

  const kapacita_rok   = rezerv_vykon * cena_kapacita * 12;
  const energie_rok    = spotreba * cena_energie / 1000;
  const stale_rok      = stale * 12;
  const celkem_bez_dph = kapacita_rok + energie_rok + stale_rok;
  const dph            = celkem_bez_dph * 0.21;
  const celkem_s_dph   = celkem_bez_dph + dph;
  const prumer         = spotreba > 0 ? Math.round(celkem_s_dph / spotreba * 1000) : 0;
  const skutecny_vykon = Math.round(rezerv_vykon * load_factor / 100);
  const prebytecna_kap = rezerv_vykon - skutecny_vykon;
  const uspora_kapacita = prebytecna_kap > 0 ? Math.round(prebytecna_kap * cena_kapacita * 12 * 1.21) : 0;
  const fmt = n => new Intl.NumberFormat('cs-CZ').format(n);

  const el = document.getElementById('d_vysledky_vn');
  if (!el) return;
  el.innerHTML = `
    <div class="results-panel" style="margin-top:20px">
      <h3>Výsledek – VN distribuce</h3>
      <div class="results-grid">
        <div class="result-box">
          <div class="val">${fmt(Math.round(celkem_s_dph))} Kč</div>
          <div class="lbl">Distribuce celkem vč. DPH / rok</div>
        </div>
        <div class="result-box">
          <div class="val">${prumer}</div>
          <div class="lbl">Průměr Kč/MWh vč. DPH</div>
        </div>
        <div class="result-box highlight">
          <div class="val">${fmt(Math.round(kapacita_rok * 1.21))} Kč</div>
          <div class="lbl">Platba za kapacitu / rok vč. DPH</div>
        </div>
      </div>
      <table class="breakdown">
        <thead><tr><th>Složka</th><th class="num">Kč/rok bez DPH</th></tr></thead>
        <tbody>
          <tr><td>Kapacitní platba (${rezerv_vykon} kW × ${cena_kapacita} Kč × 12)</td>
              <td class="num">${fmt(Math.round(kapacita_rok))}</td></tr>
          <tr><td>Energie (${spotreba} MWh × ${cena_energie} Kč/MWh)</td>
              <td class="num">${fmt(Math.round(energie_rok))}</td></tr>
          <tr><td>Stálé poplatky (${stale} Kč × 12)</td>
              <td class="num">${fmt(Math.round(stale_rok))}</td></tr>
          <tr><td>DPH 21 %</td>
              <td class="num">${fmt(Math.round(dph))}</td></tr>
          <tr class="total"><td><strong>Celkem</strong></td>
              <td class="num"><strong>${fmt(Math.round(celkem_s_dph))}</strong></td></tr>
        </tbody>
      </table>
      ${prebytecna_kap > 5 ? `
        <div style="margin-top:14px;background:rgba(255,255,255,0.1);border-radius:6px;padding:12px;font-size:0.85rem">
          <strong>⚠️ Potenciální úspora na kapacitní platbě</strong><br>
          Průměrný odběr (${skutecny_vykon} kW při ${load_factor}% LF) je nižší než rezervace (${rezerv_vykon} kW).<br>
          Snížením o ${prebytecna_kap} kW lze ušetřit až <strong>${fmt(uspora_kapacita)} Kč/rok</strong>.
        </div>
      ` : ''}
    </div>
  `;
}
