/**
 * OEES Modul: Upřesnění finální studie
 *
 * Zobrazuje dvousloupcové srovnání Předběžná vs Finální pro každý
 * aktivní modul s investičními náklady. Poradce přepíše/doplní
 * finální hodnoty → finální studie je generována z těchto dat.
 *
 * Struktura dle Excel V15 záložka „Upřesnění finální studie"
 */

'use strict';

// ─── Definice položkových rozpočtů pro každý modul ──────────────────────────

const UPRESNENI_DEF = {
  fve: {
    label: '☀️ FVE – Fotovoltaická elektrárna',
    investiceKey: () => OEES_STATE.case.fve?.vysledek?.investice_kc,
    polozky: [
      { key: 'baterie',       label: 'Baterie' },
      { key: 'panely',        label: 'FVE panely' },
      { key: 'rozvodace',     label: 'AC/DC rozvaděče' },
      { key: 'kabelove',      label: 'AC/DC kabelové trasy' },
      { key: 'konstrukce',    label: 'Konstrukce' },
      { key: 'instalace',     label: 'Instalace, montáž a doprava' },
      { key: 'administrativa',label: 'Administrativa (revize, UTP)' },
      { key: 'optimizery',    label: 'Optimizéry / odpojovače' },
    ]
  },
  tc: {
    label: '❄️ Tepelné čerpadlo',
    investiceKey: () => OEES_STATE.case.tc?.investice_po_dotaci,
    extraFields: [
      { key: 'vykon_kw', label: 'Výkon TČ (kW)', unit: 'kW', hint: 'z výpočtu TC modulu' }
    ],
    polozky: [
      { key: 'technologie',   label: 'TČ – technologie' },
      { key: 'instalace',     label: 'Instalace, montáž a doprava' },
      { key: 'elektro',       label: 'Elektrické připojení' },
      { key: 'trubky',        label: 'Trubky a další materiál' },
      { key: 'termostat',     label: 'Termostat a řízení systému' },
      { key: 'testovani',     label: 'Testování a ladění' },
    ]
  },
  kogenerace: {
    label: '⚡ Kogenerační jednotka (KGJ)',
    investiceKey: () => OEES_STATE.case.kogenerace?.investice,
    extraFields: [
      { key: 'vykon_kw', label: 'Výkon KGJ (kWe)', unit: 'kWe', hint: 'elektrický výkon' }
    ],
    polozky: [
      { key: 'technologie',   label: 'KGJ – technologie' },
      { key: 'instalace',     label: 'Instalace, montáž a doprava' },
      { key: 'stavebni',      label: 'Stavební úpravy a příprava místa' },
      { key: 'pripojeni',     label: 'Připojení k distribuční soustavě' },
      { key: 'zaskoleni',     label: 'Zaškolení obsluhy' },
      { key: 'revize',        label: 'Revize a uvedení do provozu' },
    ]
  },
  kotel: {
    label: '🔥 Plynový kondenzační kotel',
    investiceKey: () => OEES_STATE.case.kotel?.investice,
    extraFields: [
      { key: 'vykon_kw', label: 'Výkon kotle (kW)', unit: 'kW', hint: 'tepelný výkon' }
    ],
    polozky: [
      { key: 'technologie',   label: 'PLK – technologie' },
      { key: 'instalace',     label: 'Instalace, montáž a doprava' },
      { key: 'stavebni',      label: 'Stavební úpravy a příprava místa' },
      { key: 'pripojeni',     label: 'Připojení k distribuční soustavě' },
      { key: 'revize',        label: 'Revize a uvedení do provozu' },
    ]
  },
  voda: {
    label: '💧 Voda – recyklace, rekuperace, úspora TUV',
    investiceKey: () => OEES_STATE.case.voda?.investice,
    extraFields: [
      { key: 'koef_objem',      label: 'Objemový koeficient',              unit: '',  hint: 'korekce celkového objemu' },
      { key: 'koef_sv',         label: 'Koeficient úspory studené vody',   unit: '',  hint: 'výchozí 0.30' },
      { key: 'koef_sprchy_sv',  label: 'Koeficient spořiče sprchy – SV',   unit: '',  hint: 'výchozí 0.20' },
      { key: 'koef_sprchy_tv',  label: 'Koeficient spořiče sprchy – TV',   unit: '',  hint: 'výchozí 0.35' },
    ],
    polozky: [
      { key: 'nadrz',           label: 'Nádrž ČOV + ostatní nádrže' },
      { key: 'elektro',         label: 'Elektro vybavení' },
      { key: 'voda_vybaveni',   label: 'Voda vybavení' },
      { key: 'instalace',       label: 'Instalace, montáž a doprava' },
      { key: 'rekuperace',      label: 'Rekuperace tepla' },
      { key: 'testovani',       label: 'Testování a ladění' },
    ]
  },
  ev: {
    label: '🚗 Nabíječka elektromobilů',
    investiceKey: () => OEES_STATE.case.ev?.investice,
    extraFields: [
      { key: 'vykon_kw', label: 'Výkon nabíječky (kW)', unit: 'kW', hint: '11 kW / 22 kW / 50 kW...' }
    ],
    polozky: [
      { key: 'technologie',   label: 'NE – technologie (nabíječka)' },
      { key: 'instalace',     label: 'Instalace a montáž' },
      { key: 'material',      label: 'Montážní a jistící materiál' },
    ]
  },
  baterie: {
    label: '🔋 Bateriové úložiště',
    investiceKey: () => OEES_STATE.case.baterie?.investice,
    polozky: [
      { key: 'technologie',   label: 'Baterie – technologie' },
      { key: 'instalace',     label: 'Instalace, montáž a doprava' },
      { key: 'ridici',        label: 'Řídicí systém (BMS)' },
    ]
  },
  inteligentni: {
    label: '🤖 Inteligentní řízení + dispečink',
    investiceKey: () => OEES_STATE.case.inteligentni?.investice,
    polozky: [
      { key: 'ridici_system', label: 'IR – řídící systém (HW + SW)' },
      { key: 'instalace',     label: 'Instalace, montáž a doprava' },
      { key: 'projektova',    label: 'Projektová dokumentace a inženýring' },
      { key: 'zaskoleni',     label: 'Zaškolení obsluhy, uvedení do provozu' },
    ]
  },
  distribuce: {
    label: '📈 Optimalizace distribuční sazby',
    investiceKey: () => OEES_STATE.case.distribuce?.vysledek?.investice_kc,
    polozky: [
      { key: 'slucovani',     label: 'Slučování odběrných míst' },
      { key: 'optimalizace',  label: 'Náklady na optimalizaci sazby' },
      { key: 'spotrebice',    label: 'Investice do spotřebičů pro splnění podmínek' },
      { key: 'prace',         label: 'Práce spojené s optimalizací dle počtu OM' },
    ]
  },
};

