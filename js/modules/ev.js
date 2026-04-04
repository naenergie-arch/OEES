/**
 * OEES Modul: EV nabijecki
 * Typy nabijecek, spotreba, naklady, tarify, dotace, provoz
 */

'use strict';

// ─── Data EV nabijecek ──────────────────────────────────────────────────────
const EV_DATA = {
  typy: {
    'ac_3_7': {
      nazev: 'AC 3,7 kW (1-fazova)',
      popis: 'Domaci wallbox, nabiti za 8-12h',
      vykon_kw: 3.7,
      cena_od: 15000,
      cena_do: 25000,
      instalace: 8000
    },
    'ac_7_4': {
      nazev: 'AC 7,4 kW (1-fazova)',
      popis: 'Rychlejsi domaci, nabiti za 4-6h',
      vykon_kw: 7.4,
      cena_od: 18000,
      cena_do: 35000,
      instalace: 12000
    },
    'ac_11': {
      nazev: 'AC 11 kW (3-fazova)',
      popis: 'Firemni/polo-verejne, nabiti za 3-4h',
      vykon_kw: 11,
      cena_od: 25000,
      cena_do: 55000,
      instalace: 18000
    },
    'ac_22': {
      nazev: 'AC 22 kW (3-fazova)',
      popis: 'Firemni/verejne, nabiti za 1,5-2h',
      vykon_kw: 22,
      cena_od: 40000,
      cena_do: 80000,
      instalace: 25000
    },
    'dc_50': {
      nazev: 'DC 50 kW (rychlonabijeci)',
      popis: 'Verejne stanice, nabiti za 30-60 min',
      vykon_kw: 50,
      cena_od: 500000,
      cena_do: 900000,
      instalace: 150000
    },
    'dc_150': {
      nazev: 'DC 150 kW (ultra-rychlo)',
      popis: 'Dialnicni stanice, nabiti za 15-25 min',
      vykon_kw: 150,
      cena_od: 1200000,
      cena_do: 2500000,
      instalace: 300000
    }
  },

  // Prumerna spotreba EV
  spotreba_kwh_100km: 18, // kWh/100 km prumer

  // Cena elektriny pro EV
  cena_domaci_kwh: 3.80,    // bezna sazba
  cena_tc_sazba_kwh: 2.50,  // sazba D57d
  cena_firemni_kwh: 3.20,
  cena_verejne_kwh: 8.50,   // verejne nabijeni prumer

  // Porovnani s benzinem/naftou
  cena_benzin_litr: 38.50,
  cena_nafta_litr: 37.00,
  spotreba_benzin_l_100km: 7.0,
  spotreba_nafta_l_100km: 5.5,

  // Dotace SFZP – podpora EV infrastruktury
  dotace: {
    firma_ac: { procent: 0.30, max: 30000 },
    firma_dc: { procent: 0.30, max: 300000 },
    obec_ac:  { procent: 0.50, max: 50000 },
    obec_dc:  { procent: 0.50, max: 500000 }
  }
};

// ─── Vypocet ────────────────────────────────────────────────────────────────

