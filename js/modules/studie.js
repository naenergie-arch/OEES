/**
 * OEES – Generátor studií
 * Předběžná energetická studie + Finální energetická studie
 * Výstup: printovatelný HTML dokument v novém okně
 *
 * Inspirováno strukturou Excel V15:
 *   Předběžné výstupní informace / Finální výstupní informace / Přílohy
 */

'use strict';

// ─── Pomocné formátovací funkce ─────────────────────────────────────────────

const _fmtKc = (v) => {
  if (v == null || v === '' || isNaN(v)) return '—';
  return new Intl.NumberFormat('cs-CZ').format(Math.round(v)) + ' Kč';
};

const _fmtMwh = (v) => {
  if (v == null || v === '' || isNaN(v) || v === 0) return '—';
  return parseFloat(v).toFixed(1) + ' MWh';
};

const _fmtNav = (v) => {
  if (!v || v === '---' || v === 0 || isNaN(parseFloat(v))) return '—';
  const n = parseFloat(v);
  return n > 50 ? '> 50 let' : n.toFixed(1) + ' let';
};

const _dnes = () =>
  new Date().toLocaleDateString('cs-CZ', { day: '2-digit', month: 'long', year: 'numeric' });

const _platnost = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: 'long', year: 'numeric' });
};

// ─── Sběr dat z DOM ─────────────────────────────────────────────────────────

function _sberiObjekt() {
  const g = (id) => document.getElementById(id)?.value?.trim() || '';
  const session = (() => {
    try { return JSON.parse(localStorage.getItem('oees_calc_session') || '{}'); }
    catch (e) { return {}; }
  })();

  return {
    nazev:       g('o_nazev') || 'Neuvedeno',
    ico:         g('o_ico'),
    kontakt:     g('o_kontakt'),
    email:       g('o_email'),
    telefon:     g('o_telefon'),
    sidlo:       [g('o_sidlo_ulice'), g('o_sidlo_obec'), g('o_sidlo_psc')].filter(Boolean).join(', '),
    real_adresa: [g('o_real_ulice'),  g('o_real_obec'),  g('o_real_psc')].filter(Boolean).join(', '),
    typ_obj:     g('o_typ'),
    plocha:      g('o_plocha'),
    byty:        g('o_byty'),
    ep_jmeno:    session.jmeno  || 'NaEnergie.cz',
    ep_email:    session.email  || 'info@naenergie.cz',
    ep_telefon:  '+420 776 327 523'
  };
}

// ─── CSS ────────────────────────────────────────────────────────────────────