// ─── Inicializace stavu ──────────────────────────────────────────────────────

function _initUpresneniState() {
  if (OEES_STATE.case.upresneni) return;
  OEES_STATE.case.upresneni = {
    fve:        { celkem: null, polozky: {} },
    tc:         { celkem: null, vykon_kw: null, polozky: {} },
    kogenerace: { celkem: null, vykon_kw: null, polozky: {} },
    kotel:      { celkem: null, vykon_kw: null, polozky: {} },
    voda:       { celkem: null, koef_objem: null, koef_sv: null, koef_sprchy_sv: null, koef_sprchy_tv: null, polozky: {} },
    ev:         { celkem: null, vykon_kw: null, polozky: {} },
    baterie:    { celkem: null, polozky: {} },
    inteligentni: { celkem: null, polozky: {} },
    distribuce: { celkem: null, polozky: {} },
    vip_sleva_pct: null,
    naklady_es: null,
    poznamky: '',
    do_studie: true
  };
}

// ─── Formátování ─────────────────────────────────────────────────────────────

function _uFmt(v) {
  if (v == null || v === '' || isNaN(v) || v === 0) return '—';
  return new Intl.NumberFormat('cs-CZ').format(Math.round(v)) + ' Kč';
}

function _uFmtN(v, unit) {
  if (v == null || v === '') return '—';
  return parseFloat(v).toLocaleString('cs-CZ') + (unit ? ' ' + unit : '');
}

