/**
 * OEES – Hlavni aplikacni controller v0.3.0
 * Dynamicka navigace, vsechny moduly, Make.com integrace, auth
 */

'use strict';

// ─── Auth – Prihlaseni do kalkulatoru ────────────────────────────────────────

const CALC_SESSION_KEY = 'oees_calc_session';
const CALC_API_URL = 'https://script.google.com/macros/s/AKfycbzRTSFxU28lSpMCS5JKD9yBtuj_YCRqXzx61KDS7SctpbnKx6Y4hkpZZDKz6blYJRU/exec';

const DEFAULT_CALC_USERS = [
  { jmeno: 'Administrator', email: 'opsp.energy@gmail.com', heslo: 'oees_admin_2026', aktivni: 'ano' }
];

function calcLogin() {
  const email = document.getElementById('calc-login-email').value.trim().toLowerCase();
  const heslo = document.getElementById('calc-login-heslo').value;
  const zapamatovat = document.getElementById('calc-login-zapamatovat').checked;
  const errEl = document.getElementById('calc-login-error');

  if (!email) { errEl.textContent = 'Zadejte email.'; return; }
  if (!heslo) { errEl.textContent = 'Zadejte heslo.'; return; }

  errEl.textContent = 'Overuji...';

  // Zkusime API
  fetch(CALC_API_URL + '?action=admin_load_all')
    .then(r => r.json())
    .then(data => {
      if (data.success && data.adminUsers) {
        const user = data.adminUsers.find(u =>
          u.email && u.email.toLowerCase() === email && u.heslo === heslo && u.aktivni === 'ano'
        );
        if (user) {
          calcPrihlasUzivatele(user, zapamatovat);
          return;
        }
      }
      // Fallback na lokalni
      calcLokalniPrihlaseni(email, heslo, zapamatovat, errEl);
    })
    .catch(() => {
      calcLokalniPrihlaseni(email, heslo, zapamatovat, errEl);
    });
}

function calcLokalniPrihlaseni(email, heslo, zapamatovat, errEl) {
  const user = DEFAULT_CALC_USERS.find(u =>
    u.email.toLowerCase() === email && u.heslo === heslo && u.aktivni === 'ano'
  );
  if (user) {
    calcPrihlasUzivatele(user, zapamatovat);
  } else {
    errEl.textContent = 'Nespravny email nebo heslo.';
  }
}

function calcPrihlasUzivatele(user, zapamatovat) {
  document.getElementById('calc-login-screen').style.display = 'none';
  document.getElementById('calc-app').style.display = '';
  document.getElementById('calc-login-error').textContent = '';

  const nameEl = document.getElementById('calc-user-name');
  if (nameEl) nameEl.textContent = user.jmeno || user.email;

  if (zapamatovat) {
    localStorage.setItem(CALC_SESSION_KEY, JSON.stringify({
      email: user.email, heslo: user.heslo, jmeno: user.jmeno
    }));
  }
}

function calcLogout() {
  localStorage.removeItem(CALC_SESSION_KEY);
  document.getElementById('calc-app').style.display = 'none';
  document.getElementById('calc-login-screen').style.display = '';
  document.getElementById('calc-login-email').value = '';
  document.getElementById('calc-login-heslo').value = '';
  document.getElementById('calc-login-error').textContent = '';
}

function zkusAutoLoginCalc() {
  const json = localStorage.getItem(CALC_SESSION_KEY);
  if (!json) return;
  try {
    const session = JSON.parse(json);
    if (session.email && session.heslo) {
      document.getElementById('calc-login-email').value = session.email;
      document.getElementById('calc-login-heslo').value = session.heslo;
      calcPrihlasUzivatele(session, true);
    }
  } catch (e) { /* ignoruj */ }
}

document.addEventListener('DOMContentLoaded', zkusAutoLoginCalc);

// ─── Stav aplikace ───────────────────────────────────────────────────────────
const OEES_STATE = {
  aktualniKrok: 1,
  aktivniModuly: [],
  case: {
    id:           null,
    vytvoreno:    new Date().toISOString(),
    objekt:       {},
    elektrina:    { stavajici: {}, budouci: {}, vysledek: null },
    distribuce:   { stavajici: {}, budouci: {}, vysledek: null },
    voda:         { stavajici: {}, budouci: {}, vysledek: null },
    fve:          { vstup: {}, vysledek: null },
    plyn:         { stavajici: {}, budouci: {}, vysledek: null },
    tc:           { vstup: {}, vysledek: null },
    kogenerace:   { vstup: {}, vysledek: null },
    kotel:        { vstup: {}, vysledek: null },
    baterie:      { vstup: {}, vysledek: null },
    ev:           { vstup: {}, vysledek: null },
    inteligentni: { vstup: {}, vysledek: null },
    dotace:       { vstup: {}, vysledek: null },
    financovani:  { vstup: {}, vysledek: null },
    poznamky:     {},
    prilohy:      []
  }
};