function _studieCss() {
  return `<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#1a1a2e;background:#fff;line-height:1.55}
  .page{max-width:200mm;margin:0 auto;padding:14mm 18mm}

  /* Print button */
  .print-btn{position:fixed;top:18px;right:18px;padding:9px 20px;background:#1e3a5f;color:#fff;
    border:none;border-radius:5px;cursor:pointer;font-size:9.5pt;font-weight:700;z-index:999;
    box-shadow:0 3px 10px rgba(0,0,0,.25)}
  .print-btn:hover{background:#2d5586}
  @media print{.print-btn{display:none}}

  /* Titulní strana */
  .title-page{min-height:95vh;display:flex;flex-direction:column;justify-content:space-between;
    page-break-after:always}
  .logo-bar{display:flex;justify-content:space-between;align-items:center;
    padding-bottom:18px;border-bottom:3px solid #1e3a5f;margin-bottom:36px}
  .logo-brand{font-size:20pt;font-weight:800;color:#1e3a5f;letter-spacing:-.5px}
  .logo-brand span{color:#e67e22}
  .badge{background:#1e3a5f;color:#fff;padding:5px 16px;border-radius:4px;
    font-size:8.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  .badge.fin{background:#c0392b}
  h1.main-title{font-size:26pt;font-weight:800;color:#1e3a5f;line-height:1.18;margin-bottom:10px}
  .subtitle{font-size:12pt;color:#666;margin-bottom:36px}
  .klient-box{background:#f8f9fa;border-left:4px solid #1e3a5f;padding:18px 22px;margin:16px 0}
  .klient-box table{width:100%;border-collapse:collapse}
  .klient-box td{padding:3px 0;vertical-align:top}
  .klient-box td:first-child{font-weight:600;color:#555;width:150px;white-space:nowrap}
  .footer-info{border-top:2px solid #e8e8e8;padding-top:14px;display:flex;
    justify-content:space-between;font-size:8pt;color:#888}

  /* Obsah */
  .toc{page-break-after:always;padding-bottom:20px}
  .toc h2{font-size:13pt;color:#1e3a5f;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #1e3a5f}
  .toc ol{padding-left:22px}
  .toc li{padding:4px 0;font-size:9.5pt}
  .note-box{margin-top:20px;padding:13px 16px;background:#f8f9fa;border-radius:4px;
    border-left:3px solid #1e3a5f;font-size:9pt}

  /* Sekce */
  .section{margin-bottom:28px;page-break-inside:avoid}
  .section h2{font-size:12.5pt;font-weight:700;color:#1e3a5f;
    padding:9px 15px;background:linear-gradient(90deg,#1e3a5f10,transparent);
    border-left:4px solid #1e3a5f;margin-bottom:12px}
  .section-note{font-size:8.5pt;color:#777;margin-bottom:10px;font-style:italic}

  /* Tabulky */
  table.dt{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:10px}
  table.dt th,table.dt td{padding:6px 11px;text-align:left;border-bottom:1px solid #e8e8e8}
  table.dt th{color:#555;font-weight:500;width:54%}
  table.dt thead tr{background:#1e3a5f;color:#fff}
  table.dt thead th{color:#fff;font-weight:700;width:auto}
  table.dt .hl{background:#eef5ff}
  table.dt .hl th,table.dt .hl td{font-weight:700}
  table.dt tfoot tr{background:#1e3a5f18}
  table.dt tfoot td,table.dt tfoot th{font-weight:700}
  .num{text-align:right!important}
  .pos{color:#16a34a;font-weight:700}
  .neg{color:#c0392b}

  /* Souhrn */
  .souhrn-table thead tr{background:#1e3a5f}
  .souhrn-table tfoot tr{background:#1e3a5f;color:#fff}
  .souhrn-table tfoot td{color:#fff!important}

  /* Přílohy */
  .prilohy-list{list-style:none;padding:0}
  .prilohy-list li{padding:6px 0;border-bottom:1px solid #eee;font-size:9.5pt}
  .prilohy-list a{color:#1e3a5f;word-break:break-all}

  /* Patička */
  .doc-footer{margin-top:36px;padding-top:13px;border-top:2px solid #eee;
    font-size:7.5pt;color:#aaa;text-align:center}

  @media print{
    .page{padding:8mm 12mm;max-width:none}
    .title-page{page-break-after:always}
    .toc{page-break-after:always}
    .section{page-break-inside:avoid}
    @page{margin:8mm}
  }
  a{color:#1e3a5f}
  </style>`;
}

// ─── Sekce jednotlivých modulů ───────────────────────────────────────────────

function _sElektrina(c) {
  const d = c.elektrina;
  if (!d?.vysledek) return '';
  const usp = d.vysledek.uspora_kc_rok || 0;
  const sC  = d.stavajici?.celkem?.celkem_s_dph;
  const bC  = d.budouci?.celkem?.celkem_s_dph;
  const sMwh = (d.stavajici?.spotreba_vt || 0) + (d.stavajici?.spotreba_nt || 0);
  const bMwh = (d.budouci?.spotreba_vt  || 0) + (d.budouci?.spotreba_nt  || 0);
  return `
  <div class="section">
    <h2>⚡ Elektřina</h2>
    <table class="dt">
      <tr><th>Stávající spotřeba</th><td>${sMwh ? sMwh.toLocaleString('cs-CZ') + ' kWh/rok' : '—'}</td></tr>
      <tr><th>Budoucí spotřeba</th><td>${bMwh ? bMwh.toLocaleString('cs-CZ') + ' kWh/rok' : '—'}</td></tr>
      <tr><th>Stávající roční náklady (vč. DPH)</th><td>${_fmtKc(sC)}</td></tr>
      <tr><th>Budoucí roční náklady (vč. DPH)</th><td>${_fmtKc(bC)}</td></tr>
      <tr class="hl"><th>Roční úspora</th><td class="${usp >= 0 ? 'pos' : 'neg'}">${_fmtKc(Math.abs(usp))}${usp < 0 ? ' (navýšení)' : ''}</td></tr>
    </table>
  </div>`;
}