// ─── Součet finálních položek ────────────────────────────────────────────────

function _soucetFinalniPolozky(modId) {
  const u = OEES_STATE.case.upresneni?.[modId];
  if (!u?.polozky) return null;
  const vals = Object.values(u.polozky).map(v => parseFloat(v) || 0);
  const s = vals.reduce((a, b) => a + b, 0);
  return s > 0 ? s : null;
}

// ─── Aktualizace stavu z inputů ──────────────────────────────────────────────

function aktualizujUpresneni(modId, fieldType, key) {
  _initUpresneniState();
  const u = OEES_STATE.case.upresneni[modId] || {};
  OEES_STATE.case.upresneni[modId] = u;

  const el = document.getElementById(`upr_${modId}_${fieldType}_${key}`);
  const val = el ? (el.value.trim() === '' ? null : parseFloat(el.value) || el.value) : null;

  if (fieldType === 'polozka') {
    if (!u.polozky) u.polozky = {};
    u.polozky[key] = val;
  } else {
    u[key] = val;
  }

  // Přepočítej součet finálních položek a zobraz
  const soucet = _soucetFinalniPolozky(modId);
  const elSum = document.getElementById(`upr_${modId}_fin_soucet`);
  if (elSum) {
    elSum.textContent = soucet ? new Intl.NumberFormat('cs-CZ').format(Math.round(soucet)) + ' Kč' : '—';
    elSum.style.color = soucet ? '#16a34a' : '';
  }

  // Přepočítej VIP slevu celkem
  _aktualizujVipSouhrn();
}

function aktualizujUpresneniObecne(key) {
  _initUpresneniState();
  const el = document.getElementById(`upr_obecne_${key}`);
  if (!el) return;
  if (el.type === 'checkbox') {
    OEES_STATE.case.upresneni[key] = el.checked;
  } else {
    const v = el.value.trim();
    OEES_STATE.case.upresneni[key] = v === '' ? null : (isNaN(parseFloat(v)) ? v : parseFloat(v));
  }
  _aktualizujVipSouhrn();
}

function _aktualizujVipSouhrn() {
  const u = OEES_STATE.case.upresneni;
  if (!u) return;

  // Spočítej součet všech finálních investic
  let totalFin = 0;
  Object.keys(UPRESNENI_DEF).forEach(modId => {
    const modul = u[modId];
    if (!modul) return;
    // Preferuj: Celkem (manuální) > součet položek > vypočtená hodnota
    const celkem = modul.celkem;
    const soucetPol = _soucetFinalniPolozky(modId);
    const vypoctena = UPRESNENI_DEF[modId].investiceKey?.() || 0;
    const finalInv = (celkem != null ? celkem : (soucetPol != null ? soucetPol : vypoctena)) || 0;
    totalFin += finalInv;
  });

  const vip = parseFloat(u.vip_sleva_pct) || 0;
  const sleva = Math.round(totalFin * vip / 100);
  const po_sleve = totalFin - sleva;

  const elTot = document.getElementById('upr_total_fin');
  const elSleva = document.getElementById('upr_total_sleva');
  const elPoSleve = document.getElementById('upr_total_po_sleve');

  if (elTot) elTot.textContent = totalFin > 0 ? new Intl.NumberFormat('cs-CZ').format(Math.round(totalFin)) + ' Kč' : '—';
  if (elSleva) elSleva.textContent = sleva > 0 ? '− ' + new Intl.NumberFormat('cs-CZ').format(sleva) + ' Kč' : '—';
  if (elPoSleve) elPoSleve.textContent = po_sleve > 0 ? new Intl.NumberFormat('cs-CZ').format(Math.round(po_sleve)) + ' Kč' : '—';
}

