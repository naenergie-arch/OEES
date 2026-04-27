/**
 * OEES – Dashboard pro vedení
 * Přehled aktuálního případu: KPI karty, technologie, graf úspor, stav studie
 */

'use strict';

// ─── Definice modulů pro dashboard ──────────────────────────────────────────

const DASH_DEF = {
  elektrina:    { icon: '⚡', label: 'Elektřina – optimalizace', color: '#facc15',
    inv: c => null,
    usp: c => { const v = c.elektrina?.vysledek; return v?.uspora_rok_kc || null; },
    mwh: c => { const v = c.elektrina?.vysledek; if (!v) return null; return v.uspora_mwh_rok || (v.uspora_kwh_rok || 0) / 1000 || null; },
    nav: c => null,
    tag: c => null },

  distribuce:   { icon: '📊', label: 'Optimalizace distribuce', color: '#94a3b8',
    inv: c => c.distribuce?.vysledek?.investice_kc || null,
    usp: c => c.distribuce?.vysledek?.uspora_rok_kc || null,
    mwh: c => null,
    nav: c => c.distribuce?.vysledek?.navratnost_let || null,
    tag: c => null },

  fve:          { icon: '☀️', label: 'FVE – Fotovoltaika', color: '#fbbf24',
    inv: c => c.fve?.vysledek?.investice_kc || null,
    usp: c => c.fve?.vysledek?.uspora_rok_kc || null,
    mwh: c => { const v = c.fve?.vysledek; return v ? (v.uspora_kwh_rok || 0) / 1000 || null : null; },
    nav: c => c.fve?.vysledek?.navratnost_let || null,
    tag: c => c.fve?.vysledek?.vykon_kwp ? `${(+c.fve.vysledek.vykon_kwp).toFixed(1)} kWp` : null },

  tc:           { icon: '❄️', label: 'Tepelné čerpadlo', color: '#38bdf8',
    inv: c => c.tc?.investice_po_dotaci || c.tc?.vstup?.investice_kc || null,
    usp: c => c.tc?.uspora_rok_kc || null,
    mwh: c => null,
    nav: c => c.tc?.navratnost_let || null,
    tag: c => null },

  kogenerace:   { icon: '⚙️', label: 'Kogenerační jednotka', color: '#f97316',
    inv: c => c.kogenerace?.vysledek?.investice || null,
    usp: c => c.kogenerace?.vysledek?.uspora_rok_kc || null,
    mwh: c => { const v = c.kogenerace?.vysledek; return v?.vykon_kwe ? v.vykon_kwe * 8000 / 1000 : null; },
    nav: c => c.kogenerace?.vysledek?.navratnost || null,
    tag: c => { const v = c.kogenerace?.vysledek; return v?.vykon_kwe ? `${v.vykon_kwe} kWe` : null; } },

  kotel:        { icon: '🔥', label: 'Plynový kotel', color: '#fb923c',
    inv: c => c.kotel?.vysledek?.investice || null,
    usp: c => c.kotel?.vysledek?.uspora_rok_kc || null,
    mwh: c => null,
    nav: c => c.kotel?.vysledek?.navratnost || null,
    tag: c => null },

  teplarna:     { icon: '🏭', label: 'Teplárna (CZT)', color: '#a16207',
    inv: c => c.teplarna?.vysledek?.investice_kc || null,
    usp: c => c.teplarna?.vysledek?.uspora_rok_kc || null,
    mwh: c => null,
    nav: c => c.teplarna?.vysledek?.navratnost_let || null,
    tag: c => null },

  voda:         { icon: '💧', label: 'Ohřev teplé vody (TUV)', color: '#22d3ee',
    inv: c => c.voda?.investice_kc || null,
    usp: c => c.voda?.uspora_kc_rok || c.voda?.uspora_teplo_kc || null,
    mwh: c => c.voda?.uspora_teplo_tuv_mwh || null,
    nav: c => c.voda?.navratnost_let || null,
    tag: c => null },

  baterie:      { icon: '🔋', label: 'Bateriové úložiště', color: '#a78bfa',
    inv: c => c.baterie?.vysledek?.investice_kc || null,
    usp: c => c.baterie?.vysledek?.uspora_rok_kc || null,
    mwh: c => null,
    nav: c => c.baterie?.vysledek?.navratnost_let || null,
    tag: c => { const v = c.baterie?.vysledek; return v?.kapacita_kwh ? `${v.kapacita_kwh} kWh` : null; } },

  ev:           { icon: '🔌', label: 'Nabíječka elektromobilů', color: '#4ade80',
    inv: c => c.ev?.vysledek?.investice_kc || null,
    usp: c => c.ev?.vysledek?.uspora_rok_kc || null,
    mwh: c => null,
    nav: c => c.ev?.vysledek?.navratnost_let || null,
    tag: c => null },

  inteligentni: { icon: '🧠', label: 'Inteligentní řízení', color: '#c084fc',
    inv: c => c.inteligentni?.vysledek?.investice_kc || null,
    usp: c => c.inteligentni?.vysledek?.uspora_rok_kc || null,
    mwh: c => null,
    nav: c => c.inteligentni?.vysledek?.navratnost_let || null,
    tag: c => null },
};