function _sFVE(c) {
  const d = c.fve;
  if (!d?.vysledek) return '';
  const v = d.vysledek;
  return `
  <div class="section">
    <h2>☀️ Fotovoltaická elektrárna (FVE)</h2>
    <table class="dt">
      <tr><th>Instalovaný výkon</th><td>${d.vstup?.kwp || '—'} kWp</td></tr>
      <tr><th>Lokalita / orientace / sklon</th><td>${[d.vstup?.lokalita, d.vstup?.orientace, d.vstup?.sklon ? d.vstup.sklon + '°' : ''].filter(Boolean).join(' / ') || '—'}</td></tr>
      <tr><th>Odhadovaná roční výroba</th><td>${_fmtMwh(v.vyroba_mwh_rok)}</td></tr>
      <tr><th>Vlastní spotřeba z FVE</th><td>${_fmtMwh(v.vlastni_spotreba_mwh)} (${v.pokryti_procenta || '—'} %)</td></tr>
      <tr><th>Orientační investice</th><td>${_fmtKc(v.investice_kc)}</td></tr>
      <tr><th>Roční přínos (rok 1)</th><td class="pos">${_fmtKc(v.rocni_prinos_r1)}</td></tr>
      <tr class="hl"><th>Prostá návratnost</th><td>${_fmtNav(v.navratnost_let)}</td></tr>
      <tr><th>ROI za 25 let</th><td>${v.roi_25let_procenta != null ? v.roi_25let_procenta + ' %' : '—'}</td></tr>
    </table>
  </div>`;
}

function _sVoda(c) {
  const d = c.voda;
  if (!d?.puvodni_naklady) return '';
  return `
  <div class="section">
    <h2>💧 Voda + úspora tepla TUV</h2>
    <table class="dt">
      <tr><th>Spotřeba studené vody</th><td>${d.sv_m3_rok ? d.sv_m3_rok.toLocaleString('cs-CZ') + ' m³/rok' : '—'}</td></tr>
      <tr><th>Spotřeba teplé vody (TUV)</th><td>${d.tv_m3_rok ? d.tv_m3_rok.toLocaleString('cs-CZ') + ' m³/rok' : '—'}</td></tr>
      <tr><th>Energie na ohřev TUV</th><td>${_fmtMwh(d.energie_ohrev_mwh_rok)}</td></tr>
      <tr><th>Počet osob / bytů</th><td>${[d.pocet_osob ? d.pocet_osob + ' osob' : null, d.pocet_bytu ? d.pocet_bytu + ' bytů' : null].filter(Boolean).join(', ') || '—'}</td></tr>
      <tr><th>Stávající roční náklady (voda + TUV)</th><td>${_fmtKc(d.puvodni_naklady)}</td></tr>
      <tr><th>Náklady po realizaci</th><td>${_fmtKc(d.naklady_po_realizaci)}</td></tr>
      <tr class="hl"><th>Celková roční úspora</th><td class="pos">${_fmtKc(d.uspora_celkem)}</td></tr>
      <tr><th>Investice do opatření</th><td>${_fmtKc(d.investice)}</td></tr>
      <tr><th>Návratnost investice</th><td>${_fmtNav(d.navratnost)}</td></tr>
    </table>
    ${d.naklad_tuv_tc && d.naklad_tuv_stavajici ? `
    <div class="section-note">TUV dimenzování: stávající ohřev ${_fmtKc(d.naklad_tuv_stavajici)}/rok → s TČ (COP ${d.cop_tc || '—'}) ${_fmtKc(d.naklad_tuv_tc)}/rok</div>` : ''}
  </div>`;
}