// ─── Konfigurace API ─────────────────────────────────────────────────────────
const OEES_CONFIG = {
  api_url: 'https://hook.eu1.make.com/9ci7k98pjk7b8es3o8rp0dm7mu8wpqgu',
  gas_url: 'https://script.google.com/macros/s/AKfycbzRTSFxU28lSpMCS5JKD9yBtuj_YCRqXzx61KDS7SctpbnKx6Y4hkpZZDKz6blYJRU/exec',
  api_version: 'v1'
};

// ─── Definice vsech modulu ──────────────────────────────────────────────────
const OEES_MODULY = [
  { id: 'objekt',       label: 'Objekt & kontakt',        icon: '1',  checkbox: null,              panelId: 'panel-objekt' },
  { id: 'elektrina',    label: 'Elektřina',               icon: '2',  checkbox: 'm_elektrina',     panelId: 'panel-elektrina',     initFn: 'inicializujModulElektrina',     containerId: 'modul_elektrina_container' },
  { id: 'distribuce',   label: 'Distribuce',               icon: '3',  checkbox: 'm_distribuce_opt',panelId: 'panel-distribuce',    initFn: 'inicializujModulDistribuce',    containerId: 'modul_distribuce_container' },
  { id: 'voda',         label: 'Voda',                     icon: '4',  checkbox: 'm_voda',          panelId: 'panel-voda',          initFn: 'inicializujModulVoda',          containerId: 'modul_voda_container' },
  { id: 'fve',          label: 'FVE',                      icon: '5',  checkbox: 'm_fve',           panelId: 'panel-fve',           initFn: 'inicializujModulFVE',           containerId: 'modul_fve_container' },
  { id: 'plyn',         label: 'Plyn',                     icon: '6',  checkbox: 'm_plyn',          panelId: 'panel-plyn',          initFn: 'inicializujModulPlyn',          containerId: 'modul_plyn_container' },
  { id: 'teplo',        label: 'Tepelná bilance',           icon: '7',  checkbox: 'm_teplo',         panelId: 'panel-teplo',         initFn: 'inicializujModulTeplo',         containerId: 'modul_teplo_container' },
  { id: 'tc',           label: 'Tepelné čerpadlo',         icon: '8',  checkbox: 'm_tc',            panelId: 'panel-tc',            initFn: 'inicializujModulTC',            containerId: 'modul_tc_container' },
  { id: 'kogenerace',   label: 'Kogenerační jednotka',     icon: '9',  checkbox: 'm_kogenerace',    panelId: 'panel-kogenerace',    initFn: 'inicializujModulKogenerace',    containerId: 'modul_kogenerace_container' },
  { id: 'kotel',        label: 'Plynový kotel',            icon: '10', checkbox: 'm_plyn_kotel',    panelId: 'panel-kotel',         initFn: 'inicializujModulKotel',         containerId: 'modul_kotel_container' },
  { id: 'teplarna',     label: 'Teplárna (CZT)',           icon: '11', checkbox: 'm_teplarna',      panelId: 'panel-teplarna',      initFn: 'inicializujModulTeplarna',      containerId: 'modul_teplarna_container' },
  { id: 'baterie',      label: 'Bateriové úložiště',       icon: '12', checkbox: 'm_baterie',       panelId: 'panel-baterie',       initFn: 'inicializujModulBaterie',       containerId: 'modul_baterie_container' },
  { id: 'ev',           label: 'Nabíječka elektromobilů',  icon: '13', checkbox: 'm_ev',            panelId: 'panel-ev',            initFn: 'inicializujModulEV',            containerId: 'modul_ev_container' },
  { id: 'inteligentni', label: 'Inteligentní řízení',      icon: '14', checkbox: 'm_inteligentni',  panelId: 'panel-inteligentni',  initFn: 'inicializujModulInteligentni',  containerId: 'modul_inteligentni_container' },
  { id: 'dotace',       label: 'Dotace',                   icon: '15', checkbox: null,              panelId: 'panel-dotace',        initFn: 'inicializujModulDotace',        containerId: 'modul_dotace_container' },
  { id: 'financovani',  label: 'Financování',              icon: '16', checkbox: null,              panelId: 'panel-financovani',   initFn: 'inicializujModulFinancovani',   containerId: 'modul_financovani_container' },
  { id: 'poznamky',     label: 'Poznámky',                 icon: '17', checkbox: null,              panelId: 'panel-poznamky',      initFn: 'inicializujModulPoznamky',      containerId: 'modul_poznamky_container' },
  { id: 'prilohy',      label: 'Přílohy',                  icon: '📎', checkbox: null,              panelId: 'panel-prilohy',       initFn: 'inicializujModulPrilohy',       containerId: 'modul_prilohy_container' },
  { id: 'vysledky',     label: 'Výsledky & Studie',        icon: '✓',  checkbox: null,              panelId: 'panel-vysledky' }
];

