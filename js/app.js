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
    poznamky:     {}
  }
};

// ─── Konfigurace API ─────────────────────────────────────────────────────────
const OEES_CONFIG = {
  api_url: 'https://hook.eu1.make.com/9ci7k98pjk7b8es3o8rp0dm7mu8wpqgu',
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
  { id: 'tc',           label: 'Tepelné čerpadlo',         icon: '7',  checkbox: 'm_tc',            panelId: 'panel-tc',            initFn: 'inicializujModulTC',            containerId: 'modul_tc_container' },
  { id: 'kogenerace',   label: 'Kogenerační jednotka',     icon: '8',  checkbox: 'm_kogenerace',    panelId: 'panel-kogenerace',    initFn: 'inicializujModulKogenerace',    containerId: 'modul_kogenerace_container' },
  { id: 'kotel',        label: 'Plynový kotel',            icon: '9',  checkbox: 'm_plyn_kotel',    panelId: 'panel-kotel',         initFn: 'inicializujModulKotel',         containerId: 'modul_kotel_container' },
  { id: 'baterie',      label: 'Bateriové úložiště',       icon: '10', checkbox: 'm_baterie',       panelId: 'panel-baterie',       initFn: 'inicializujModulBaterie',       containerId: 'modul_baterie_container' },
  { id: 'ev',           label: 'Nabíječka elektromobilů',  icon: '11', checkbox: 'm_ev',            panelId: 'panel-ev',            initFn: 'inicializujModulEV',            containerId: 'modul_ev_container' },
  { id: 'inteligentni', label: 'Inteligentní řízení',      icon: '12', checkbox: 'm_inteligentni',  panelId: 'panel-inteligentni',  initFn: 'inicializujModulInteligentni',  containerId: 'modul_inteligentni_container' },
  { id: 'dotace',       label: 'Dotace',                   icon: '13', checkbox: null,              panelId: 'panel-dotace',        initFn: 'inicializujModulDotace',        containerId: 'modul_dotace_container' },
  { id: 'financovani',  label: 'Financování',              icon: '14', checkbox: null,              panelId: 'panel-financovani',   initFn: 'inicializujModulFinancovani',   containerId: 'modul_financovani_container' },
  { id: 'poznamky',     label: 'Poznámky',                 icon: '15', checkbox: null,              panelId: 'panel-poznamky',      initFn: 'inicializujModulPoznamky',      containerId: 'modul_poznamky_container' },
  { id: 'vysledky',     label: 'Výsledky',                 icon: '✓',  checkbox: null,              panelId: 'panel-vysledky' }
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

  // Najdi btn-row v panelu
  let btnRow = panel.querySelector('.nav-btn-row');
  if (!btnRow) {
    btnRow = document.createElement('div');
    btnRow.className = 'btn-row nav-btn-row';
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

  // Tlacitko Dalsi
  if (index < kroky.length - 1) {
    const btnDalsi = document.createElement('button');
    const isLast = (index === kroky.length - 2);
    btnDalsi.className = 'btn btn-primary';
    btnDalsi.innerHTML = 'Pokračovat &rarr;';
    btnDalsi.onclick = () => {
      if (index === 0) sestavAktivniKroky();
      prejiNaKrokIndex(index + 1);
    };
    btnRow.appendChild(btnDalsi);
  }

  // Tlacitko Zobrazit vysledky – na kazde zalozce krome vysledku
  if (modul.id !== 'vysledky') {
    const btnVysledky = document.createElement('button');
    btnVysledky.className = 'btn btn-success';
    btnVysledky.innerHTML = '&#128202; Zobrazit výsledky';
    btnVysledky.onclick = () => {
      if (index === 0) sestavAktivniKroky();
      const vysledkyIdx = kroky.findIndex(k => k.id === 'vysledky');
      if (vysledkyIdx >= 0) prejiNaKrokIndex(vysledkyIdx);
    };
    btnRow.appendChild(btnVysledky);
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
    { id: 'tc',           icon: '&#10052;&#65039;', nazev: 'Tepelné čerpadlo' },
    { id: 'kogenerace',   icon: '&#9889;',          nazev: 'Kogenerační jednotka' },
    { id: 'kotel',        icon: '&#128293;',        nazev: 'Plynový kotel' },
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
    let uspora = 0, investice = 0, navratnost = '-';

    if (data && data.vysledek) {
      // Elektrina
      if (s.id === 'elektrina' && data.vysledek.uspora_kc_rok !== undefined) {
        uspora = data.vysledek.uspora_kc_rok;
      }
      // Distribuce
      if (s.id === 'distribuce' && data.vysledek.uspora_kc_rok !== undefined) {
        uspora = data.vysledek.uspora_kc_rok;
      }
      // FVE
      if (s.id === 'fve') {
        uspora = data.vysledek.rocni_prinos_r1 || 0;
        investice = data.vysledek.investice_kc || 0;
        navratnost = data.vysledek.navratnost_let ? data.vysledek.navratnost_let + ' let' : '-';
      }
      // Voda
      if (s.id === 'voda') {
        uspora = data.uspora_celkem || data.vysledek?.uspora_celkem || 0;
        investice = data.investice || data.vysledek?.investice || 0;
        navratnost = data.navratnost || data.vysledek?.navratnost || '-';
        if (typeof navratnost === 'number') navratnost = navratnost.toFixed(1) + ' let';
      }
      // Plyn
      if (s.id === 'plyn') {
        uspora = data.uspora || data.vysledek?.uspora || 0;
      }
      // TC
      if (s.id === 'tc') {
        uspora = data.uspora || 0;
        investice = data.investice_po_dotaci || data.investice_prumer || 0;
        navratnost = data.navratnost ? data.navratnost.toFixed(1) + ' let' : '-';
      }
      // Kogenerace
      if (s.id === 'kogenerace') {
        uspora = data.rocni_uspora || 0;
        investice = data.investice || 0;
        navratnost = data.navratnost ? data.navratnost.toFixed(1) + ' let' : '-';
      }
      // Kotel
      if (s.id === 'kotel') {
        uspora = data.rocni_uspora || 0;
        investice = data.investice || 0;
        navratnost = data.navratnost ? data.navratnost.toFixed(1) + ' let' : '-';
      }
      // Baterie
      if (s.id === 'baterie') {
        uspora = data.uspora_rok || 0;
        investice = data.investice_po_dotaci || data.investice || 0;
        navratnost = data.navratnost ? data.navratnost.toFixed(1) + ' let' : '-';
      }
      // EV
      if (s.id === 'ev') {
        uspora = data.uspora_provoz || 0;
        investice = data.investice_po_dotaci || data.investice || 0;
        navratnost = data.navratnost ? data.navratnost.toFixed(1) + ' let' : '-';
      }
      // Inteligentni
      if (s.id === 'inteligentni') {
        uspora = data.rocni_uspora || 0;
        investice = data.investice || 0;
        navratnost = data.navratnost ? data.navratnost.toFixed(1) + ' let' : '-';
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

  // Upresneni finalni studie – pouze pro ESO3/admin a az po ulozeni pripadu
  const uprWrap = document.getElementById('upresneni-wrap');
  if (uprWrap) {
    const adminSession = JSON.parse(localStorage.getItem('oees_admin_session') || '{}');
    const prava = adminSession.prava || {};
    const isAdmin = Object.values(prava).some(v => v === 'admin');
    const maStudii = !!OEES_STATE.case.id;
    uprWrap.style.display = (isAdmin && maStudii) ? 'block' : 'none';
  }
}

// ─── Upresneni finalni studie (otevreni z vysledku) ─────────────────────────

function otevritUpresneniStudie() {
  // Otevre admin panel na zalozce upresneni s aktualnim pripadem
  const caseId = OEES_STATE.case.id;
  const url = 'admin.html?tab=upresneni' + (caseId ? '&case=' + encodeURIComponent(caseId) : '');
  window.open(url, '_blank');
}

// ─── Ulozeni pripadu do OEES API / Google Sheets ─────────────────────────────

async function ulozCase() {
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> Ukládám...';

  const caseId = 'CASE-' + Date.now().toString().slice(-8);

  const caseData = {
    case_id:       caseId,
    created:       new Date().toISOString(),
    company:       document.getElementById('o_nazev')?.value || '',
    contact_email: document.getElementById('o_email')?.value || '',
    contact_phone: document.getElementById('o_telefon')?.value || '',
    address:       [document.getElementById('o_sidlo_ulice')?.value, document.getElementById('o_sidlo_obec')?.value, document.getElementById('o_sidlo_psc')?.value].filter(Boolean).join(', '),
    type:          document.getElementById('o_typ')?.value || '',
    data_json:     JSON.stringify(OEES_STATE.case)
  };

  try {
    // Pokus s CORS
    const response = await fetch(OEES_CONFIG.api_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData)
    });

    if (response.ok) {
      OEES_STATE.case.id = caseId;
      btn.innerHTML = '&#10004; Uloženo – Case #' + caseId;
      btn.style.background = 'var(--success)';
      return;
    }
    throw new Error('HTTP ' + response.status);
  } catch (err) {
    // Fallback: no-cors mod (data se odeslou, ale nedostaneme odpoved)
    try {
      await fetch(OEES_CONFIG.api_url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(caseData)
      });
      OEES_STATE.case.id = caseId;
      btn.innerHTML = '&#10004; Odesláno – Case #' + caseId;
      btn.style.background = 'var(--success)';
    } catch (err2) {
      OEES_STATE.case.id = caseId;
      btn.innerHTML = '&#9888; Offline – Case #' + caseId;
      btn.style.background = 'var(--warning)';
      btn.disabled = false;
      console.log('OEES API chyba:', err2.message, 'Data:', caseData);
    }
  }
}

// ─── Generovani studie ───────────────────────────────────────────────────────

function generujStudii() {
  alert('Generování předběžné studie – bude implementováno ve Fázi 2.');
}

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
  // Uloz pri kazde zmene vstupniho pole
  document.addEventListener('input', ulozFormStav);
  document.addEventListener('change', ulozFormStav);
}

function resetFormStav() {
  localStorage.removeItem(OEES_STORAGE_KEY);
  location.reload();
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

  console.log('OEES Kalkulator v0.3.0 | NaEnergie.cz | ' + new Date().toLocaleDateString('cs-CZ'));
});