function _sTC(c) {
  const d = c.tc;
  if (!d?.potreba_mwh) return '';
  return `
  <div class="section">
    <h2>❄️ Tepelné čerpadlo</h2>
    <table class="dt">
      <tr><th>Typ tepelného čerpadla</th><td>${d.typ || '—'}</td></tr>
      <tr><th>Roční potřeba tepla</th><td>${_fmtMwh(d.potreba_mwh)}</td></tr>
      <tr><th>COP (roční průměr)</th><td>${d.cop || '—'}</td></tr>
      <tr><th>Stávající náklady na teplo</th><td>${_fmtKc(d.naklad_stavajici)}</td></tr>
      <tr><th>Náklady s tepelným čerpadlem</th><td>${_fmtKc(d.naklad_tc)}</td></tr>
      <tr class="hl"><th>Roční úspora</th><td class="pos">${_fmtKc(d.uspora)}</td></tr>
      <tr><th>Investice celkem</th><td>${_fmtKc(d.investice_prumer)}</td></tr>
      ${d.dotace > 0 ? `<tr><th>Dotace NZÚ</th><td class="pos">- ${_fmtKc(d.dotace)}</td></tr>` : ''}
      <tr><th>Investice po dotaci</th><td>${_fmtKc(d.investice_po_dotaci)}</td></tr>
      <tr class="hl"><th>Návratnost</th><td>${_fmtNav(d.navratnost)}</td></tr>
    </table>
  </div>`;
}

function _sKGJ(c) {
  const d = c.kogenerace;
  if (!d?.vykon_kwh && !d?.investice) return '';
  return `
  <div class="section">
    <h2>⚡ Kogenerační jednotka (KGJ)</h2>
    <table class="dt">
      ${d.vykon_kwh ? `<tr><th>Elektrický výkon</th><td>${d.vykon_kwh} kWe</td></tr>` : ''}
      ${d.vykon_kwt ? `<tr><th>Tepelný výkon</th><td>${d.vykon_kwt} kWt</td></tr>` : ''}
      <tr class="hl"><th>Roční úspora</th><td class="pos">${_fmtKc(d.uspora_kc)}</td></tr>
      <tr><th>Investice</th><td>${_fmtKc(d.investice)}</td></tr>
      <tr><th>Návratnost</th><td>${_fmtNav(d.navratnost)}</td></tr>
    </table>
  </div>`;
}

function _sKotel(c) {
  const d = c.kotel;
  if (!d?.potreba_mwh) return '';
  return `
  <div class="section">
    <h2>🔥 Plynový kondenzační kotel</h2>
    <table class="dt">
      <tr><th>Roční potřeba tepla</th><td>${_fmtMwh(d.potreba_mwh)}</td></tr>
      <tr><th>Stávající náklady</th><td>${_fmtKc(d.naklad_stavajici)}</td></tr>
      <tr><th>Náklady s kondenzačním kotlem</th><td>${_fmtKc(d.naklad_kotel)}</td></tr>
      <tr class="hl"><th>Roční úspora</th><td class="pos">${_fmtKc(d.uspora)}</td></tr>
      <tr><th>Investice</th><td>${_fmtKc(d.investice)}</td></tr>
      <tr><th>Návratnost</th><td>${_fmtNav(d.navratnost)}</td></tr>
    </table>
  </div>`;
}

function _sTeplo(c) {
  const d = c.teplo;
  if (!d?.celkem_mwh) return '';
  const stavBilance = d.rozdil_pct > 5 ? '⚠️ Naddimenzováno' :
                      d.rozdil_pct < -5 ? '⚠️ Poddimenzováno' : '✅ Bilance v pořádku';
  return `
  <div class="section">
    <h2>🌡️ Tepelná bilance objektu</h2>
    <table class="dt">
      <tr><th>Tepelná ztráta objektu</th><td>${d.ztrata_kw ? d.ztrata_kw + ' kW' : '—'}</td></tr>
      <tr><th>Potřeba tepla – vytápění</th><td>${_fmtMwh(d.vytapeni_mwh)}</td></tr>
      <tr><th>Potřeba tepla – TUV</th><td>${_fmtMwh(d.tuv_mwh)}</td></tr>
      <tr><th>Ztráty rozvodů</th><td>${d.ztraty_pct || 0} % (${_fmtMwh(d.ztraty_mwh)})</td></tr>
      <tr class="hl"><th>Celková potřeba tepla</th><td>${_fmtMwh(d.celkem_mwh)}</td></tr>
      <tr><th>Zdroje tepla celkem</th><td>${_fmtMwh(d.soucet_zdroju)}</td></tr>
      <tr><th>Stav bilance</th><td>${stavBilance}</td></tr>
    </table>
  </div>`;
}