// ─── Sestaveni aktivnich kroku dle checkboxu ────────────────────────────────

function sestavAktivniKroky() {
  const kroky = [OEES_MODULY[0]]; // objekt vzdy

  for (let i = 1; i < OEES_MODULY.length - 1; i++) {
    const m = OEES_MODULY[i];
    if (!m.checkbox) { kroky.push(m); continue; }
    const cb = document.getElementById(m.checkbox);
    if (cb && cb.checked) kroky.push(m);
  }

  kroky.push(OEES_MODULY[OEES_MODULY.length - 1]); // vysledky vzdy
  OEES_STATE.aktivniModuly = kroky;

  // Aktualizuj progressbar
  aktualizujProgressbar();
  return kroky;
}

// ─── Progressbar ────────────────────────────────────────────────────────────

function aktualizujProgressbar() {
  const container = document.getElementById('steps-container');
  if (!container) return;

  const kroky = OEES_STATE.aktivniModuly;
  container.innerHTML = '';

  kroky.forEach((m, idx) => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step';
    stepDiv.id = 'step-' + m.id;
    stepDiv.setAttribute('data-step-index', idx);
    stepDiv.onclick = () => prejiNaKrokIndex(idx);

    const num = document.createElement('span');
    num.className = 'step-num';
    num.textContent = (idx + 1);
    stepDiv.appendChild(num);
    stepDiv.appendChild(document.createTextNode(' ' + m.label));
    container.appendChild(stepDiv);
  });
}

// ─── Navigace mezi kroky ─────────────────────────────────────────────────────

function prejiNaKrokIndex(index) {
  const kroky = OEES_STATE.aktivniModuly;
  if (index < 0 || index >= kroky.length) return;

  const modul = kroky[index];

  // Skryj vsechny panely a kroky
  document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('active');
    s.classList.remove('done');
  });

  // Zobraz spravny panel
  const panel = document.getElementById(modul.panelId);
  if (panel) panel.classList.add('active');

  // Oznac aktivni krok
  const stepEl = document.getElementById('step-' + modul.id);
  if (stepEl) stepEl.classList.add('active');

  // Oznac dokoncene kroky
  for (let i = 0; i < index; i++) {
    const s = document.getElementById('step-' + kroky[i].id);
    if (s) s.classList.add('done');
  }

  OEES_STATE.aktualniKrok = index;

  // Inicializuj modul pri prvnim zobrazeni
  if (modul.initFn && modul.containerId) {
    const container = document.getElementById(modul.containerId);
    if (container && !container.children.length) {
      const fn = window[modul.initFn];
      if (typeof fn === 'function') fn(modul.containerId);
    }
  }

  // Souhrn
  if (modul.id === 'vysledky') {
    sestavSouhrn();
  }

  // Aktualizuj navigacni tlacitka
  aktualizujNavTlacitka(index);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Zpetna kompatibilita
function prejiNaKrok(cislo) {
  // Mapovani stareho cisla na index
  const kroky = OEES_STATE.aktivniModuly;
  if (kroky.length === 0) sestavAktivniKroky();
  prejiNaKrokIndex(cislo - 1);
}

// ─── Navigacni tlacitka ─────────────────────────────────────────────────────

function aktualizujNavTlacitka(index) {
  const kroky = OEES_STATE.aktivniModuly;
  const modul = kroky[index];
  const panel = document.getElementById(modul.panelId);
  if (!panel) return;

  // Presun checkboxy modulu na spodek aktivniho panelu
  const cbBlock = document.getElementById('moduly-checkboxy');
  if (cbBlock) {
    if (modul.id === 'vysledky') {
      cbBlock.style.display = 'none';
    } else {
      cbBlock.style.display = '';
      panel.appendChild(cbBlock);
    }
  }

  // Najdi btn-row v panelu
  let btnRow = panel.querySelector('.nav-btn-row');
  if (!btnRow) {
    btnRow = document.createElement('div');
    btnRow.className = 'btn-row nav-btn-row';
    panel.appendChild(btnRow);
  } else {
    // Zajisti ze btn-row je vzdy na konci (za checkboxy)
    panel.appendChild(btnRow);
  }

  btnRow.innerHTML = '';

  // Tlacitko Zpet
  if (index > 0) {
    const btnZpet = document.createElement('button');
    btnZpet.className = 'btn btn-secondary';
    btnZpet.innerHTML = '&larr; Zpět';
    btnZpet.onclick = () => prejiNaKrokIndex(index - 1);
    btnRow.appendChild(btnZpet);
  }

  // Tlacitko Dalsi / Zobrazit vysledky
  if (index < kroky.length - 1) {
    const btnDalsi = document.createElement('button');
    const isPreLast = (index === kroky.length - 2);
    if (isPreLast) {
      // Posledni krok pred vysledky → zelene tlacitko
      btnDalsi.className = 'btn btn-success';
      btnDalsi.innerHTML = '&#128202; Zobrazit výsledky';
    } else {
      btnDalsi.className = 'btn btn-primary';
      btnDalsi.innerHTML = 'Pokračovat &rarr;';
    }
    btnDalsi.onclick = () => {
      if (index === 0) sestavAktivniKroky();
      prejiNaKrokIndex(index + 1);
    };
    btnRow.appendChild(btnDalsi);
  }
}

