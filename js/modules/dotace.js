/**
 * OEES Modul: Dotace
 * Rucni vlozeni dotace, predpokladana vyse, velikost podniku, Praha
 */

'use strict';

// ─── Data dotaci ────────────────────────────────────────────────────────────
const DOTACE_DATA = {
  programy: {
    'nzu_light': {
      nazev: 'NZU Light (domacnosti)',
      popis: 'Pro seniory, nizke prijmy',
      max_kc: 150000,
      procent: 1.00
    },
    'nzu': {
      nazev: 'Nova zelena usporam (NZU)',
      popis: 'Rodinne domy – FVE, TC, izolace',
      max_kc: 350000,
      procent: 0.50
    },
    'optak': {
      nazev: 'OPTAK (MPO)',
      popis: 'Firmy – energeticke uspory',
      max_kc: 15000000,
      procent: 0.35
    },
    'modernizacni_fond': {
      nazev: 'Modernizacni fond (SFZP)',
      popis: 'Velke projekty – OZE, komunalni energetika',
      max_kc: 50000000,
      procent: 0.40
    },
    'irop': {
      nazev: 'IROP (MMR)',
      popis: 'Verejne budovy – zatepleni, OZE',
      max_kc: 20000000,
      procent: 0.70
    },
    'vlastni': {
      nazev: 'Vlastni / jiny program',
      popis: 'Rucne zadana castka dotace',
      max_kc: 0,
      procent: 0
    }
  },

  // Velikost podniku (vliv na dotaci)
  velikost: {
    'maly':   { nazev: 'Maly podnik (do 50 zamestnancu)', bonus: 0.20 },
    'stredni':{ nazev: 'Stredni podnik (50-250)',          bonus: 0.10 },
    'velky':  { nazev: 'Velky podnik (nad 250)',            bonus: 0.00 }
  }
};

// ─── Vypocet dotace ─────────────────────────────────────────────────────────

function vypocetDotace() {
  const container = document.getElementById('dotace_vysledky');
  if (!container) return;

  const program = document.getElementById('dotace_program')?.value || 'optak';
  const celkova_investice = parseFloat(document.getElementById('dotace_investice')?.value) || 0;
  const rucni_castka = parseFloat(document.getElementById('dotace_rucni')?.value) || 0;
  const velikost = document.getElementById('dotace_velikost')?.value || 'maly';
  const jePraha = document.getElementById('dotace_praha')?.checked || false;

  if (celkova_investice <= 0 && rucni_castka <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte celkovou investici nebo rucni castku dotace.</p>';
    return;
  }

  const prog = DOTACE_DATA.programy[program];
  const vel = DOTACE_DATA.velikost[velikost];

  let dotace = 0;
  if (program === 'vlastni') {
    dotace = rucni_castka;
  } else {
    const zakladni_procent = prog.procent + vel.bonus;
    const effektivni_procent = Math.min(zakladni_procent, 0.85); // max 85%
    dotace = Math.min(Math.round(celkova_investice * effektivni_procent), prog.max_kc);

    // Praha muze mit jiny rezim
    if (jePraha && program === 'optak') {
      dotace = Math.round(dotace * 0.95); // Praha - mirne nizsi u nekterych programu
    }
  }

  const investice_po = Math.max(0, celkova_investice - dotace);

  // Uloz do stavu
  OEES_STATE.case.dotace = {
    program, dotace, celkova_investice, investice_po, velikost, jePraha
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Odhad dotace</h3>

      <table class="breakdown-table">
        <tbody>
          <tr><td>Dotacni program</td><td>${prog.nazev}</td></tr>
          <tr><td>Celkova investice</td><td>${celkova_investice.toLocaleString('cs-CZ')} Kc</td></tr>
          <tr><td>Velikost podniku</td><td>${vel.nazev}</td></tr>
          ${program !== 'vlastni' ? `
            <tr><td>Zakladni podpora</td><td>${(prog.procent * 100).toFixed(0)} % + bonus ${(vel.bonus * 100).toFixed(0)} %</td></tr>
            <tr><td>Max. dotace programu</td><td>${prog.max_kc.toLocaleString('cs-CZ')} Kc</td></tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Predpokladana dotace</strong></td>
            <td class="text-success"><strong>${dotace.toLocaleString('cs-CZ')} Kc</strong></td>
          </tr>
          <tr>
            <td><strong>Investice po dotaci</strong></td>
            <td><strong>${investice_po.toLocaleString('cs-CZ')} Kc</strong></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:14px;padding:12px;background:rgba(255,255,255,0.1);border-radius:var(--radius-sm);font-size:0.82rem">
        <strong>Poznamka:</strong> Odhad dotace je orientacni. Skutecna vyse zavisi na
        konkretnim dotacnim programu, casovem ramci vyzvy a splneni podminek.
      </div>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulDotace(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const programOptions = Object.entries(DOTACE_DATA.programy).map(([key, p]) =>
    `<option value="${key}">${p.nazev} – ${p.popis}</option>`
  ).join('');

  const velikostOptions = Object.entries(DOTACE_DATA.velikost).map(([key, v]) =>
    `<option value="${key}">${v.nazev}</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#127873;</span> Dotace – odhad a nastaveni
      </div>

      <div class="state-grid">
        <div class="state-panel stavajici">
          <h3>Dotacni program</h3>

          <div class="field">
            <label>Dotacni program</label>
            <select id="dotace_program" onchange="vypocetDotace()">
              ${programOptions}
            </select>
          </div>

          <div class="field">
            <label>Celkova investice projektu <span class="unit">Kc</span></label>
            <input type="number" id="dotace_investice" placeholder="napr. 2000000" min="0" oninput="vypocetDotace()">
            <small class="text-muted">Soucet vsech investic (FVE + TC + baterie + ...)</small>
          </div>

          <div class="field">
            <label>Rucne zadana castka dotace <span class="unit">Kc</span></label>
            <input type="number" id="dotace_rucni" placeholder="Pouze u vlastniho programu" min="0" oninput="vypocetDotace()">
            <small class="text-muted">Pouzije se pri volbe "Vlastni program"</small>
          </div>
        </div>

        <div class="state-panel budouci">
          <h3>Parametry zadatele</h3>

          <div class="field">
            <label>Velikost podniku</label>
            <select id="dotace_velikost" onchange="vypocetDotace()">
              ${velikostOptions}
            </select>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="dotace_praha" onchange="vypocetDotace()">
              Subjekt sidli v Praze
            </label>
            <small class="text-muted">Nektera dotacni pravidla se lisi pro Prahu</small>
          </div>
        </div>
      </div>

      <div id="dotace_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte investici pro odhad dotace.</p>
      </div>
    </div>`;
}