function _sTeplarna(c) {
  const d = c.teplarna;
  if (!d?.mwh_czt && !d?.naklady_czt) return '';
  return `
  <div class="section">
    <h2>🏭 Teplárna / CZT</h2>
    <table class="dt">
      <tr><th>Odběr z CZT</th><td>${_fmtMwh(d.mwh_czt)}</td></tr>
      <tr><th>Cena tepla CZT</th><td>${d.cena_czt_gj ? d.cena_czt_gj + ' Kč/GJ' : '—'}</td></tr>
      <tr><th>Roční náklady CZT</th><td>${_fmtKc(d.naklady_czt)}</td></tr>
      ${d.uspora ? `<tr class="hl"><th>Úspora při přechodu na vlastní zdroj</th><td class="pos">${_fmtKc(d.uspora)}</td></tr>` : ''}
    </table>
  </div>`;
}

// ─── Souhrnná tabulka ────────────────────────────────────────────────────────

function _sSouhrn(c) {
  const aktModuly = OEES_STATE.aktivniModuly || [];
  const vylouCit  = new Set(['objekt','vysledky','prilohy','poznamky','financovani','dotace','teplo']);

  const modDef = {
    elektrina:  { lbl: '⚡ Elektřina',           inv: () => 0,                          usp: () => c.elektrina?.vysledek?.uspora_kc_rok,   nav: () => null },
    distribuce: { lbl: '📈 Distribuce',           inv: () => 0,                          usp: () => c.distribuce?.vysledek?.uspora_kc_rok,  nav: () => null },
    voda:       { lbl: '💧 Voda / TUV',           inv: () => c.voda?.investice,          usp: () => c.voda?.uspora_celkem,                  nav: () => c.voda?.navratnost },
    fve:        { lbl: '☀️ FVE',                  inv: () => c.fve?.vysledek?.investice_kc, usp: () => c.fve?.vysledek?.rocni_prinos_r1,   nav: () => c.fve?.vysledek?.navratnost_let },
    tc:         { lbl: '❄️ Tepelné čerpadlo',     inv: () => c.tc?.investice_po_dotaci,  usp: () => c.tc?.uspora,                           nav: () => c.tc?.navratnost },
    kogenerace: { lbl: '⚡ KGJ',                  inv: () => c.kogenerace?.investice,    usp: () => c.kogenerace?.uspora_kc,                nav: () => c.kogenerace?.navratnost },
    kotel:      { lbl: '🔥 Plynový kotel',        inv: () => c.kotel?.investice,         usp: () => c.kotel?.uspora,                        nav: () => c.kotel?.navratnost },
    baterie:    { lbl: '🔋 Bateriové úložiště',   inv: () => c.baterie?.investice,       usp: () => c.baterie?.uspora,                      nav: () => c.baterie?.navratnost },
    ev:         { lbl: '🚗 Nabíječka EV',         inv: () => c.ev?.investice,            usp: () => c.ev?.uspora,                           nav: () => c.ev?.navratnost },
    inteligentni: { lbl: '🤖 Inteligentní řízení', inv: () => c.inteligentni?.investice, usp: () => c.inteligentni?.uspora,                 nav: () => c.inteligentni?.navratnost },
    teplarna:   { lbl: '🏭 Teplárna CZT',         inv: () => 0,                          usp: () => c.teplarna?.uspora,                     nav: () => c.teplarna?.navratnost },
  };

  let totalInv = 0, totalUsp = 0;
  const rows = [];

  aktModuly.forEach(m => {
    if (vylouCit.has(m.id)) return;
    const def = modDef[m.id];
    if (!def) return;
    const inv = def.inv() || 0;
    const usp = def.usp() || 0;
    if (!usp && !inv) return;
    totalInv += inv;
    totalUsp += usp;
    const navTxt = def.nav()
      ? _fmtNav(def.nav())
      : (inv === 0 && usp > 0 ? 'ihned' : '—');
    rows.push(`<tr>
      <td>${def.lbl}</td>
      <td class="num">${inv > 0 ? _fmtKc(inv) : '—'}</td>
      <td class="num pos">${usp > 0 ? _fmtKc(usp) : '—'}</td>
      <td class="num">${navTxt}</td>
    </tr>`);
  });

  if (rows.length === 0) return '';

  const navCelkem = totalInv > 0 && totalUsp > 0
    ? _fmtNav(totalInv / totalUsp)
    : (totalUsp > 0 ? 'ihned' : '—');

  return `
  <div class="section">
    <h2>📊 Přehled doporučených technologií</h2>
    <table class="dt souhrn-table">
      <thead><tr>
        <th>Technologie</th>
        <th class="num">Investice (Kč)</th>
        <th class="num">Roční úspora (Kč)</th>
        <th class="num">Návratnost</th>
      </tr></thead>
      <tbody>${rows.join('\n')}</tbody>
      <tfoot><tr>
        <td>CELKEM</td>
        <td class="num">${_fmtKc(totalInv)}</td>
        <td class="num pos">${_fmtKc(totalUsp)}</td>
        <td class="num">${navCelkem}</td>
      </tr></tfoot>
    </table>
  </div>`;
}