// ─── Inicializace a render ───────────────────────────────────────────────────

function inicializujModulDashboard(containerId) {
  renderDashboard(containerId);
}

function refreshDashboard() {
  const m = (OEES_STATE.aktivniModuly || []).find(x => x.id === 'dashboard');
  if (m && m.containerId) renderDashboard(m.containerId);
}

function renderDashboard(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const c    = OEES_STATE.case;
  const nazev = document.getElementById('o_nazev')?.value?.trim()
              || c.objekt?.nazev || '— název firmy nevyplněn —';
  const dnes = new Date().toLocaleDateString('cs-CZ',
    { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Agregace dat z aktivních modulů ────────────────────────────────────────
  let celkemInv = 0, celkemUsp = 0, celkemMwh = 0;
  const navRet = [];
  const modulyData = [];

  for (const mod of (OEES_STATE.aktivniModuly || [])) {
    const def = DASH_DEF[mod.id];
    if (!def) continue;

    let inv, usp, mwh, nav, tag;
    try { inv = def.inv(c) || null; } catch (e) { inv = null; }
    try { usp = def.usp(c) || null; } catch (e) { usp = null; }
    try { mwh = def.mwh(c) || null; } catch (e) { mwh = null; }
    try { nav = def.nav(c) || null; } catch (e) { nav = null; }
    try { tag = def.tag(c) || null; } catch (e) { tag = null; }

    // Preferuj upřesněné hodnoty (pokud poradce doplnil)
    const uInv = parseFloat(c.upresneni?.[mod.id]?.celkem) || null;
    const finalInv = uInv || inv;

    if (!usp && !finalInv) continue;

    if (finalInv > 0) celkemInv += finalInv;
    if (usp > 0)       celkemUsp += usp;
    if (mwh > 0)       celkemMwh += mwh;
    if (nav > 0 && nav < 50) navRet.push(nav);

    modulyData.push({ id: mod.id, def, inv: finalInv, usp, mwh, nav, tag,
                      jeUpresnen: !!(uInv && uInv !== inv) });
  }

  const avgNav = navRet.length ? navRet.reduce((a,b) => a+b, 0) / navRet.length : null;
  const maxUsp  = Math.max(...modulyData.map(m => m.usp || 0), 1);

  // ── Stav průběhu ───────────────────────────────────────────────────────────
  const hasObjekt     = !!document.getElementById('o_nazev')?.value?.trim();
  const hasPredbezna  = !!c._studie_predbezna;
  const hasUpresneni  = Object.keys(c.upresneni || {}).some(k => {
    const u = c.upresneni[k];
    return u && (parseFloat(u.celkem) > 0 || Object.keys(u.polozky || {}).length > 0);
  });
  const hasFinalni    = !!c._studie_finalni;

  // ── Render ─────────────────────────────────────────────────────────────────
  el.innerHTML = `
<div style="font-family:inherit;max-width:1100px">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;
    margin-bottom:28px;flex-wrap:wrap;gap:12px">
    <div>
      <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.08em;
        opacity:0.5;margin-bottom:4px">OEES · NaEnergie.cz</div>
      <h2 style="margin:0;font-size:1.5rem;font-weight:700">📊 Dashboard</h2>
      <div style="margin-top:6px;font-size:0.9rem;opacity:0.65">${_dashEsc(nazev)}&ensp;·&ensp;${dnes}</div>
    </div>
    <button onclick="refreshDashboard()"
      style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);
        color:inherit;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:0.84rem;
        white-space:nowrap;transition:background 0.2s"
      onmouseover="this.style.background='rgba(255,255,255,0.12)'"
      onmouseout="this.style.background='rgba(255,255,255,0.07)'">
      🔄 Obnovit data
    </button>
  </div>

  <!-- KPI KARTY -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
    gap:14px;margin-bottom:28px">
    ${_dashKpi('💰','Celková investice',
        celkemInv > 0 ? _dashMil(celkemInv) : '—',
        celkemInv > 0 ? 'Kč' : 'zatím nevyplněno', '#3b82f6')}
    ${_dashKpi('📈','Roční úspory',
        celkemUsp > 0 ? _dashMil(celkemUsp) : '—',
        celkemUsp > 0 ? 'Kč / rok' : 'zatím nevyplněno', '#22c55e')}
    ${_dashKpi('⚡','Energetické úspory',
        celkemMwh > 0.1 ? celkemMwh.toFixed(0) : '—',
        celkemMwh > 0.1 ? 'MWh / rok' : 'zatím nevyplněno', '#f59e0b')}
    ${_dashKpi('📅','Průměrná návratnost',
        avgNav ? avgNav.toFixed(1) : '—',
        avgNav ? 'let' : 'zatím nevyplněno', '#a78bfa')}
  </div>

  <!-- TECHNOLOGIE -->
  <div class="card" style="margin-bottom:20px;padding:22px 24px">
    <div class="card-title" style="margin-bottom:18px">
      <span class="icon">🔧</span> Technologie &amp; opatření
      <span style="font-size:0.75rem;font-weight:400;opacity:0.5;margin-left:12px">
        ${modulyData.length} aktivní${modulyData.length === 1 ? '' : 'ch'} módulů
      </span>
    </div>

    ${modulyData.length === 0
      ? `<p style="opacity:0.45;text-align:center;padding:24px 0">
           Žádná data. Vyplňte energetické moduly a vypočtěte výsledky.
         </p>`
      : `<div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;font-size:0.86rem;min-width:580px">
          <thead>
            <tr style="background:rgba(255,255,255,0.055);font-size:0.73rem;
              text-transform:uppercase;letter-spacing:0.05em;color:rgba(255,255,255,0.55)">
              <th style="padding:10px 14px;text-align:left;border-radius:6px 0 0 0">Technologie</th>
              <th style="padding:10px 14px;text-align:right">Investice</th>
              <th style="padding:10px 14px;text-align:right">Úspora / rok</th>
              <th style="padding:10px 14px;text-align:right">Energie</th>
              <th style="padding:10px 14px;text-align:right">Návratnost</th>
              <th style="padding:10px 14px;text-align:left;min-width:130px;border-radius:0 6px 0 0">Podíl úspor</th>
            </tr>
          </thead>
          <tbody>
            ${modulyData.map((m, idx) => {
              const barPct = m.usp > 0 ? Math.min(100, Math.round(m.usp / maxUsp * 100)) : 0;
              const isLast = idx === modulyData.length - 1;
              return `
              <tr style="border-bottom:${isLast ? 'none' : '1px solid rgba(255,255,255,0.05)'}">
                <td style="padding:11px 14px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:1.2rem;line-height:1">${m.def.icon}</span>
                    <div>
                      <div style="font-weight:600">${m.def.label}</div>
                      ${m.tag ? `<div style="font-size:0.74rem;opacity:0.5;margin-top:2px">${m.tag}</div>` : ''}
                      ${m.jeUpresnen ? `<div style="font-size:0.7rem;color:#86efac;margin-top:2px">✓ upřesněno poradcem</div>` : ''}
                    </div>
                  </div>
                </td>
                <td style="padding:11px 14px;text-align:right;color:#60a5fa;white-space:nowrap">
                  ${m.inv > 0 ? _dashKc(m.inv) : '<span style="opacity:0.3">—</span>'}
                </td>
                <td style="padding:11px 14px;text-align:right;color:#4ade80;font-weight:600;white-space:nowrap">
                  ${m.usp > 0 ? _dashKc(m.usp) : '<span style="opacity:0.3">—</span>'}
                </td>
                <td style="padding:11px 14px;text-align:right;opacity:0.75;white-space:nowrap">
                  ${m.mwh > 0 ? m.mwh.toFixed(1) + ' MWh' : '<span style="opacity:0.3">—</span>'}
                </td>
                <td style="padding:11px 14px;text-align:right;opacity:0.75;white-space:nowrap">
                  ${m.nav > 0 ? (m.nav > 50 ? '> 50 let' : m.nav.toFixed(1) + ' let') : '<span style="opacity:0.3">—</span>'}
                </td>
                <td style="padding:11px 14px">
                  <div style="display:flex;align-items:center;gap:8px">
                    <div style="flex:1;background:rgba(255,255,255,0.08);border-radius:4px;height:7px;min-width:60px">
                      <div style="height:100%;width:${barPct}%;border-radius:4px;
                        background:linear-gradient(90deg,${m.def.color},${m.def.color}88);
                        transition:width 0.7s ease"></div>
                    </div>
                    <span style="font-size:0.74rem;opacity:0.55;width:28px;text-align:right">${barPct}%</span>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
          ${(celkemInv > 0 || celkemUsp > 0) ? `
          <tfoot>
            <tr style="background:rgba(255,255,255,0.04);font-weight:700;
              border-top:2px solid rgba(255,255,255,0.12)">
              <td style="padding:11px 14px">
                CELKEM
                ${hasUpresneni ? '<span style="font-size:0.72rem;color:#86efac;font-weight:400;margin-left:8px">část hodnot upřesněna</span>' : ''}
              </td>
              <td style="padding:11px 14px;text-align:right;color:#60a5fa">
                ${celkemInv > 0 ? _dashKc(celkemInv) : '—'}
              </td>
              <td style="padding:11px 14px;text-align:right;color:#4ade80">
                ${celkemUsp > 0 ? _dashKc(celkemUsp) : '—'}
              </td>
              <td style="padding:11px 14px;text-align:right;opacity:0.75">
                ${celkemMwh > 0.1 ? celkemMwh.toFixed(0) + ' MWh' : '—'}
              </td>
              <td style="padding:11px 14px;text-align:right;opacity:0.75">
                ${avgNav ? avgNav.toFixed(1) + ' let' : '—'}
              </td>
              <td></td>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>`}
  </div>

  <!-- PRŮBĚH ZPRACOVÁNÍ -->
  <div class="card" style="margin-bottom:24px;padding:22px 28px">
    <div class="card-title" style="margin-bottom:22px">
      <span class="icon">📋</span> Průběh zpracování případu
    </div>
    <div style="display:flex;align-items:center;gap:0;overflow-x:auto;padding-bottom:4px">
      ${_dashPipe('📝','Formulář\nvyplněn',    hasObjekt,    true)}
      ${_dashArrow(hasObjekt)}
      ${_dashPipe('📄','Předběžná\nstudie',    hasPredbezna, false)}
      ${_dashArrow(hasPredbezna)}
      ${_dashPipe('📋','Upřesnění\nporadcem',  hasUpresneni, false)}
      ${_dashArrow(hasUpresneni)}
      ${_dashPipe('📖','Finální\nstudie',      hasFinalni,   false)}
    </div>
  </div>

  <!-- AKCE -->
  <div class="btn-row" style="flex-wrap:wrap;gap:10px">
    <button class="btn btn-primary" onclick="generujStudii()"
      title="Vygeneruje předběžnou studii (nové okno → Ctrl+P pro PDF)">
      📄 Předběžná studie
    </button>
    <button class="btn btn-secondary" onclick="otevritUpresneniStudie()"
      title="Přejde na záložku Upřesnění">
      📋 Upřesnění studie
    </button>
    <button class="btn btn-secondary" onclick="generujFinalniStudii()"
      title="Vygeneruje finální studii se všemi upřesněnými hodnotami">
      📖 Finální studie
    </button>
  </div>

</div>`;
}

// ─── Render helpers ──────────────────────────────────────────────────────────

function _dashEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _dashKc(v) {
  if (!v || isNaN(v)) return '—';
  return new Intl.NumberFormat('cs-CZ').format(Math.round(v)) + ' Kč';
}

function _dashMil(v) {
  if (!v || isNaN(v)) return '—';
  if (v >= 1000000) return (v / 1000000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' mil.';
  if (v >= 1000)    return Math.round(v / 1000) + ' tis.';
  return Math.round(v).toString();
}

function _dashKpi(icon, label, value, unit, color) {
  return `
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);
    border-radius:14px;padding:20px 22px;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color};
      border-radius:14px 14px 0 0;opacity:0.85"></div>
    <div style="font-size:1.5rem;margin-bottom:6px;line-height:1">${icon}</div>
    <div style="font-size:0.71rem;text-transform:uppercase;letter-spacing:0.06em;
      opacity:0.5;margin-bottom:8px">${label}</div>
    <div style="font-size:1.75rem;font-weight:800;color:${color};
      line-height:1;letter-spacing:-0.02em">${value}</div>
    <div style="font-size:0.78rem;opacity:0.5;margin-top:5px">${unit}</div>
  </div>`;
}

function _dashPipe(icon, label, done, isFirst) {
  const clr   = done ? '#22c55e' : 'rgba(255,255,255,0.12)';
  const tclr  = done ? '#22c55e' : 'rgba(255,255,255,0.35)';
  const bg    = done ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)';
  const lines = label.split('\n');
  return `
  <div style="display:flex;flex-direction:column;align-items:center;min-width:96px;text-align:center">
    <div style="width:48px;height:48px;border-radius:50%;background:${bg};
      border:2px solid ${clr};display:flex;align-items:center;justify-content:center;
      font-size:${done ? '1.2rem' : '1.3rem'};transition:all 0.3s">
      ${done ? '✅' : icon}
    </div>
    <div style="margin-top:9px;font-size:0.73rem;color:${tclr};line-height:1.5">
      ${lines.map(l => `<div>${l}</div>`).join('')}
    </div>
  </div>`;
}

function _dashArrow(lit) {
  return `<div style="flex:1;min-width:14px;height:2px;margin-bottom:24px;
    background:${lit ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}"></div>`;
}