// ─── Kategorie zakaznika ──────────────────────────────────────────────────────

function aktualizujKategorii() {
  const kat = document.getElementById('o_kategorie')?.value || '';
  const balicekWrap = document.getElementById('o_balicek_wrap');

  // Balicek je relevantni jen pro bytove domy
  if (balicekWrap) {
    balicekWrap.style.display = (kat === 'bd_s_dph' || kat === 'bd_bez_dph') ? 'block' : 'none';
  }

  // Uloz do stavu
  OEES_STATE.case.objekt.kategorie = kat;
}

// ─── Optimalizace distribuce (spousti se z elektrina modulu) ─────────────────

function optimalizujDistribuci() {
  const kroky = OEES_STATE.aktivniModuly;
  const idx = kroky.findIndex(m => m.id === 'distribuce');
  if (idx >= 0) prejiNaKrokIndex(idx);
}

// ─── Souhrn vysledku ─────────────────────────────────────────────────────────

function sestavSouhrn() {
  const nazev = document.getElementById('o_nazev')?.value || 'Vas objekt';
  document.getElementById('souhrn_nazev').textContent = nazev;

  const kroky = OEES_STATE.aktivniModuly;
  const aktivniIds = kroky.map(k => k.id);
  const c = OEES_STATE.case;

  const sekce = [
    { id: 'elektrina',    icon: '&#9889;',          nazev: 'Elektřina & distribuce' },
    { id: 'distribuce',   icon: '&#128200;',        nazev: 'Optimalizace distribuce' },
    { id: 'voda',         icon: '&#128167;',        nazev: 'Voda' },
    { id: 'fve',          icon: '&#9728;&#65039;',  nazev: 'Fotovoltaika (FVE)' },
    { id: 'plyn',         icon: '&#128293;',        nazev: 'Plyn' },
    { id: 'teplo',        icon: '&#128293;',        nazev: 'Tepelná bilance' },
    { id: 'tc',           icon: '&#10052;&#65039;', nazev: 'Tepelné čerpadlo' },
    { id: 'kogenerace',   icon: '&#9889;',          nazev: 'Kogenerační jednotka' },
    { id: 'kotel',        icon: '&#128293;',        nazev: 'Plynový kotel' },
    { id: 'teplarna',     icon: '&#127981;',        nazev: 'Teplárna (CZT)' },
    { id: 'baterie',      icon: '&#128267;',        nazev: 'Bateriové úložiště' },
    { id: 'ev',           icon: '&#128663;',        nazev: 'Nabíječka elektromobilů' },
    { id: 'inteligentni', icon: '&#129302;',        nazev: 'Inteligentní řízení' }
  ];

  // Agregace celkových úspor a investic
  let celkova_uspora_rok = 0;
  let celkova_investice = 0;
  const chybejiciModuly = [];

  let html = '<table class="breakdown" style="margin-bottom:24px"><thead><tr>';
  html += '<th>Modul</th><th class="num">Úspora Kč/rok</th><th class="num">Investice Kč</th><th class="num">Návratnost</th>';
  html += '</tr></thead><tbody>';

  sekce.forEach(s => {
    if (!aktivniIds.includes(s.id)) return;

    const data = c[s.id];
    const dv = data?.vysledek || data; // moduly ukladaji bud primo nebo do .vysledek
    let uspora = 0, investice = 0, navratnost = '-';

    if (dv) {
      switch (s.id) {
        case 'elektrina':
          uspora = dv.uspora_kc_rok || 0;
          break;
        case 'distribuce':
          uspora = (dv.uspora_nn || 0) + (dv.uspora_vn || 0) + (dv.uspora_kc_rok || 0);
          break;
        case 'fve':
          uspora = dv.uspora_celkem || dv.rocni_prinos_r1 || 0;
          investice = dv.investice_celkem || dv.investice_kc || 0;
          navratnost = dv.navratnost_let ? dv.navratnost_let + ' let' : (dv.navratnost ? dv.navratnost + ' let' : '-');
          break;
        case 'voda':
          uspora = dv.uspora_celkem || dv.uspora || 0;
          investice = dv.investice || 0;
          if (dv.navratnost) navratnost = (typeof dv.navratnost === 'number' ? dv.navratnost.toFixed(1) : dv.navratnost) + ' let';
          break;
        case 'plyn':
          uspora = dv.uspora || 0;
          break;
        case 'teplo':
          // Tepelna bilance = informacni, nema vlastni usporu
          break;
        case 'tc':
          uspora = dv.uspora || 0;
          investice = dv.investice_po_dotaci || dv.investice_prumer || 0;
          if (dv.navratnost && dv.navratnost !== '---') navratnost = dv.navratnost + ' let';
          break;
        case 'kogenerace':
          uspora = dv.rocni_uspora || 0;
          investice = dv.investice || 0;
          if (dv.navratnost) navratnost = (typeof dv.navratnost === 'number' ? dv.navratnost.toFixed(1) : dv.navratnost) + ' let';
          break;
        case 'kotel':
          uspora = dv.rocni_uspora || 0;
          investice = dv.investice || 0;
          if (dv.navratnost) navratnost = (typeof dv.navratnost === 'number' ? dv.navratnost.toFixed(1) : dv.navratnost) + ' let';
          break;
        case 'teplarna':
          uspora = dv.uspora || 0;
          break;
        case 'baterie':
          uspora = dv.uspora_rok || dv.uspora || 0;
          investice = dv.investice_po_dotaci || dv.investice || 0;
          if (dv.navratnost) navratnost = (typeof dv.navratnost === 'number' ? dv.navratnost.toFixed(1) : dv.navratnost) + ' let';
          break;
        case 'ev':
          uspora = dv.uspora_provoz || 0;
          investice = dv.investice_po_dotaci || dv.investice || 0;
          if (dv.navratnost) navratnost = (typeof dv.navratnost === 'number' ? dv.navratnost.toFixed(1) : dv.navratnost) + ' let';
          break;
        case 'inteligentni':
          uspora = dv.rocni_uspora || dv.uspora || 0;
          investice = dv.investice || 0;
          if (dv.navratnost) navratnost = (typeof dv.navratnost === 'number' ? dv.navratnost.toFixed(1) : dv.navratnost) + ' let';
          break;
      }
    }

    celkova_uspora_rok += uspora;
    celkova_investice += investice;

    const fmtKc = (v) => new Intl.NumberFormat('cs-CZ').format(Math.round(v));
    const hasData = uspora !== 0 || investice !== 0;

    if (!hasData) {
      chybejiciModuly.push(s);
    }

    html += `<tr>
      <td>${s.icon} ${s.nazev}</td>
      <td class="num">${hasData ? fmtKc(uspora) + ' Kč' : '<span class="text-muted">–</span>'}</td>
      <td class="num">${investice > 0 ? fmtKc(investice) + ' Kč' : '-'}</td>
      <td class="num">${navratnost}</td>
    </tr>`;
  });

  // Dotace
  const dotaceData = c.dotace;
  let celkova_dotace = 0;
  if (dotaceData && dotaceData.dotace) {
    celkova_dotace = dotaceData.dotace;
  }

  html += `<tr class="total">
    <td><strong>CELKEM</strong></td>
    <td class="num"><strong>${new Intl.NumberFormat('cs-CZ').format(Math.round(celkova_uspora_rok))} Kč/rok</strong></td>
    <td class="num"><strong>${new Intl.NumberFormat('cs-CZ').format(Math.round(celkova_investice))} Kč</strong></td>
    <td class="num"><strong>${celkova_investice > 0 && celkova_uspora_rok > 0
      ? (celkova_investice / celkova_uspora_rok).toFixed(1) + ' let'
      : '-'}</strong></td>
  </tr>`;
  html += '</tbody></table>';

  // Dotace a financovani info
  if (celkova_dotace > 0) {
    html += `<div style="margin-bottom:16px;padding:14px;background:rgba(74,222,128,0.15);border-radius:var(--radius-sm);border-left:4px solid #4ade80">
      <strong>&#127873; Dotace:</strong> ${new Intl.NumberFormat('cs-CZ').format(Math.round(celkova_dotace))} Kč
      | <strong>Investice po dotaci:</strong> ${new Intl.NumberFormat('cs-CZ').format(Math.round(celkova_investice - celkova_dotace))} Kč
      | <strong>Návratnost po dotaci:</strong> ${celkova_uspora_rok > 0
        ? ((celkova_investice - celkova_dotace) / celkova_uspora_rok).toFixed(1) + ' let'
        : '-'}
    </div>`;
  }

  // Celkovy souhrn
  html += `
    <div class="souhrn-celkem" style="padding:20px;background:var(--primary-light);border-radius:var(--radius-sm);border-left:4px solid var(--primary)">
      <h3 style="margin:0 0 8px 0">Celkový potenciál úspor</h3>
      ${celkova_uspora_rok > 0 ? `
        <p style="font-size:1.1rem;margin:0">
          <strong>${new Intl.NumberFormat('cs-CZ').format(Math.round(celkova_uspora_rok))} Kč/rok</strong>
          (${new Intl.NumberFormat('cs-CZ').format(Math.round(celkova_uspora_rok / 12))} Kč/měsíc)
        </p>
        <p style="font-size:0.85rem;margin:8px 0 0;color:var(--text-muted)">
          Celková investice ${new Intl.NumberFormat('cs-CZ').format(Math.round(celkova_investice))} Kč |
          Prostá návratnost ${celkova_uspora_rok > 0 ? (celkova_investice / celkova_uspora_rok).toFixed(1) : '-'} let
        </p>
      ` : '<p class="text-muted">Spočítejte jednotlivé moduly pro zobrazení celkového souhrnu.</p>'}
    </div>`;

  // Upozorneni na moduly bez dat
  if (chybejiciModuly.length > 0) {
    html += `<div style="margin-top:16px;padding:14px;background:#fffbe6;border-radius:var(--radius-sm);border-left:4px solid #f59e0b">
      <strong>&#9888;&#65039; Některé moduly nemají vyplněná data:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;list-style:disc">`;
    chybejiciModuly.forEach(m => {
      const krokIdx = kroky.findIndex(k => k.id === m.id);
      if (krokIdx >= 0) {
        html += `<li style="margin:4px 0">${m.icon} ${m.nazev} – <a href="#" onclick="prejiNaKrokIndex(${krokIdx});return false" style="color:var(--primary);font-weight:600">Přejít na záložku</a></li>`;
      }
    });
    html += `</ul></div>`;
  }

  document.getElementById('souhrn_obsah').innerHTML = html;

  // Tlacitka studie – zobraz po ulozeni pripadu
  const maStudii = !!OEES_STATE.case.id;
  const btnUpr = document.getElementById('btn-upresneni-studie');
  const btnFin = document.getElementById('btn-finalni-studie');
  if (btnUpr) btnUpr.style.display = maStudii ? '' : 'none';
  if (btnFin) btnFin.style.display = maStudii ? '' : 'none';
}