// ─── Přílohy sekce ───────────────────────────────────────────────────────────

function _sPrilohy(typ) {
  const prilohy = OEES_STATE.case?.prilohy;
  if (!prilohy) return '';
  const fl = prilohy.filter(p => p.nazev && (typ === 'predbezna' ? p.predbezna : p.finalni));
  if (fl.length === 0) return '';

  const items = fl.map((p, i) => {
    const href = p.url ? ` – <a href="${p.url}" target="_blank">${p.url.length > 70 ? p.url.substring(0, 70) + '…' : p.url}</a>` : '';
    return `<li style="padding:7px 0;border-bottom:1px solid #eee">
      <strong>Příloha ${p.pismeno || i + 1}:</strong> ${p.nazev}${href}
    </li>`;
  }).join('\n');

  return `
  <div class="section">
    <h2>📎 Přílohy (${fl.length})</h2>
    <ul class="prilohy-list">${items}</ul>
  </div>`;
}

// ─── Obsah dokumentu (TOC) ───────────────────────────────────────────────────

function _sTOC(c, typ) {
  const aktModuly = OEES_STATE.aktivniModuly || [];
  const skip = new Set(['objekt','vysledky','prilohy','poznamky','financovani','dotace']);
  const polozky = aktModuly
    .filter(m => !skip.has(m.id))
    .map(m => `<li>${m.label}</li>`)
    .join('');

  const prilohy = (c.prilohy || []).filter(p => p.nazev && (typ === 'predbezna' ? p.predbezna : p.finalni));
  const poznamky = c.poznamky?.studie || '';

  return `
  <div class="toc">
    <h2>Obsah</h2>
    <ol>
      <li>Přehled doporučených technologií</li>
      ${polozky}
      ${prilohy.length > 0 ? '<li>Přílohy</li>' : ''}
    </ol>
    ${poznamky ? `<div class="note-box"><strong>Poznámky poradce:</strong><br>${poznamky.replace(/\n/g, '<br>')}</div>` : ''}
  </div>`;
}

// ─── Sestavení celého dokumentu ──────────────────────────────────────────────

