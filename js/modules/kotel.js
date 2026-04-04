/**
 * OEES Modul: Plynovy kotel (tepelny zdroj)
 * Podil na vyrobe tepla, provozni hodiny, typ zarizeni,
 * ucinnost, naddimenzovani, pocet kotlu
 */

'use strict';

// ─── Data plynovych kotlu ───────────────────────────────────────────────────
const KOTEL_DATA = {
  typy: {
    'kotel_10_20': {
      nazev: 'Kondenzacni kotel 10-20 kW',
      vykon_od: 10,
      vykon_do: 20,
      ucinnost: 0.98,
      cena_od: 35000,
      cena_do: 65000
    },
    'kotel_20_30': {
      nazev: 'Kondenzacni kotel 20-30 kW',
      vykon_od: 20,
      vykon_do: 30,
      ucinnost: 0.97,
      cena_od: 45000,
      cena_do: 80000
    },
    'kotel_30_50': {
      nazev: 'Kondenzacni kotel 30-50 kW',
      vykon_od: 30,
      vykon_do: 50,
      ucinnost: 0.96,
      cena_od: 75000,
      cena_do: 130000
    },
    'kotel_50_100': {
      nazev: 'Kaskada / kotel 50-100 kW',
      vykon_od: 50,
      vykon_do: 100,
      ucinnost: 0.95,
      cena_od: 150000,
      cena_do: 280000
    },
    'kotel_100_300': {
      nazev: 'Prumyslovy kotel 100-300 kW',
      vykon_od: 100,
      vykon_do: 300,
      ucinnost: 0.94,
      cena_od: 350000,
      cena_do: 700000
    },
    'kotel_300_plus': {
      nazev: 'Velky prumyslovy kotel 300+ kW',
      vykon_od: 300,
      vykon_do: 1000,
      ucinnost: 0.93,
      cena_od: 700000,
      cena_do: 2000000
    }
  },

  // Instalace
  instalace_procent: 0.20, // 20% z ceny zarizeni

  // Servis
  servis_rocni_procent: 0.02 // 2% z investice
};

// ─── Vypocet ────────────────────────────────────────────────────────────────