function vypocetEV() {
  const container = document.getElementById('ev_vysledky');
  if (!container) return;

  const typ = document.getElementById('ev_typ')?.value || 'ac_11';
  const pocet = parseInt(document.getElementById('ev_pocet')?.value) || 1;
  const najezd_km = parseFloat(document.getElementById('ev_najezd')?.value) || 0;
  const pocet_aut = parseInt(document.getElementById('ev_pocet_aut')?.value) || 1;
  const sazba = document.getElementById('ev_sazba')?.value || 'firemni';
  const srovnani = document.getElementById('ev_srovnani')?.value || 'benzin';
  const chceDotaci = document.getElementById('ev_dotace')?.checked || false;
  const jeFirma = document.getElementById('ev_je_firma')?.checked || true;

  if (najezd_km <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte rocni najezd pro zobrazeni analyzy.</p>';
    return;
  }

  const nabijeci = EV_DATA.typy[typ];

  // Investice
  const cena_prumer = (nabijeci.cena_od + nabijeci.cena_do) / 2;
  const investice = Math.round((cena_prumer + nabijeci.instalace) * pocet);

  // Dotace
  let dotace = 0;
  if (chceDotaci) {
    const isDC = typ.startsWith('dc_');
    const dotaceTyp = jeFirma ? (isDC ? 'firma_dc' : 'firma_ac') : (isDC ? 'obec_dc' : 'obec_ac');
    const d = EV_DATA.dotace[dotaceTyp];
    dotace = Math.min(Math.round(investice * d.procent), d.max * pocet);
  }

  const investice_po_dotaci = Math.max(0, investice - dotace);

  // Spotreba elektriny
  const celkovy_najezd = najezd_km * pocet_aut;
  const spotreba_kwh = celkovy_najezd * EV_DATA.spotreba_kwh_100km / 100;

  // Cena za elektricke nabijeni
  let cena_kwh;
  switch (sazba) {
    case 'domaci': cena_kwh = EV_DATA.cena_domaci_kwh; break;
    case 'tc_sazba': cena_kwh = EV_DATA.cena_tc_sazba_kwh; break;
    case 'verejne': cena_kwh = EV_DATA.cena_verejne_kwh; break;
    default: cena_kwh = EV_DATA.cena_firemni_kwh;
  }
  const naklad_ev = Math.round(spotreba_kwh * cena_kwh);

  // Srovnani s fosilnim palivem
  let naklad_fosil, cena_palivo, spotreba_palivo;
  if (srovnani === 'nafta') {
    spotreba_palivo = EV_DATA.spotreba_nafta_l_100km;
    cena_palivo = EV_DATA.cena_nafta_litr;
  } else {
    spotreba_palivo = EV_DATA.spotreba_benzin_l_100km;
    cena_palivo = EV_DATA.cena_benzin_litr;
  }
  naklad_fosil = Math.round(celkovy_najezd * spotreba_palivo / 100 * cena_palivo);

  const uspora_provoz = naklad_fosil - naklad_ev;
  const navratnost = uspora_provoz > 0 ? (investice_po_dotaci / uspora_provoz).toFixed(1) : '---';

  // Emise CO2
  const co2_ev = Math.round(spotreba_kwh * 0.35); // 350g CO2/kWh (CZ mix)
  const co2_fosil = Math.round(celkovy_najezd * (srovnani === 'nafta' ? 2.65 : 2.31) * spotreba_palivo / 100);
  const co2_uspora = co2_fosil - co2_ev;

  // Uloz do stavu
  OEES_STATE.case.ev = {
    typ, pocet, najezd_km, pocet_aut,
    investice, dotace, investice_po_dotaci,
    naklad_ev, naklad_fosil, uspora_provoz, navratnost,
    co2_uspora
  };

  container.innerHTML = `
    <div class="results-panel">
      <h3>EV nabijeni – ekonomika a srovnani</h3>

      <table class="breakdown-table">
        <thead><tr><th>Parametr</th><th>Hodnota</th></tr></thead>
        <tbody>
          <tr><td>Typ nabijecki</td><td>${nabijeci.nazev} x ${pocet}</td></tr>
          <tr><td>Celkovy rocni najezd</td><td>${celkovy_najezd.toLocaleString('cs-CZ')} km (${pocet_aut} aut)</td></tr>
          <tr><td>Rocni spotreba elektriny</td><td>${spotreba_kwh.toLocaleString('cs-CZ')} kWh</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:20px">Provozni naklady – EV vs ${srovnani === 'nafta' ? 'nafta' : 'benzin'}</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Naklady EV (${cena_kwh} Kc/kWh)</td><td>${naklad_ev.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr><td>Naklady ${srovnani} (${cena_palivo} Kc/l)</td><td>${naklad_fosil.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr class="total-row"><td><strong>Rocni uspora na palivu</strong></td>
            <td class="text-success"><strong>${uspora_provoz.toLocaleString('cs-CZ')} Kc/rok</strong></td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:20px">Investice</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Nabijecki + instalace</td><td>${investice.toLocaleString('cs-CZ')} Kc</td></tr>
          ${dotace > 0 ? `<tr><td>Dotace</td><td class="text-success">-${dotace.toLocaleString('cs-CZ')} Kc</td></tr>` : ''}
          <tr><td>Investice po dotaci</td><td><strong>${investice_po_dotaci.toLocaleString('cs-CZ')} Kc</strong></td></tr>
          <tr><td>Navratnost (jen palivo)</td><td><strong>${navratnost} let</strong></td></tr>
        </tbody>
      </table>

      <div style="margin-top:16px;padding:12px;background:#e8f5e9;border-radius:var(--radius-sm)">
        <strong>&#127807; Ekologie:</strong> Uspora ${co2_uspora.toLocaleString('cs-CZ')} kg CO2/rok
        oproti ${srovnani === 'nafta' ? 'nafte' : 'benzinu'}.
      </div>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulEV(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const typOptions = Object.entries(EV_DATA.typy).map(([key, t]) =>
    `<option value="${key}">${t.nazev} (${t.cena_od.toLocaleString('cs-CZ')}–${t.cena_do.toLocaleString('cs-CZ')} Kc)</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128663;</span> EV nabijeci infrastruktura – analyza a ekonomika
      </div>

      <div class="state-grid">
        <!-- NABIJECI INFRASTRUKTURA -->
        <div class="state-panel stavajici">
          <h3>Nabijeci stanice</h3>

          <div class="field">
            <label>Typ nabijecki</label>
            <select id="ev_typ" onchange="vypocetEV()">
              ${typOptions}
            </select>
          </div>

          <div class="field">
            <label>Pocet nabijecek</label>
            <input type="number" id="ev_pocet" value="1" min="1" max="50" oninput="vypocetEV()">
          </div>

          <div class="field">
            <label>Sazba za elektrinu</label>
            <select id="ev_sazba" onchange="vypocetEV()">
              <option value="firemni">Firemni tarif (~3,20 Kc/kWh)</option>
              <option value="domaci">Domaci sazba (~3,80 Kc/kWh)</option>
              <option value="tc_sazba">Sazba D57d – TC (~2,50 Kc/kWh)</option>
              <option value="verejne">Verejne nabijeni (~8,50 Kc/kWh)</option>
            </select>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="ev_je_firma" checked onchange="vypocetEV()">
              Firemni objekt
            </label>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="ev_dotace" checked onchange="vypocetEV()">
              Uvazovat dotaci
            </label>
          </div>
        </div>

        <!-- PROVOZ -->
        <div class="state-panel budouci">
          <h3>Provoz vozidel</h3>

          <div class="field">
            <label>Pocet elektromobilu</label>
            <input type="number" id="ev_pocet_aut" value="1" min="1" max="100" oninput="vypocetEV()">
          </div>

          <div class="field">
            <label>Rocni najezd na auto <span class="unit">km</span></label>
            <input type="number" id="ev_najezd" placeholder="napr. 20000" min="0" oninput="vypocetEV()">
          </div>

          <div class="field">
            <label>Srovnani s</label>
            <select id="ev_srovnani" onchange="vypocetEV()">
              <option value="benzin">Benzin (~7 l/100km, ${EV_DATA.cena_benzin_litr} Kc/l)</option>
              <option value="nafta">Nafta (~5,5 l/100km, ${EV_DATA.cena_nafta_litr} Kc/l)</option>
            </select>
          </div>
        </div>
      </div>

      <div id="ev_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte rocni najezd pro zobrazeni analyzy.</p>
      </div>
    </div>`;
}
