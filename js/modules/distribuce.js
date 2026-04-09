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

      <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
        <label style="font-weight:600">Napěťová hladina:</label>
        <select id="d_napeti" onchange="zmenNapetiDistribuce()" style="width:200px">
          <option value="NN">NN – nízké napětí (domácnosti, malé firmy)</option>
          <option value="VN">VN – vysoké napětí (průmysl, velké firmy)</option>
        </select>
      </div>

      <div id="d_nn_sekce">
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

      </div><!-- /d_nn_sekce -->

      <!-- VN sekce -->
      <div id="d_vn_sekce" style="display:none">
        <div class="card" style="background:rgba(255,255,255,0.03)">
          <div class="card-title" style="font-size:0.9rem">⚡ Optimalizace distribuce VN</div>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:16px">
            Optimalizace rezervované kapacity (roční + měsíční) a kompenzace jalového výkonu.
            Roční RK je levnější ale fixní na 12 měsíců. Měsíční RK je flexibilní ale dražší (~10 %).
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div class="field">
              <label>Distributor</label>
              <select id="d_vn_dist" onchange="prepocitejVN()">
                <option value="CEZ">ČEZ Distribuce</option>
                <option value="EGD">EG.D (E.ON)</option>
                <option value="PRE">PREdistribuce</option>
              </select>
            </div>
            <div class="field">
              <label>Počet OM</label>
              <select id="d_vn_pocet_om" onchange="prepocitejVN()" style="width:80px">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>

          <h4 style="font-size:0.85rem;margin:0 0 10px;color:var(--primary)">📋 Stávající smluvní parametry</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
            <div class="field">
              <label>Rezervovaný příkon <span class="unit">MW</span></label>
              <input type="number" id="d_vn_prikon_mw" value="0.6" min="0" step="0.05" oninput="prepocitejVN()">
              <div class="hint">Technický limit přípojky (smlouva o připojení)</div>
            </div>
            <div class="field">
              <label>Roční rez. kapacita <span class="unit">MW</span></label>
              <input type="number" id="d_vn_rocni_rk" value="0.5" min="0" step="0.05" oninput="prepocitejVN()">
              <div class="hint">Fixní na celý rok (levnější sazba)</div>
            </div>
            <div class="field">
              <label>Měsíční rez. kapacita <span class="unit">MW</span></label>
              <input type="number" id="d_vn_mesicni_mk" value="0" min="0" step="0.05" oninput="prepocitejVN()">
              <div class="hint">Dodatečná nad roční RK (dražší, flexibilní)</div>
            </div>
          </div>

          <div style="background:rgba(100,180,255,0.06);border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:0.78rem;color:var(--text-muted)">
            <strong>Pravidlo:</strong> Roční RK + Měsíční MK ≤ Rezervovaný příkon.
            Měsíční MK se nastavuje individuálně pro každý měsíc (zde zadejte průměr za špičkové měsíce).
            <span id="d_vn_rk_warning" style="color:var(--danger,#e74c3c);font-weight:600"></span>
          </div>

          <h4 style="font-size:0.85rem;margin:0 0 10px;color:var(--text-muted)">Měřené hodnoty</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
            <div class="field">
              <label>Skutečné max (1/4h) <span class="unit">kW</span></label>
              <input type="number" id="d_vn_max_kw" value="380" min="0" step="10" oninput="prepocitejVN()">
              <div class="hint">Nejvyšší čtvrthodinový odběr za rok</div>
            </div>
            <div class="field">
              <label>Spotřeba celkem <span class="unit">MWh/rok</span></label>
              <input type="number" id="d_vn_spotreba" value="800" min="0" step="10" oninput="prepocitejVN()">
            </div>
            <div class="field">
              <label>Špičkové měsíce <span class="unit">počet</span></label>
              <input type="number" id="d_vn_spickove_mesice" value="4" min="0" max="12" step="1" oninput="prepocitejVN()">
              <div class="hint">Měsíce kdy potřebujete měsíční MK (0 = jen roční)</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
            <div class="field">
              <label>Účiník cos φ <span class="unit">stávající</span></label>
              <input type="number" id="d_vn_cos_phi" value="0.88" min="0.5" max="1" step="0.01" oninput="prepocitejVN()">
              <div class="hint">Z faktur od distributora</div>
            </div>
            <div class="field">
              <label>Jalová energie <span class="unit">kVArh/rok</span></label>
              <input type="number" id="d_vn_jalovy" value="120000" min="0" step="1000" oninput="prepocitejVN()">
              <div class="hint">Z ročního vyúčtování</div>
            </div>
            <div class="field">
              <label>Provozní hodiny <span class="unit">h/rok</span></label>
              <input type="number" id="d_vn_hodiny" value="4500" min="500" max="8760" step="100" oninput="prepocitejVN()">
              <div class="hint">Typicky 2000–6000 h/rok</div>
            </div>
          </div>

          <!-- UPLOAD ČTVRTHODINOVÉHO DIAGRAMU -->
          <div class="card" style="margin-bottom:16px;background:rgba(255,255,255,0.03);padding:12px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
              <strong style="font-size:0.85rem">📊 Čtvrthodinový odběrový diagram (volitelné)</strong>
            </div>
            <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px">
              Nahrajte CSV s čtvrthodinovými daty (sloupce: datum+čas, kW).
              Systém automaticky zjistí maximum, průměr, load factor a měsíční špičky.
            </p>
            <div style="display:flex;align-items:center;gap:12px">
              <input type="file" id="d_vn_diagram_file" accept=".csv,.xlsx,.xls"
                onchange="zpracujDiagramVN(this)" style="font-size:0.8rem">
              <span id="d_vn_diagram_stav" style="font-size:0.78rem;color:var(--text-muted)"></span>
            </div>
            <div id="d_vn_diagram_info" style="margin-top:8px;font-size:0.8rem"></div>
          </div>

          <h4 style="font-size:0.85rem;margin:0 0 10px;color:var(--success)">🎯 Návrh optimalizace</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
            <div class="field">
              <label>Nová roční RK <span class="unit">MW</span></label>
              <input type="number" id="d_vn_nova_rocni_rk" value="0.35" min="0" step="0.01" oninput="prepocitejVN()">
              <div class="hint">Celoroční minimum + 10-15 % rezerva</div>
            </div>
            <div class="field">
              <label>Nová měsíční MK <span class="unit">MW</span></label>
              <input type="number" id="d_vn_nova_mesicni_mk" value="0.1" min="0" step="0.01" oninput="prepocitejVN()">
              <div class="hint">Pouze pro špičkové měsíce</div>
            </div>
            <div class="field">
              <label>Cílový cos φ <span class="unit">po kompenzaci</span></label>
              <input type="number" id="d_vn_cilovy_phi" value="0.98" min="0.9" max="1" step="0.01" oninput="prepocitejVN()">
            </div>
          </div>

          <div id="d_vysledky_vn"></div>
        </div>
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
          <label>Jistič</label>
          <select id="d_om${i}_jistic" onchange="prepocitejOM(${i})">${jisticOpts}</select>
        </div>
        <div class="field">
          <label>Aktuální sazba</label>
          <select id="d_om${i}_sazba" onchange="prepocitejOM(${i})">${sazbaOpts}</select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
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
    </div>`;
  }
  wrap.innerHTML = html;
  for (let i = 0; i < DIST_STATE.pocetOM; i++) prepocitejOM(i);
}

// zmenNapetiOM odstraněna – VN/NN se řídí globálním přepínačem

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

// ─── Výpočet VN – optimalizace příkonu + jalového výkonu ────────────────────

function prepocitejVN() {
  const fmt = n => new Intl.NumberFormat('cs-CZ').format(n);
  const el = document.getElementById('d_vysledky_vn');
  if (!el) return;

  // Vstupy – smluvní parametry
  const distKey       = document.getElementById('d_vn_dist')?.value || 'CEZ';
  const pocetOM       = parseInt(document.getElementById('d_vn_pocet_om')?.value) || 1;
  const prikonMW      = parseFloat(document.getElementById('d_vn_prikon_mw')?.value) || 0;
  const stavRocniRK   = parseFloat(document.getElementById('d_vn_rocni_rk')?.value) || 0;
  const stavMesicniMK = parseFloat(document.getElementById('d_vn_mesicni_mk')?.value) || 0;
  const spickoveMesice = parseInt(document.getElementById('d_vn_spickove_mesice')?.value) || 0;

  // Vstupy – měřené hodnoty
  const maxKW       = parseFloat(document.getElementById('d_vn_max_kw')?.value) || 0;
  const spotreba    = parseFloat(document.getElementById('d_vn_spotreba')?.value) || 0;
  const cosPhi      = parseFloat(document.getElementById('d_vn_cos_phi')?.value) || 0.88;
  const jalovyKVArh = parseFloat(document.getElementById('d_vn_jalovy')?.value) || 0;
  const hodiny      = parseFloat(document.getElementById('d_vn_hodiny')?.value) || 4500;

  // Vstupy – návrh optimalizace
  const novaRocniRK   = parseFloat(document.getElementById('d_vn_nova_rocni_rk')?.value) || 0;
  const novaMesicniMK = parseFloat(document.getElementById('d_vn_nova_mesicni_mk')?.value) || 0;
  const cilovyPhi     = parseFloat(document.getElementById('d_vn_cilovy_phi')?.value) || 0.98;

  const dist = TARIFY_VN_2026[distKey];
  const spol = TARIFY_VN_2026.spolecne;

  // Validace: RK + MK <= příkon
  const warnEl = document.getElementById('d_vn_rk_warning');
  if (warnEl) {
    if (stavRocniRK + stavMesicniMK > prikonMW + 0.001) {
      warnEl.textContent = ' ⚠ Roční RK + Měsíční MK překračuje rezervovaný příkon!';
    } else {
      warnEl.textContent = '';
    }
  }

  // Auto-návrh optimalizace pokud uživatel needitoval
  const elNovaRK = document.getElementById('d_vn_nova_rocni_rk');
  const elNovaMK = document.getElementById('d_vn_nova_mesicni_mk');
  if (elNovaRK && !elNovaRK._userEdited) {
    // Roční RK = celoroční minimum potřeby + 10% rezerva (bez špičkových měsíců)
    const baseKW = maxKW * 0.7; // odhadnuté celoroční minimum ~70% maxima
    elNovaRK.value = (Math.ceil(baseKW * 1.1) / 1000).toFixed(3);
  }
  if (elNovaMK && !elNovaMK._userEdited) {
    // Měsíční MK = pokrytí špičky nad roční RK
    const novaRKval = parseFloat(elNovaRK?.value) || 0;
    const potrebaMK = Math.max(0, (maxKW * 1.15 / 1000) - novaRKval);
    elNovaMK.value = potrebaMK > 0.01 ? potrebaMK.toFixed(3) : '0';
  }
  const skutNovaRK = parseFloat(elNovaRK?.value) || 0;
  const skutNovaMK = parseFloat(elNovaMK?.value) || 0;

  // ── STÁVAJÍCÍ STAV ──
  // Roční RK: platí se 12 měsíců
  const rez_rocni_stav  = stavRocniRK * dist.rocni_kapacita * 12;
  // Měsíční MK: platí se jen za špičkové měsíce
  const rez_mesicni_stav = stavMesicniMK * dist.mesicni_kapacita * spickoveMesice;
  const rez_celkem_stav = rez_rocni_stav + rez_mesicni_stav;
  const sit_rok_stav    = spotreba * dist.pouziti_siti;
  const sys_rok         = spotreba * spol.systemove_sluzby;
  const dan_rok         = spotreba * spol.dan_elektriny;
  const ote_rok         = spol.ote_mesic * 12 * pocetOM;
  const jalovyPenalize  = cosPhi < spol.ucinek_min ? jalovyKVArh * spol.penalizace_jalovy_kvarh : 0;
  const stav_bez_dph    = rez_celkem_stav + sit_rok_stav + sys_rok + dan_rok + ote_rok + jalovyPenalize;
  const stav_dph        = stav_bez_dph * spol.dph;
  const stav_celkem     = stav_bez_dph + stav_dph;

  // ── OPTIMALIZOVANÝ STAV ──
  const rez_rocni_opt   = skutNovaRK * dist.rocni_kapacita * 12;
  const optSpickoveMes  = skutNovaMK > 0 ? spickoveMesice : 0;
  const rez_mesicni_opt = skutNovaMK * dist.mesicni_kapacita * optSpickoveMes;
  const rez_celkem_opt  = rez_rocni_opt + rez_mesicni_opt;
  const zbytkJalovy     = cilovyPhi >= spol.ucinek_min ? 0 : jalovyKVArh * (1 - cilovyPhi / cosPhi);
  const jalovyPenOpt    = zbytkJalovy * spol.penalizace_jalovy_kvarh;
  const opt_bez_dph     = rez_celkem_opt + sit_rok_stav + sys_rok + dan_rok + ote_rok + jalovyPenOpt;
  const opt_dph         = opt_bez_dph * spol.dph;
  const opt_celkem      = opt_bez_dph + opt_dph;

  // ── ÚSPORY ──
  const uspora_rez      = rez_celkem_stav - rez_celkem_opt;
  const uspora_jalovy   = jalovyPenalize - jalovyPenOpt;
  const uspora_celkem   = stav_celkem - opt_celkem;

  // ── INVESTICE DO KOMPENZACE ──
  const tanStav = Math.sqrt(1 / (cosPhi * cosPhi) - 1);
  const tanCil  = Math.sqrt(1 / (cilovyPhi * cilovyPhi) - 1);
  const prumVykon = spotreba * 1000 / hodiny;
  const kompKVAr  = Math.max(0, prumVykon * (tanStav - tanCil));
  const investKomp = kompKVAr * spol.kompenzace_kc_kvar;
  const navratnost = uspora_celkem > 0 ? investKomp / uspora_celkem : 0;

  // Load factor
  const celkovaRKmw = stavRocniRK + stavMesicniMK;
  const loadFactor = celkovaRKmw > 0 ? Math.round((spotreba * 1000 / hodiny) / (celkovaRKmw * 1000) * 100) : 0;
  const vyuziti    = celkovaRKmw > 0 ? Math.round(maxKW / (celkovaRKmw * 1000) * 100) : 0;

  // Nová celková kapacita a rezerva
  const novaCapMW = skutNovaRK + skutNovaMK;
  const rezervaKW = novaCapMW * 1000 - maxKW;
  const rezervaPct = novaCapMW > 0 ? Math.round(rezervaKW / (novaCapMW * 1000) * 100) : 0;

  // Uložit do OEES_STATE
  OEES_STATE.case.distribuce_vn = {
    distributor: distKey,
    stav: { prikon_mw: prikonMW, rocni_rk: stavRocniRK, mesicni_mk: stavMesicniMK,
            max_kw: maxKW, spotreba, cos_phi: cosPhi, celkem: Math.round(stav_celkem) },
    optimalizace: { rocni_rk: skutNovaRK, mesicni_mk: skutNovaMK, cos_phi: cilovyPhi,
                    celkem: Math.round(opt_celkem) },
    uspora_kc_rok: Math.round(uspora_celkem),
    investice_kompenzace: Math.round(investKomp),
    navratnost_roky: Math.round(navratnost * 10) / 10
  };

  // ── RENDER ──
  el.innerHTML = `
    <div class="results-panel" style="margin-top:16px">
      <h3>Výsledky – VN distribuce ${dist.nazev}</h3>

      <div class="results-grid" style="margin-bottom:16px">
        <div class="result-box">
          <div class="val">${fmt(Math.round(stav_celkem))} Kč</div>
          <div class="lbl">Stávající stav / rok vč. DPH</div>
        </div>
        <div class="result-box">
          <div class="val">${fmt(Math.round(opt_celkem))} Kč</div>
          <div class="lbl">Po optimalizaci / rok vč. DPH</div>
        </div>
        <div class="result-box highlight">
          <div class="val">${fmt(Math.round(uspora_celkem))} Kč</div>
          <div class="lbl">Roční úspora vč. DPH</div>
        </div>
      </div>

      <table class="breakdown" style="font-size:0.82rem">
        <thead><tr>
          <th>Složka</th>
          <th class="num">Stávající (Kč/rok)</th>
          <th class="num">Optimalizace (Kč/rok)</th>
          <th class="num">Úspora</th>
        </tr></thead>
        <tbody>
          <tr>
            <td>Roční rez. kapacita (${fmt(Math.round(dist.rocni_kapacita))} Kč/MW/měs × 12)</td>
            <td class="num">${fmt(Math.round(rez_rocni_stav))}</td>
            <td class="num">${fmt(Math.round(rez_rocni_opt))}</td>
            <td class="num" style="color:${rez_rocni_stav - rez_rocni_opt > 0 ? 'var(--success)' : 'inherit'}">${fmt(Math.round(rez_rocni_stav - rez_rocni_opt))}</td>
          </tr>
          <tr>
            <td>Měsíční rez. kapacita (${fmt(Math.round(dist.mesicni_kapacita))} Kč/MW/měs × ${spickoveMesice} měs)</td>
            <td class="num">${fmt(Math.round(rez_mesicni_stav))}</td>
            <td class="num">${fmt(Math.round(rez_mesicni_opt))}</td>
            <td class="num" style="color:${rez_mesicni_stav - rez_mesicni_opt > 0 ? 'var(--success)' : 'inherit'}">${fmt(Math.round(rez_mesicni_stav - rez_mesicni_opt))}</td>
          </tr>
          <tr>
            <td>Použití sítí (${fmt(Math.round(dist.pouziti_siti))} Kč/MWh × ${spotreba} MWh)</td>
            <td class="num">${fmt(Math.round(sit_rok_stav))}</td>
            <td class="num">${fmt(Math.round(sit_rok_stav))}</td>
            <td class="num">–</td>
          </tr>
          <tr>
            <td>Systémové služby (${fmt(spol.systemove_sluzby)} Kč/MWh)</td>
            <td class="num">${fmt(Math.round(sys_rok))}</td>
            <td class="num">${fmt(Math.round(sys_rok))}</td>
            <td class="num">–</td>
          </tr>
          <tr>
            <td>Daň z elektřiny</td>
            <td class="num">${fmt(Math.round(dan_rok))}</td>
            <td class="num">${fmt(Math.round(dan_rok))}</td>
            <td class="num">–</td>
          </tr>
          <tr>
            <td>OTE (${pocetOM} OM × ${spol.ote_mesic} Kč × 12)</td>
            <td class="num">${fmt(Math.round(ote_rok))}</td>
            <td class="num">${fmt(Math.round(ote_rok))}</td>
            <td class="num">–</td>
          </tr>
          <tr style="background:${jalovyPenalize > 0 ? 'rgba(255,100,100,0.1)' : 'transparent'}">
            <td>Penalizace jalový výkon (cos φ = ${cosPhi})</td>
            <td class="num">${jalovyPenalize > 0 ? fmt(Math.round(jalovyPenalize)) : '–'}</td>
            <td class="num">${jalovyPenOpt > 0 ? fmt(Math.round(jalovyPenOpt)) : '–'}</td>
            <td class="num" style="color:${uspora_jalovy > 0 ? 'var(--success)' : 'inherit'}">${uspora_jalovy > 0 ? fmt(Math.round(uspora_jalovy)) : '–'}</td>
          </tr>
          <tr><td>DPH 21 %</td>
            <td class="num">${fmt(Math.round(stav_dph))}</td>
            <td class="num">${fmt(Math.round(opt_dph))}</td>
            <td class="num">${fmt(Math.round(stav_dph - opt_dph))}</td>
          </tr>
          <tr class="total"><td><strong>CELKEM vč. DPH</strong></td>
            <td class="num"><strong>${fmt(Math.round(stav_celkem))}</strong></td>
            <td class="num"><strong>${fmt(Math.round(opt_celkem))}</strong></td>
            <td class="num" style="color:var(--success)"><strong>${fmt(Math.round(uspora_celkem))}</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- DIAGNOSTIKA -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:16px">
        <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:10px;font-size:0.8rem">
          <strong>Load factor</strong><br>
          ${loadFactor} % (průměr ${fmt(Math.round(prumVykon))} kW / kapacita ${fmt(Math.round(celkovaRKmw * 1000))} kW)
          ${loadFactor < 40 ? '<br><span style="color:var(--warning,orange)">Nízký – kapacita je předimenzovaná</span>' : ''}
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:10px;font-size:0.8rem">
          <strong>Využití kapacity</strong><br>
          ${vyuziti} % (max ${fmt(maxKW)} kW / kapacita ${fmt(Math.round(celkovaRKmw * 1000))} kW)
          ${vyuziti < 70 ? '<br><span style="color:var(--warning,orange)">Kapacitu lze snížit</span>' : ''}
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:6px;padding:10px;font-size:0.8rem">
          <strong>Nová rezerva</strong><br>
          ${fmt(Math.round(rezervaKW))} kW (${rezervaPct} %)
          ${rezervaPct < 10 ? '<br><span style="color:var(--danger,#e74c3c)">Riziko překročení!</span>' :
            rezervaPct > 30 ? '<br><span style="color:var(--warning,orange)">Zbytečně velká</span>' :
            '<br><span style="color:var(--success)">Optimální</span>'}
        </div>
      </div>

      ${kompKVAr > 0 ? `
      <div style="margin-top:14px;background:rgba(100,180,255,0.08);border-radius:6px;padding:12px;font-size:0.84rem">
        <strong>💡 Kompenzace jalového výkonu</strong><br>
        Potřebný kompenzační výkon: <strong>${fmt(Math.round(kompKVAr))} kVAr</strong><br>
        Orientační investice: <strong>${fmt(Math.round(investKomp))} Kč</strong>
        (${fmt(Math.round(spol.kompenzace_kc_kvar))} Kč/kVAr)<br>
        Roční úspora na penalizacích: <strong>${fmt(Math.round(uspora_jalovy))} Kč</strong><br>
        ${navratnost > 0 ? `Návratnost: <strong>${navratnost.toFixed(1)} roku</strong>` : ''}
      </div>
      ` : ''}

      ${uspora_rez > 0 ? `
      <div style="margin-top:10px;background:rgba(100,255,100,0.08);border-radius:6px;padding:12px;font-size:0.84rem">
        <strong>💡 Optimalizace rezervované kapacity</strong><br>
        Roční RK: ${fmt(Math.round(stavRocniRK * 1000))} kW → <strong>${fmt(Math.round(skutNovaRK * 1000))} kW</strong><br>
        Měsíční MK: ${fmt(Math.round(stavMesicniMK * 1000))} kW → <strong>${fmt(Math.round(skutNovaMK * 1000))} kW</strong>
        (${optSpickoveMes} špičkových měsíců)<br>
        Roční úspora na kapacitě: <strong>${fmt(Math.round(uspora_rez))} Kč</strong><br>
        <span style="font-size:0.78rem;color:var(--text-muted)">
          Penalizace za překročení RK: 1,5× měsíční sazba.
          Penalizace za překročení příkonu: 4× roční sazba.
          Doporučená rezerva: 10–15 % nad skutečné maximum.
        </span>
      </div>
      ` : ''}

      <div class="doporuceni" style="margin-top:14px">
        <strong>✅ Celková roční úspora: ${fmt(Math.round(uspora_celkem))} Kč</strong>
        ${investKomp > 0 ? ` | Investice do kompenzace: ${fmt(Math.round(investKomp))} Kč | Návratnost: ${navratnost.toFixed(1)} roku` : ''}
      </div>
    </div>
  `;
}

// Sledování ruční editace optimalizačních polí
document.addEventListener('input', function(e) {
  if (e.target && (e.target.id === 'd_vn_nova_rocni_rk' || e.target.id === 'd_vn_nova_mesicni_mk')) {
    e.target._userEdited = true;
  }
});

// ─── Zpracování čtvrthodinového diagramu (CSV) ─────────────────────────────

function zpracujDiagramVN(input) {
  const stavEl = document.getElementById('d_vn_diagram_stav');
  const infoEl = document.getElementById('d_vn_diagram_info');
  const file = input.files[0];
  if (!file) return;

  stavEl.textContent = 'Načítám...';
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      // Detekce oddělovače (čárka nebo středník)
      const sep = lines[0].includes(';') ? ';' : ',';
      // Přeskočit hlavičku pokud není číslo
      const start = isNaN(parseFloat(lines[0].split(sep).pop())) ? 1 : 0;
      const values = [];
      for (let i = start; i < lines.length; i++) {
        const parts = lines[i].split(sep);
        const val = parseFloat(parts[parts.length - 1].replace(',', '.'));
        if (!isNaN(val) && val >= 0) values.push(val);
      }
      if (values.length < 10) {
        stavEl.textContent = 'Chyba: příliš málo dat';
        return;
      }
      const maxKW = Math.max(...values);
      const prumer = values.reduce((a, b) => a + b, 0) / values.length;
      const loadF = maxKW > 0 ? Math.round(prumer / maxKW * 100) : 0;
      const rocniMWh = Math.round(prumer * values.length * 0.25 / 1000 * 10) / 10; // 15min interval → MWh

      // Vyplnit formulář
      document.getElementById('d_vn_max_kw').value = Math.round(maxKW);
      document.getElementById('d_vn_spotreba').value = rocniMWh;
      // Auto-návrh nové roční RK a měsíční MK z diagramu
      const baseRK = Math.ceil(prumer * 1.1) / 1000; // celoroční základ = průměr + 10%
      const rkEl = document.getElementById('d_vn_nova_rocni_rk');
      const mkEl = document.getElementById('d_vn_nova_mesicni_mk');
      if (rkEl) { rkEl.value = baseRK.toFixed(3); rkEl._userEdited = false; }
      if (mkEl) { mkEl.value = Math.max(0, (Math.ceil(maxKW * 1.15) / 1000) - baseRK).toFixed(3); mkEl._userEdited = false; }

      stavEl.textContent = `Načteno ${values.length} záznamů`;
      infoEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">
          <div><strong>Maximum:</strong> ${Math.round(maxKW)} kW</div>
          <div><strong>Průměr:</strong> ${Math.round(prumer)} kW</div>
          <div><strong>Load factor:</strong> ${loadF} %</div>
          <div><strong>Roční spotřeba:</strong> ~${rocniMWh} MWh</div>
        </div>
      `;
      prepocitejVN();
    } catch (err) {
      stavEl.textContent = 'Chyba při zpracování: ' + err.message;
    }
  };
  reader.readAsText(file);
}