// ─── Ulozeni pripadu do OEES API / Google Sheets ─────────────────────────────

// Získej nastavení aktivních záložek jako string
function getAktivniModulyString() {
  const ids = [];
  OEES_MODULY.forEach(m => {
    if (!m.checkbox) return;
    const cb = document.getElementById(m.checkbox);
    if (cb && cb.checked) ids.push(m.id);
  });
  return ids.join(',');
}

async function ulozCase() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> Ukládám...';

  const caseId = OEES_STATE.case.id || ('CASE-' + Date.now().toString().slice(-8));

  const caseData = {
    action:        'case_save',
    case_id:       caseId,
    created:       OEES_STATE.case.created || new Date().toISOString(),
    company:       document.getElementById('o_nazev')?.value || '',
    contact_email: document.getElementById('o_email')?.value || '',
    contact_phone: document.getElementById('o_telefon')?.value || '',
    address:       [document.getElementById('o_sidlo_ulice')?.value, document.getElementById('o_sidlo_obec')?.value, document.getElementById('o_sidlo_psc')?.value].filter(Boolean).join(', '),
    type:          document.getElementById('o_typ')?.value || '',
    aktivni_moduly: getAktivniModulyString(),
    data_json:     JSON.stringify(OEES_STATE.case)
  };

  try {
    const response = await fetch(OEES_CONFIG.gas_url, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(caseData)
    });
    if (response.ok) {
      const text = await response.text();
      try { const res = JSON.parse(text); if (res.case_id) caseData.case_id = res.case_id; } catch(_){}
    }
  } catch (_) {
    // Fallback no-cors
    try {
      await fetch(OEES_CONFIG.gas_url, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(caseData)
      });
    } catch (_) {}
  }

  // Také odeslat do Make webhooku (stávající integrace)
  try {
    await fetch(OEES_CONFIG.api_url, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(caseData)
    });
  } catch (_) {}

  OEES_STATE.case.id = caseData.case_id;
  OEES_STATE.case.created = caseData.created;
  btn.innerHTML = '&#10004; Uloženo – ' + caseData.case_id;
  btn.style.background = 'var(--success)';
  setTimeout(() => { btn.disabled = false; btn.innerHTML = '💾 Uložit případ do databáze'; btn.style.background = ''; }, 4000);
}