function vypocetKotel() {
  const container = document.getElementById('kotel_vysledky');
  if (!container) return;

  const typ = document.getElementById('kotel_typ')?.value || 'kotel_30_50';
  const pocet = parseInt(document.getElementById('kotel_pocet')?.value) || 1;
  const podil_tepla = parseFloat(document.getElementById('kotel_podil_tepla')?.value) || 0;
  const provozni_hodiny = parseInt(document.getElementById('kotel_hodiny')?.value) || 0;
  const naddimenzovani = parseFloat(document.getElementById('kotel_naddimenzovani')?.value) || 0;
  const cena_plynu = parseFloat(document.getElementById('kotel_cena_plynu')?.value) || 1350;
  const stavajici_ucinnost = parseFloat(document.getElementById('kotel_stav_ucinnost')?.value) || 85;

  if (podil_tepla <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte podil na vyrobe tepla pro zobrazeni analyzy.</p>';
    return;
  }

  const kotel = KOTEL_DATA.typy[typ];

  // Investice
  const cena_prumer = (kotel.cena_od + kotel.cena_do) / 2;
  const investice_zarizeni = Math.round(cena_prumer * pocet);
  const instalace = Math.round(investice_zarizeni * KOTEL_DATA.instalace_procent);
  const investice = investice_zarizeni + instalace;

  // Spotreba plynu – stavajici kotel
  const stavajici_spotreba_mwh = podil_tepla / (stavajici_ucinnost / 100);

  // Spotreba plynu – novy kotel
  const novy_spotreba_mwh = podil_tepla / kotel.ucinnost;

  // Uspora na palivu
  const uspora_mwh = stavajici_spotreba_mwh - novy_spotreba_mwh;
  const uspora_kc = Math.round(uspora_mwh * cena_plynu);

  // Servisni naklady
  const servis = Math.round(investice * KOTEL_DATA.servis_rocni_procent);

  // Rocni bilance
  const rocni_uspora = uspora_kc - servis;
  const navratnost = rocni_uspora > 0 ? (investice / rocni_uspora).toFixed(1) : '---';

  // Uloz do stavu
  OEES_STATE.case.kotel = {
    typ, pocet, podil_tepla, provozni_hodiny,
    investice, uspora_kc, rocni_uspora, navratnost,
    stavajici_spotreba_mwh, novy_spotreba_mwh
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>Plynovy kotel – ekonomika</h3>

      <table class="breakdown-table">
        <thead><tr><th>Parametr</th><th>Hodnota</th></tr></thead>
        <tbody>
          <tr><td>Typ kotle</td><td>${kotel.nazev} x ${pocet}</td></tr>
          <tr><td>Podil na vyrobe tepla</td><td>${podil_tepla} MWh/rok</td></tr>
          <tr><td>Provozni hodiny</td><td>${provozni_hodiny.toLocaleString('cs-CZ')} hod/rok</td></tr>
          <tr><td>Ucinnost noveho kotle</td><td>${(kotel.ucinnost * 100).toFixed(0)} %</td></tr>
          <tr><td>Ucinnost stavajiciho</td><td>${stavajici_ucinnost} %</td></tr>
          ${naddimenzovani > 0 ? `<tr><td>Naddimenzovani</td><td>${naddimenzovani} %</td></tr>` : ''}
        </tbody>
      </table>

      <h3 style="margin-top:20px">Financni analyza</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Investice (zarizeni + instalace)</td><td>${investice.toLocaleString('cs-CZ')} Kc</td></tr>
          <tr><td>Spotreba plynu – stavajici</td><td>${stavajici_spotreba_mwh.toFixed(1)} MWh/rok</td></tr>
          <tr><td>Spotreba plynu – novy</td><td>${novy_spotreba_mwh.toFixed(1)} MWh/rok</td></tr>
          <tr><td>Uspora na palivu</td><td class="text-success">${uspora_kc.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr><td>Servisni naklady</td><td>${servis.toLocaleString('cs-CZ')} Kc/rok</td></tr>
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

function inicializujModulKotel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const typOptions = Object.entries(KOTEL_DATA.typy).map(([key, t]) =>
    `<option value="${key}">${t.nazev} (${t.vykon_od}-${t.vykon_do} kW)</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128293;</span> Plynovy kotel – tepelny zdroj
      </div>

      <div class="state-grid">
        <!-- PARAMETRY KOTLE -->
        <div class="state-panel stavajici">
          <h3>Parametry noveho kotle</h3>

          <div class="field">
            <label>Typ plynoveho kotle</label>
            <select id="kotel_typ" onchange="vypocetKotel()">
              ${typOptions}
            </select>
          </div>

          <div class="field">
            <label>Pocet kotlu</label>
            <input type="number" id="kotel_pocet" value="1" min="1" max="10" oninput="vypocetKotel()">
          </div>

          <div class="field">
            <label>Podil na vyrobe tepla <span class="unit">MWh/rok</span></label>
            <input type="number" id="kotel_podil_tepla" placeholder="napr. 300" min="0" step="1" oninput="vypocetKotel()">
            <small class="text-muted">Kolik MWh tepla ma kotel pokryt rocne</small>
          </div>

          <div class="field">
            <label>Provozni hodiny <span class="unit">hod/rok</span></label>
            <input type="number" id="kotel_hodiny" placeholder="napr. 2500" min="0" max="8760" oninput="vypocetKotel()">
          </div>

          <div class="field">
            <label>Naddimenzovani <span class="unit">%</span></label>
            <input type="number" id="kotel_naddimenzovani" value="0" min="0" max="50" step="5" oninput="vypocetKotel()">
          </div>
        </div>

        <!-- STAVAJICI STAV -->
        <div class="state-panel budouci">
          <h3>Stavajici stav & ekonomika</h3>

          <div class="field">
            <label>Ucinnost stavajiciho kotle <span class="unit">%</span></label>
            <input type="number" id="kotel_stav_ucinnost" value="85" min="50" max="100" step="1" oninput="vypocetKotel()">
            <small class="text-muted">Stary kotel typicky 80-90%, kondenzacni 95-98%</small>
          </div>

          <div class="field">
            <label>Cena plynu <span class="unit">Kc/MWh</span></label>
            <input type="number" id="kotel_cena_plynu" value="1350" min="0" step="10" oninput="vypocetKotel()">
          </div>
        </div>
      </div>

      <div id="kotel_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte podil na vyrobe tepla pro zobrazeni analyzy.</p>
      </div>
    </div>`;
}