function _sUpresneniFinalni(c) {
  const u = c.upresneni || {};
  const moduly = OEES_STATE.aktivniModuly || [];

  // Etikety modulů pro zobrazení
  const labels = {
    fve: '☀️ FVE – Fotovoltaická elektrárna',
    tc: '❄️ Tepelné čerpadlo',
    kogenerace: '⚡ Kogenerační jednotka',
    kotel: '🔥 Plynový kotel',
    voda: '💧 Ohřev teplé vody',
    ev: '🔌 Nabíječka elektromobilů',
    baterie: '🔋 Bateriové úložiště',
    inteligentni: '🧠 Inteligentní řízení',
    distribuce: '📊 Optimalizace distribuce'
  };

  // Sestavíme řádky pro aktivní moduly s upresneni daty
  const radky = [];
  let celkemPre = 0, celkemFin = 0;

  for (const mod of moduly) {
    const lbl = labels[mod.id];
    if (!lbl) continue;
    const upMod = u[mod.id] || {};
    // Předběžná hodnota – z UPRESNENI_DEF.investiceKey nebo přímá cesta
    let preVal = null;
    if (typeof UPRESNENI_DEF !== 'undefined' && UPRESNENI_DEF[mod.id]?.investiceKey) {
      try { preVal = UPRESNENI_DEF[mod.id].investiceKey(); } catch (e) { preVal = null; }
    }
    const finVal = upMod.celkem != null && upMod.celkem !== '' ? parseFloat(upMod.celkem) : null;

    if (preVal == null && finVal == null) continue;
    if (preVal != null) celkemPre += preVal;
    if (finVal != null) celkemFin += finVal;

    radky.push(`
      <tr>
        <td>${lbl}</td>
        <td style="text-align:right">${_fmtKc(preVal)}</td>
        <td style="text-align:right;font-weight:600;color:#1a6b2a">${finVal != null ? _fmtKc(finVal) : '<span style="opacity:0.5">—</span>'}</td>
      </tr>
    `);
  }

  if (radky.length === 0) return '';

  // VIP sleva a náklady ES
  const vipPct   = parseFloat(u.vip_sleva_pct) || 0;
  const nakladyES = parseFloat(u.naklady_es)   || 0;
  const sleva    = celkemFin > 0 && vipPct > 0 ? celkemFin * vipPct / 100 : 0;
  const celkemPoSlevě = celkemFin - sleva + nakladyES;

  const poznamkyHtml = u.do_studie && u.poznamky
    ? `<div style="margin-top:16px;padding:12px;background:#f5f9f5;border-left:3px solid #2e7d32;border-radius:4px;font-size:0.9rem">
        <strong>📝 Poznámky poradce:</strong><br>${u.poznamky.replace(/\n/g, '<br>')}
       </div>`
    : '';

  return `
  <section class="section">
    <h2>Finální přehled investic</h2>
    <p style="font-size:0.9rem;opacity:0.75;margin-bottom:16px">
      Hodnoty upřesněné energetickým poradcem na základě předběžné analýzy.
    </p>
    <table class="dt">
      <thead>
        <tr>
          <th>Technologie / opatření</th>
          <th style="text-align:right;width:150px">Předběžná investice</th>
          <th style="text-align:right;width:150px">Finální investice</th>
        </tr>
      </thead>
      <tbody>
        ${radky.join('')}
        <tr style="border-top:2px solid #ddd;font-weight:700">
          <td>Celkem investice</td>
          <td style="text-align:right">${celkemPre > 0 ? _fmtKc(celkemPre) : '—'}</td>
          <td style="text-align:right;color:#1a6b2a">${celkemFin > 0 ? _fmtKc(celkemFin) : '—'}</td>
        </tr>
        ${vipPct > 0 ? `
        <tr>
          <td>VIP sleva (${vipPct} %)</td>
          <td></td>
          <td style="text-align:right;color:#c62828">- ${_fmtKc(sleva)}</td>
        </tr>` : ''}
        ${nakladyES > 0 ? `
        <tr>
          <td>Náklady na zpracování ES</td>
          <td></td>
          <td style="text-align:right">${_fmtKc(nakladyES)}</td>
        </tr>` : ''}
        ${(vipPct > 0 || nakladyES > 0) ? `
        <tr style="font-weight:700;background:#f0f7f0">
          <td>Celkem po úpravách</td>
          <td></td>
          <td style="text-align:right;color:#1a6b2a">${_fmtKc(celkemPoSlevě)}</td>
        </tr>` : ''}
      </tbody>
    </table>
    ${poznamkyHtml}
  </section>`;
}