// ─── Načítání případů ────────────────────────────────────────────────────────

async function nacistSeznamPripadu() {
  const sel = document.getElementById('case-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Načítám...</option>';
  try {
    const resp = await fetch(OEES_CONFIG.gas_url + '?action=cases_list');
    if (resp.ok) {
      const res = JSON.parse(await resp.text());
      if (res.success && res.data) {
        sel.innerHTML = '<option value="">-- Vyberte případ --</option>';
        res.data.forEach(c => {
          const label = (c.company || 'Bez názvu') + ' (' + (c.case_id || '') + ')';
          sel.innerHTML += `<option value="${c.case_id}">${label}</option>`;
        });
        return;
      }
    }
  } catch (_) {}
  sel.innerHTML = '<option value="">Nepodařilo se načíst</option>';
}

async function nacistPripad() {
  const sel = document.getElementById('case-select');
  const caseId = sel?.value;
  if (!caseId) return;

  const statusEl = document.getElementById('case-load-status');
  if (statusEl) statusEl.textContent = 'Načítám...';

  try {
    const resp = await fetch(OEES_CONFIG.gas_url + '?action=case_detail&caseId=' + encodeURIComponent(caseId));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const res = JSON.parse(await resp.text());
    if (!res.success || !res.data) throw new Error(res.error || 'Data nenalezena');

    const row = res.data;

    // Obnov data_json do OEES_STATE.case
    if (row.data_json) {
      try {
        const parsed = JSON.parse(row.data_json);
        Object.assign(OEES_STATE.case, parsed);
      } catch(_) {}
    }
    OEES_STATE.case.id = row.case_id;
    OEES_STATE.case.created = row.created;

    // Obnov formulář objektu
    if (row.company) { const el = document.getElementById('o_nazev'); if (el) el.value = row.company; }
    if (row.contact_email) { const el = document.getElementById('o_email'); if (el) el.value = row.contact_email; }
    if (row.contact_phone) { const el = document.getElementById('o_telefon'); if (el) el.value = row.contact_phone; }
    if (row.address) {
      const parts = row.address.split(', ');
      const el1 = document.getElementById('o_sidlo_ulice'); if (el1 && parts[0]) el1.value = parts[0];
      const el2 = document.getElementById('o_sidlo_obec');  if (el2 && parts[1]) el2.value = parts[1];
      const el3 = document.getElementById('o_sidlo_psc');   if (el3 && parts[2]) el3.value = parts[2];
    }

    // Obnov checkboxy záložek
    if (row.aktivni_moduly) {
      const ids = row.aktivni_moduly.split(',');
      OEES_MODULY.forEach(m => {
        if (!m.checkbox) return;
        const cb = document.getElementById(m.checkbox);
        if (cb) cb.checked = ids.includes(m.id);
      });
      sestavAktivniKroky();
    }

    if (statusEl) statusEl.textContent = 'Načteno: ' + (row.company || row.case_id);
    statusEl.style.color = 'var(--success)';

    // Přejdi na první záložku
    prejiNaKrokIndex(0);

  } catch (err) {
    if (statusEl) { statusEl.textContent = 'Chyba: ' + err.message; statusEl.style.color = 'var(--danger,#e74c3c)'; }
  }
}

// ─── Generovani studie – implementace je v js/modules/studie.js ─────────────
// Funkce generujStudii(), generujFinalniStudii(), otevritUpresneniStudie()
// jsou definovány v studie.js

// ─── Ukladani a obnova nastaveni (localStorage) ────────────────────────────

const OEES_STORAGE_KEY = 'oees_form_state';

function ulozFormStav() {
  const stav = {};
  // Uloz vsechny inputy, selecty a checkboxy na strance
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (!el.id) return;
    if (el.type === 'checkbox') {
      stav[el.id] = el.checked;
    } else {
      stav[el.id] = el.value;
    }
  });
  stav._krok = OEES_STATE.aktualniKrok;
  stav._ulozeno = new Date().toISOString();
  localStorage.setItem(OEES_STORAGE_KEY, JSON.stringify(stav));
}