// ─── Render jedné sekce modulu ────────────────────────────────────────────────

function _renderSekce(modId, def) {
  const u = OEES_STATE.case.upresneni?.[modId] || {};
  const investicePre = def.investiceKey?.() || 0;

  // Součet finálních položek
  const soucetPol = _soucetFinalniPolozky(modId);

  // Extra pole (výkon, koeficienty)
  const extraHtml = (def.extraFields || []).map(f => {
    const preVal = (() => {
      // Zkus najít hodnotu z OEES_STATE
      const c = OEES_STATE.case[modId];
      if (!c) return '';
      if (f.key === 'vykon_kw') return c.vykon_kw || c.potreba_mwh || '';
      if (f.key.startsWith('koef_')) return '';
      return '';
    })();
    const finVal = u[f.key] != null ? u[f.key] : '';
    return `<tr style="background:rgba(255,255,255,0.03)">
      <td style="padding:7px 11px;color:#aaa;font-size:0.83rem">${f.label}</td>
      <td style="padding:7px 11px;text-align:right;color:#888;font-size:0.83rem">${preVal ? _uFmtN(preVal, f.unit) : '—'}</td>
      <td style="padding:6px 8px">
        <div style="display:flex;align-items:center;gap:6px">
          <input type="number" id="upr_${modId}_${f.key}_${f.key}" value="${finVal}"
            step="0.01" placeholder="${preVal || '—'}"
            oninput="aktualizujUpresneni('${modId}', '${f.key}', '${f.key}')"
            style="width:120px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
                   border-radius:4px;padding:5px 8px;color:inherit;font-size:0.84rem;text-align:right">
          <span style="color:#888;font-size:0.78rem">${f.unit || ''}</span>
        </div>
        ${f.hint ? `<div style="font-size:0.71rem;color:#666;margin-top:2px">${f.hint}</div>` : ''}
      </td>
    </tr>`;
  }).join('');

  // Položky rozpočtu
  const polozkyHtml = def.polozky.map(p => {
    const finVal = u.polozky?.[p.key] != null ? u.polozky[p.key] : '';
    return `<tr>
      <td style="padding:7px 11px;font-size:0.87rem">${p.label}</td>
      <td style="padding:7px 11px;text-align:right;color:#666;font-size:0.85rem">—</td>
      <td style="padding:6px 8px">
        <div style="display:flex;align-items:center;gap:6px">
          <input type="number" id="upr_${modId}_polozka_${p.key}" value="${finVal}"
            step="100" placeholder="0"
            oninput="aktualizujUpresneni('${modId}', 'polozka', '${p.key}')"
            style="width:140px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
                   border-radius:4px;padding:5px 8px;color:inherit;font-size:0.84rem;text-align:right">
          <span style="color:#888;font-size:0.78rem">Kč</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  const finCelkem = u.celkem != null ? u.celkem : '';
  const soucetText = soucetPol != null
    ? `<span id="upr_${modId}_fin_soucet" style="font-size:0.78rem;color:#16a34a;margin-left:8px">Σ položek: ${new Intl.NumberFormat('cs-CZ').format(Math.round(soucetPol))} Kč</span>`
    : `<span id="upr_${modId}_fin_soucet" style="font-size:0.78rem;color:#666;margin-left:8px">—</span>`;

  return `
  <div class="card" style="margin-bottom:20px">
    <div class="card-title" style="cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
      <span class="icon">${def.label.split(' ')[0]}</span>
      ${def.label.substring(def.label.indexOf(' ') + 1)}
      <span style="float:right;font-size:0.75rem;opacity:0.5">▼ rozbalit/sbalit</span>
    </div>
    <div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:rgba(255,255,255,0.06);font-size:0.78rem;text-transform:uppercase;letter-spacing:.04em">
            <th style="padding:9px 11px;text-align:left;width:44%">Položka</th>
            <th style="padding:9px 11px;text-align:right;width:22%">📄 Předběžná</th>
            <th style="padding:9px 11px;text-align:left;width:34%">📋 Finální (upravit)</th>
          </tr>
        </thead>
        <tbody>
          <!-- Celková investice -->
          <tr style="background:rgba(255,255,255,0.05);font-weight:600">
            <td style="padding:9px 11px">Celková investice</td>
            <td style="padding:9px 11px;text-align:right;color:#60a5fa">${_uFmt(investicePre)}</td>
            <td style="padding:8px 8px">
              <div style="display:flex;align-items:center;gap:6px">
                <input type="number" id="upr_${modId}_celkem_celkem" value="${finCelkem}"
                  step="1000" placeholder="${investicePre ? Math.round(investicePre) : '0'}"
                  oninput="aktualizujUpresneni('${modId}', 'celkem', 'celkem')"
                  style="width:150px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(100,160,255,0.3);
                         border-radius:4px;padding:6px 9px;color:inherit;font-size:0.9rem;font-weight:600;text-align:right">
                <span style="color:#888;font-size:0.78rem">Kč</span>
                ${soucetText}
              </div>
              <div style="font-size:0.72rem;color:#666;margin-top:3px">Vyplňte celkovou cenu <strong>nebo</strong> jednotlivé položky níže</div>
            </td>
          </tr>
          <!-- Extra pole (koeficienty, výkony) -->
          ${extraHtml}
          <!-- Oddělovač položek -->
          ${def.polozky.length > 0 ? `
          <tr><td colspan="3" style="padding:6px 11px;font-size:0.76rem;color:#666;
              border-top:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)">
            Položkový rozpočet (volitelné – pro přesnější strukturu nabídky)
          </td></tr>
          ${polozkyHtml}` : ''}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ─── Hlavní render ────────────────────────────────────────────────────────────

function inicializujModulUpresneni(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  _initUpresneniState();
  renderModulUpresneni(containerId);
}

function renderModulUpresneni(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const u = OEES_STATE.case.upresneni;
  const aktModuly = new Set((OEES_STATE.aktivniModuly || []).map(m => m.id));

  // Renderuj jen sekce pro aktivní moduly, které mají investiční náklady
  const sekce = Object.entries(UPRESNENI_DEF)
    .filter(([modId]) => aktModuly.has(modId))
    .map(([modId, def]) => _renderSekce(modId, def))
    .join('');

  if (!sekce) {
    container.innerHTML = `<div class="card"><p class="text-muted">Nejsou aktivní žádné technologie s investičními náklady. Aktivujte záložky (FVE, TC, KGJ, Kotel…) v modulu Objekt.</p></div>`;
    return;
  }

  // VIP sleva + celkový souhrn
  const vip = u.vip_sleva_pct != null ? u.vip_sleva_pct : '';
  const naklES = u.naklady_es != null ? u.naklady_es : '';
  const pozn = u.poznamky || '';
  const doStudie = u.do_studie !== false;

  container.innerHTML = `
  <div class="card" style="margin-bottom:16px;border-left:3px solid #f59e0b">
    <div class="card-title" style="color:#f59e0b">📋 Upřesnění finální studie</div>
    <p style="font-size:0.84rem;opacity:0.75;line-height:1.5;margin-bottom:0">
      Pro každou technologii vidíte předběžnou hodnotu (vypočtenou kalkulátorem) a pole pro finální upřesnění.
      Stačí vyplnit <strong>Celkovou investici</strong> — nebo rozepsat jednotlivé položky.
      Prázdné pole = použije se předběžná hodnota. Finální hodnoty jsou použity při generování <em>Finální studie</em>.
    </p>
  </div>

  ${sekce}

  <!-- ══ OBECNÉ: VIP SLEVA, ES, POZNÁMKY ══ -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-title"><span class="icon">💼</span> Obecná upřesnění</div>

    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:rgba(255,255,255,0.06);font-size:0.78rem;text-transform:uppercase;letter-spacing:.04em">
          <th style="padding:9px 11px;width:44%">Položka</th>
          <th style="padding:9px 11px;width:22%">Předběžná</th>
          <th style="padding:9px 11px;width:34%">Finální (upravit)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:9px 11px;font-size:0.87rem">VIP sleva na celkovou investici</td>
          <td style="padding:9px 11px;color:#666;font-size:0.85rem">—</td>
          <td style="padding:8px 8px">
            <div style="display:flex;align-items:center;gap:6px">
              <input type="number" id="upr_obecne_vip_sleva_pct" value="${vip}"
                min="0" max="50" step="0.5" placeholder="0"
                oninput="aktualizujUpresneniObecne('vip_sleva_pct')"
                style="width:90px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
                       border-radius:4px;padding:5px 8px;color:inherit;font-size:0.87rem;text-align:right">
              <span style="color:#888;font-size:0.84rem">%</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:9px 11px;font-size:0.87rem">Náklady na Energetickou Správu (roční)</td>
          <td style="padding:9px 11px;color:#666;font-size:0.85rem">—</td>
          <td style="padding:8px 8px">
            <div style="display:flex;align-items:center;gap:6px">
              <input type="number" id="upr_obecne_naklady_es" value="${naklES}"
                step="100" placeholder="0"
                oninput="aktualizujUpresneniObecne('naklady_es')"
                style="width:140px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
                       border-radius:4px;padding:5px 8px;color:inherit;font-size:0.87rem;text-align:right">
              <span style="color:#888;font-size:0.78rem">Kč/rok</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ══ CELKOVÝ SOUHRN ══ -->
  <div class="card" style="margin-bottom:20px;background:rgba(30,58,95,0.15)">
    <div class="card-title"><span class="icon">📊</span> Celkový souhrn investice – Finální</div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:8px">
      <div class="result-box" style="flex:1;min-width:160px;text-align:center">
        <div class="val" id="upr_total_fin">—</div>
        <div class="lbl">Celková investice před slevou</div>
      </div>
      <div class="result-box" style="flex:1;min-width:160px;text-align:center">
        <div class="val" style="color:#f59e0b" id="upr_total_sleva">—</div>
        <div class="lbl">VIP sleva (${vip || 0} %)</div>
      </div>
      <div class="result-box highlight" style="flex:1;min-width:160px;text-align:center">
        <div class="val" id="upr_total_po_sleve">—</div>
        <div class="lbl">Investice po slevě (finální)</div>
      </div>
    </div>
  </div>

  <!-- ══ POZNÁMKY DO FINÁLNÍ STUDIE ══ -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-title"><span class="icon">📝</span> Poznámky do finální studie</div>
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer">
      <input type="checkbox" id="upr_obecne_do_studie" ${doStudie ? 'checked' : ''}
        onchange="aktualizujUpresneniObecne('do_studie')">
      <span style="font-size:0.88rem">Vložit poznámky do finální studie</span>
    </label>
    <textarea id="upr_obecne_poznamky" rows="5"
      placeholder="Doplňující poznámky poradce, které budou součástí finální studie..."
      oninput="aktualizujUpresneniObecne('poznamky')"
      style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);
             border-radius:6px;padding:10px 12px;color:inherit;font-family:inherit;
             font-size:0.87rem;resize:vertical;line-height:1.5">${pozn}</textarea>
  </div>

  <div style="text-align:center;margin-top:8px">
    <button class="btn btn-primary" onclick="generujFinalniStudii()" style="font-size:1rem;padding:12px 32px">
      📖 Generovat finální studii
    </button>
    <p style="font-size:0.79rem;opacity:0.55;margin-top:8px">
      Vygeneruje finální studii s upřesněnými hodnotami + přílohami ze záložky Přílohy
    </p>
  </div>
  `;

  // Přepočítej souhrn po renderu
  _aktualizujVipSouhrn();
}
