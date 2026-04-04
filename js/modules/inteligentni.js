/**
 * OEES Modul: Inteligentni rizeni
 * Ridici system HW+SW, instalace, dokumentace, zaskoleni,
 * dispecerske rizeni (povinne u FVE >100 kWp)
 */

'use strict';

// ─── Data inteligentniho rizeni ─────────────────────────────────────────────
const INTELIGENTNI_DATA = {
  ridici_systemy: {
    'zakladni': {
      nazev: 'Zakladni rizeni (termostat + casovac)',
      popis: 'Jednoduche casove rizeni topeni/chlazeni',
      cena_hw: 15000,
      cena_sw: 0,
      uspora_procent: 0.08
    },
    'pokrocily': {
      nazev: 'Pokrocily EMS (Energy Management System)',
      popis: 'Rizeni FVE + baterie + TC dle predikce',
      cena_hw: 45000,
      cena_sw: 12000,
      uspora_procent: 0.15
    },
    'plny': {
      nazev: 'Plny HEMS + smart grid',
      popis: 'Kompletni optimalizace vyroba/spotreba/sit',
      cena_hw: 85000,
      cena_sw: 25000,
      uspora_procent: 0.22
    },
    'prumyslovy': {
      nazev: 'Prumyslovy SCADA/EMS',
      popis: 'Velke objekty, VN, peak shaving, demand response',
      cena_hw: 250000,
      cena_sw: 80000,
      uspora_procent: 0.18
    }
  },

  // Instalace a dokumentace
  instalace_zakladni: 8000,
  instalace_pokrocila: 25000,
  dokumentace: 15000,
  zaskoleni: 8000,

  // Dispecerske rizeni (povinne pro FVE > 100 kWp)
  dispecink: {
    'neni': { nazev: 'Neni potreba', cena_rok: 0 },
    'zakladni': { nazev: 'Zakladni dispecink', cena_rok: 12000 },
    'plny': { nazev: 'Plny dispecink s regulaci', cena_rok: 36000 }
  }
};

// ─── Vypocet ────────────────────────────────────────────────────────────────

function vypocetInteligentni() {
  const container = document.getElementById('inteligentni_vysledky');
  if (!container) return;

  const typ = document.getElementById('int_typ')?.value || 'pokrocily';
  const rocni_naklady_energie = parseFloat(document.getElementById('int_rocni_naklady')?.value) || 0;
  const chceDokumentaci = document.getElementById('int_dokumentace')?.checked || false;
  const chceZaskoleni = document.getElementById('int_zaskoleni')?.checked || false;
  const dispecink_typ = document.getElementById('int_dispecink')?.value || 'neni';

  if (rocni_naklady_energie <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte rocni naklady na energii.</p>';
    return;
  }

  const system = INTELIGENTNI_DATA.ridici_systemy[typ];
  const dispecink = INTELIGENTNI_DATA.dispecink[dispecink_typ];

  // Investice
  let investice = system.cena_hw + system.cena_sw;
  const je_prumyslovy = (typ === 'prumyslovy' || typ === 'plny');
  investice += je_prumyslovy ? INTELIGENTNI_DATA.instalace_pokrocila : INTELIGENTNI_DATA.instalace_zakladni;
  if (chceDokumentaci) investice += INTELIGENTNI_DATA.dokumentace;
  if (chceZaskoleni) investice += INTELIGENTNI_DATA.zaskoleni;

  // Rocni uspora
  const uspora_energie = Math.round(rocni_naklady_energie * system.uspora_procent);
  const rocni_naklad_dispecink = dispecink.cena_rok;
  const rocni_uspora = uspora_energie - rocni_naklad_dispecink;
  const navratnost = rocni_uspora > 0 ? (investice / rocni_uspora).toFixed(1) : '---';

  // Uloz do stavu
  OEES_STATE.case.inteligentni = {
    typ, investice, uspora_energie, rocni_uspora, navratnost,
    dispecink: dispecink_typ
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Inteligentni rizeni – ekonomika</h3>

      <table class="breakdown-table">
        <thead><tr><th>Polozka</th><th>Hodnota</th></tr></thead>
        <tbody>
          <tr><td>Ridici system</td><td>${system.nazev}</td></tr>
          <tr><td>Ocekavana uspora energie</td><td>${(system.uspora_procent * 100).toFixed(0)} %</td></tr>
          <tr><td>Investice</td><td>${investice.toLocaleString('cs-CZ')} Kc</td></tr>
          <tr><td>Uspora na energiich</td><td class="text-success">${uspora_energie.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          ${rocni_naklad_dispecink > 0 ? `<tr><td>Dispecerske rizeni</td><td>-${rocni_naklad_dispecink.toLocaleString('cs-CZ')} Kc/rok</td></tr>` : ''}
          <tr class="total-row">
            <td><strong>Cista rocni uspora</strong></td>
            <td class="${rocni_uspora > 0 ? 'text-success' : 'text-danger'}">
              <strong>${rocni_uspora.toLocaleString('cs-CZ')} Kc/rok</strong>
            </td>
          </tr>
          <tr><td>Navratnost</td><td><strong>${navratnost} let</strong></td></tr>
        </tbody>
      </table>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulInteligentni(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const typOptions = Object.entries(INTELIGENTNI_DATA.ridici_systemy).map(([key, s]) =>
    `<option value="${key}">${s.nazev}</option>`
  ).join('');

  const dispecinkOptions = Object.entries(INTELIGENTNI_DATA.dispecink).map(([key, d]) =>
    `<option value="${key}">${d.nazev} ${d.cena_rok > 0 ? '(' + d.cena_rok.toLocaleString('cs-CZ') + ' Kc/rok)' : ''}</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#129302;</span> Inteligentni rizeni – EMS & dispecink
      </div>

      <div class="state-grid">
        <div class="state-panel stavajici">
          <h3>Ridici system</h3>

          <div class="field">
            <label>Typ ridiciho systemu</label>
            <select id="int_typ" onchange="vypocetInteligentni()">
              ${typOptions}
            </select>
          </div>

          <div class="field">
            <label>Celkove rocni naklady na energii <span class="unit">Kc/rok</span></label>
            <input type="number" id="int_rocni_naklady" placeholder="napr. 500000" min="0" oninput="vypocetInteligentni()">
            <small class="text-muted">Elektrina + plyn + voda (ze souhrnu)</small>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="int_dokumentace" onchange="vypocetInteligentni()">
              Projektova dokumentace (+${INTELIGENTNI_DATA.dokumentace.toLocaleString('cs-CZ')} Kc)
            </label>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="int_zaskoleni" onchange="vypocetInteligentni()">
              Zaskoleni obsluhy (+${INTELIGENTNI_DATA.zaskoleni.toLocaleString('cs-CZ')} Kc)
            </label>
          </div>
        </div>

        <div class="state-panel budouci">
          <h3>Dispecerske rizeni</h3>

          <div class="field">
            <label>Dispecerske rizeni</label>
            <select id="int_dispecink" onchange="vypocetInteligentni()">
              ${dispecinkOptions}
            </select>
            <small class="text-muted">Povinne pro FVE nad 100 kWp (automaticka regulace vykonu)</small>
          </div>
        </div>
      </div>

      <div id="inteligentni_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte rocni naklady na energii pro zobrazeni analyzy.</p>
      </div>
    </div>`;
}