function obnovFormStav() {
  const json = localStorage.getItem(OEES_STORAGE_KEY);
  if (!json) return false;

  try {
    const stav = JSON.parse(json);
    // Obnov checkboxy technologii NEJDRIV (ovlivnuji aktivni kroky)
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      if (el.id && stav[el.id] !== undefined) {
        el.checked = stav[el.id];
      }
    });
    // Obnov selecty
    document.querySelectorAll('select').forEach(el => {
      if (el.id && stav[el.id] !== undefined) {
        el.value = stav[el.id];
      }
    });
    // Obnov textove a ciselne inputy
    document.querySelectorAll('input:not([type="checkbox"])').forEach(el => {
      if (el.id && stav[el.id] !== undefined) {
        el.value = stav[el.id];
      }
    });
    // Obnov textareas
    document.querySelectorAll('textarea').forEach(el => {
      if (el.id && stav[el.id] !== undefined) {
        el.value = stav[el.id];
      }
    });
    return stav._krok || 0;
  } catch (e) {
    return false;
  }
}

function zapniAutosave() {
  // Uloz pri kazde zmene vstupniho pole + aktualizuj sticky souhrn
  document.addEventListener('input', () => { ulozFormStav(); aktualizujStickySouhrn(); });
  document.addEventListener('change', () => { ulozFormStav(); aktualizujStickySouhrn(); });
}

function resetFormStav() {
  localStorage.removeItem(OEES_STORAGE_KEY);
  location.reload();
}

// ─── Sticky souhrn – validace modulu a celkove cisla ────────────────────────