function _sestavStudii(typ) {
  const c    = OEES_STATE.case;
  const obj  = _sberiObjekt();
  const isPre = typ === 'predbezna';
  const typLabel = isPre ? 'PŘEDBĚŽNÁ' : 'FINÁLNÍ';
  const typTitle = isPre ? 'Předběžná energetická studie' : 'Finální energetická studie';

  const realAdr = obj.real_adresa && obj.real_adresa !== obj.sidlo ? obj.real_adresa : null;

  const sekce = [
    _sSouhrn(c),
    !isPre ? _sUpresneniFinalni(c) : null,
    _sElektrina(c),
    _sFVE(c),
    _sVoda(c),
    _sTC(c),
    _sKGJ(c),
    _sKotel(c),
    _sTeplo(c),
    _sTeplarna(c),
    _sPrilohy(typ)
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${typTitle} – ${obj.nazev}</title>
  ${_studieCss()}
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Tisk / PDF</button>

  <div class="page">

    <!-- ═══════════════════════════════════════
         TITULNÍ STRANA
    ═══════════════════════════════════════ -->
    <div class="title-page">
      <div class="logo-bar">
        <div class="logo-brand">Na<span>Energie</span>.cz</div>
        <div class="badge${isPre ? '' : ' fin'}">${typLabel} ENERGETICKÁ STUDIE</div>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
        <h1 class="main-title">${typTitle}</h1>
        <div class="subtitle">Analýza úspor energie a optimalizace nákladů</div>

        <div class="klient-box">
          <table>
            <tr><td>Subjekt:</td><td><strong>${obj.nazev}</strong></td></tr>
            ${obj.ico       ? `<tr><td>IČO:</td><td>${obj.ico}</td></tr>` : ''}
            ${obj.sidlo     ? `<tr><td>Sídlo:</td><td>${obj.sidlo}</td></tr>` : ''}
            ${realAdr       ? `<tr><td>Místo realizace:</td><td>${realAdr}</td></tr>` : ''}
            ${obj.kontakt   ? `<tr><td>Kontakt klienta:</td><td>${obj.kontakt}${obj.email ? ', ' + obj.email : ''}${obj.telefon ? ', ' + obj.telefon : ''}</td></tr>` : ''}
            <tr><td>Datum zpracování:</td><td>${_dnes()}</td></tr>
            <tr><td>Platnost studie:</td><td>${_platnost()}</td></tr>
          </table>
        </div>
      </div>

      <div class="footer-info">
        <div>
          <strong>Energetický poradce:</strong> ${obj.ep_jmeno}<br>
          ${obj.ep_email} &nbsp;|&nbsp; ${obj.ep_telefon}
        </div>
        <div style="text-align:right">
          <strong>NaEnergie.cz s.r.o.</strong><br>
          Brno, Jihomoravský kraj<br>
          naenergie.cz
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════
         OBSAH
    ═══════════════════════════════════════ -->
    ${_sTOC(c, typ)}

    <!-- ═══════════════════════════════════════
         SEKCE
    ═══════════════════════════════════════ -->
    ${sekce}

    <div class="doc-footer">
      Tato ${typLabel.toLowerCase()} energetická studie byla zpracována systémem OEES (NaEnergie.cz s.r.o.) dne ${_dnes()}.
      Studie je platná do ${_platnost()}.
      Veškeré výpočty jsou orientační. Pro závaznou nabídku kontaktujte energetického poradce.
    </div>

  </div>
</body>
</html>`;
}

// ─── Veřejné funkce (volané z app.js / index.html) ──────────────────────────

function generujStudii() {
  const html = _sestavStudii('predbezna');
  const w = window.open('', '_blank');
  if (!w) { alert('Povolte pop-up okna pro tento web (nahoře v adresním řádku) a zkuste znovu.'); return; }
  w.document.write(html);
  w.document.close();
  // Zaznamenej do stavu pro dashboard
  OEES_STATE.case._studie_predbezna = new Date().toISOString();
}

function generujFinalniStudii() {
  const html = _sestavStudii('finalni');
  const w = window.open('', '_blank');
  if (!w) { alert('Povolte pop-up okna pro tento web (nahoře v adresním řádku) a zkuste znovu.'); return; }
  w.document.write(html);
  w.document.close();
  // Zaznamenej do stavu pro dashboard
  OEES_STATE.case._studie_finalni = new Date().toISOString();
}

function otevritUpresneniStudie() {
  // Přeskočí na záložku Upřesnění studie
  const kroky = OEES_STATE.aktivniModuly || [];
  for (let i = 0; i < kroky.length; i++) {
    if (kroky[i].id === 'upresneni') {
      prejiNaKrokIndex(i);
      return;
    }
  }
  // Fallback – záložka Přílohy
  for (let i = 0; i < kroky.length; i++) {
    if (kroky[i].id === 'prilohy') {
      prejiNaKrokIndex(i);
      return;
    }
  }
  alert('Upřesnění studie nenalezeno – zkontrolujte konfiguraci záložek.');
}