// Kazdy modul definuje svou validaci: vraci {ok, investice, uspora}
const MODUL_VALIDACE = {
  fve:        () => { const s = OEES_STATE.case.fve; return { ok: !!(s && s.vykon_kwp > 0), investice: s?.investice_celkem || 0, uspora: s?.uspora_celkem || 0 }; },
  tc:         () => { const s = OEES_STATE.case.tc; return { ok: !!(s && s.potreba_mwh > 0), investice: s?.investice_po_dotaci || 0, uspora: s?.uspora || 0 }; },
  kogenerace: () => { const s = OEES_STATE.case.kogenerace; return { ok: !!(s && s.tepelny_vykon > 0), investice: s?.investice || 0, uspora: s?.uspora_celkem || 0 }; },
  kotel:      () => { const s = OEES_STATE.case.kotel; return { ok: !!(s && s.vykon_kw > 0), investice: s?.investice || 0, uspora: s?.uspora || 0 }; },
  ev:         () => { const s = OEES_STATE.case.ev; return { ok: !!(s && s.najezd_km > 0), investice: s?.investice_po_dotaci || 0, uspora: s?.uspora_provoz || 0 }; },
  baterie:    () => { const s = OEES_STATE.case.baterie; return { ok: !!(s && s.kapacita_kwh > 0), investice: s?.investice || 0, uspora: s?.uspora || 0 }; },
  teplo:      () => { const s = OEES_STATE.case.teplo; return { ok: !!(s && s.celkem_mwh > 0), investice: 0, uspora: 0 }; },
  distribuce: () => { const s = OEES_STATE.case.distribuce; return { ok: !!(s && (s.uspora_nn || s.uspora_vn)), investice: 0, uspora: (s?.uspora_nn || 0) + (s?.uspora_vn || 0) }; },
  voda:       () => { const s = OEES_STATE.case.voda; return { ok: !!(s && s.spotreba_m3 > 0), investice: 0, uspora: s?.uspora || 0 }; },
  teplarna:     () => { const s = OEES_STATE.case.teplarna; return { ok: !!(s && s.spotreba_mwh > 0), investice: 0, uspora: s?.uspora || 0 }; },
  inteligentni: () => { const s = OEES_STATE.case.inteligentni; return { ok: !!(s && s.uspora > 0), investice: s?.investice || 0, uspora: s?.uspora || 0 }; }
};

function aktualizujStickySouhrn() {
  const modulyEl = document.getElementById('sticky-moduly');
  const invEl = document.getElementById('sticky-investice');
  const uspEl = document.getElementById('sticky-uspora');
  const navrEl = document.getElementById('sticky-navratnost');
  if (!modulyEl) return;

  let celkInvestice = 0, celkUspora = 0;
  let badges = '';

  for (const m of OEES_STATE.aktivniModuly || []) {
    if (m.id === 'objekt' || m.id === 'vysledky' || m.id === 'dotace' || m.id === 'financovani' || m.id === 'poznamky' || m.id === 'plyn' || m.id === 'elektrina') continue;
    const val = MODUL_VALIDACE[m.id];
    if (!val) continue;
    const r = val();
    const cls = r.ok ? 'ok' : 'warn';
    const icon = r.ok ? '&#10003;' : '&#33;';
    const idx = OEES_STATE.aktivniModuly.findIndex(x => x.id === m.id);
    badges += `<span class="sticky-modul-badge ${cls}" onclick="prejiNaKrokIndex(${idx})" title="${m.label}">${icon} ${m.label}</span>`;
    celkInvestice += r.investice;
    celkUspora += r.uspora;
  }

  modulyEl.innerHTML = badges;
  invEl.textContent = celkInvestice > 0 ? celkInvestice.toLocaleString('cs-CZ') + ' Kc' : '---';
  uspEl.textContent = celkUspora > 0 ? celkUspora.toLocaleString('cs-CZ') + ' Kc/rok' : '---';
  navrEl.textContent = (celkUspora > 0 && celkInvestice > 0) ? (celkInvestice / celkUspora).toFixed(1) + ' let' : '---';
}

function zobrazNavrh() {
  // Prejdi na Vysledky
  const idx = OEES_STATE.aktivniModuly.findIndex(m => m.id === 'vysledky');
  if (idx >= 0) prejiNaKrokIndex(idx);
}

// ─── Inicializace pri nacteni stranky ────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Obnov ulozene nastaveni (checkboxy, pole)
  const ulozenKrok = obnovFormStav();

  // Aktualizuj kategorii (zobrazi/skryje balicek)
  aktualizujKategorii();

  // Sestav kroky dle obnovenych checkboxu
  sestavAktivniKroky();

  // Prejdi na ulozeny krok nebo na zacatek
  if (ulozenKrok !== false && ulozenKrok > 0) {
    prejiNaKrokIndex(ulozenKrok);
  } else {
    prejiNaKrokIndex(0);
  }

  // Zapni automaticke ukladani
  zapniAutosave();

  // Prvni aktualizace sticky souhrnu
  setTimeout(aktualizujStickySouhrn, 200);

  console.log('OEES Kalkulator v0.3.0 | NaEnergie.cz | ' + new Date().toLocaleDateString('cs-CZ'));
});
