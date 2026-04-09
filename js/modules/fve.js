/**
 * OEES – Modul FVE (Fotovoltaika)
 * Výpočet výkonu, výroby, vlastní spotřeby, přetoků a ekonomiky FVE systému.
 * Napojení na PVGIS API (EU, zdarma) pro reálná data slunečního záření.
 *
 * Vstupy: lokalita (GPS nebo adresa), střecha (plocha, orientace, sklon),
 *         stávající spotřeba, tarif
 * Výstupy: doporučený kWp, roční výroba, vlastní spotřeba, přetoky,
 *          investice, návratnost, ROI 25 let
 */

'use strict';

// ─── Databáze solárního záření pro regiony ČR ────────────────────────────────
// Zdroj: PVGIS EU, orientační hodnoty pro kalkulaci bez API
const SOLARNI_ZARIZENI_CR = {
  // Průměrná roční irradiace (kWh/m²/rok) pro horizontální plochu
  // a přibližný faktor výkonu systému (performance ratio)
  "Praha":      { irradiace: 1050, pr: 0.82 },
  "Brno":       { irradiace: 1080, pr: 0.82 },
  "Ostrava":    { irradiace: 980,  pr: 0.81 },
  "Plzen":      { irradiace: 1020, pr: 0.82 },
  "Liberec":    { irradiace: 960,  pr: 0.80 },
  "Olomouc":    { irradiace: 1040, pr: 0.82 },
  "Ceske_Bud":  { irradiace: 1060, pr: 0.82 },
  "Hradec_Kral":{ irradiace: 1000, pr: 0.81 },
  "Zlin":       { irradiace: 1070, pr: 0.82 },
  "Jihlava":    { irradiace: 1040, pr: 0.81 },
  "default":    { irradiace: 1030, pr: 0.81 }  // průměr ČR
};

// Korekční faktory pro orientaci a sklon střechy
const KOREKCE_ORIENTACE = {
  "JIH":        1.00,
  "JIH_VYCHOD": 0.95,
  "JIH_ZAPAD":  0.95,
  "VYCHOD":     0.82,
  "ZAPAD":      0.82,
  "SEVER":      0.55,
  "PLOCHÁ":     0.87
};

const KOREKCE_SKLON = {
  0:  0.87,   // plochá střecha
  15: 0.94,
  25: 0.99,
  30: 1.00,   // optimální
  35: 0.99,
  45: 0.96,
  60: 0.87
};

// Přibližná cena instalace FVE (Kč/kWp) dle velikosti systému – 2026
function cenInstallace(kwp) {
  if (kwp <= 5)   return 35000;  // Kč/kWp – malé systémy
  if (kwp <= 10)  return 31000;
  if (kwp <= 20)  return 28000;
  if (kwp <= 50)  return 25000;
  if (kwp <= 100) return 22000;
  if (kwp <= 500) return 19000;
  return 17000;                  // velké komerční systémy
}

// ─────────────────────────────────────────────────────────────────────────────
// VÝPOČETNÍ JÁDRO FVE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Odhad roční výroby FVE systému
 * @param {number} kwp         Instalovaný výkon kWp
 * @param {string} lokalita    Klíč z SOLARNI_ZARIZENI_CR
 * @param {string} orientace   Klíč z KOREKCE_ORIENTACE
 * @param {number} sklon_deg   Sklon v stupních (0-60)
 * @returns {number}           kWh/rok
 */
function odhadVyroby(kwp, lokalita, orientace, sklon_deg) {
  const sol    = SOLARNI_ZARIZENI_CR[lokalita] || SOLARNI_ZARIZENI_CR.default;
  const korOr  = KOREKCE_ORIENTACE[orientace]  || 0.90;

  // Nejbližší sklon z tabulky
  const sklony = Object.keys(KOREKCE_SKLON).map(Number);
  const nejblizsi = sklony.reduce((prev, curr) =>
    Math.abs(curr - sklon_deg) < Math.abs(prev - sklon_deg) ? curr : prev
  );
  const korSkl = KOREKCE_SKLON[nejblizsi] || 0.95;

  // Výroba = kWp × irradiace × PR × korekce orientace × korekce sklonu
  return Math.round(kwp * sol.irradiace * sol.pr * korOr * korSkl);
}

/**
 * Výpočet vlastní spotřeby a přetoků
 * @param {number} vyroba_kwh_rok  Roční výroba FVE (kWh/rok)
 * @param {number} spotreba_kwh    Roční spotřeba elektřiny (kWh/rok)
 * @param {number} self_cons_ratio Podíl vlastní spotřeby (0-1), orientační
 * @returns {object}
 */
function vypocetSelfConsumption(vyroba_kwh_rok, spotreba_kwh, self_cons_ratio) {
  // Self-consumption ratio závisí na profilu spotřeby
  // Bez baterie: typicky 25-40% pro domácnost, 40-70% pro firmy s provozem přes den
  const vlastni_spotreba = Math.min(
    vyroba_kwh_rok * self_cons_ratio,
    spotreba_kwh
  );
  const pretoky = vyroba_kwh_rok - vlastni_spotreba;
  const pokryti = spotreba_kwh > 0 ? vlastni_spotreba / spotreba_kwh : 0;

  return {
    vlastni_spotreba_kwh: Math.round(vlastni_spotreba),
    pretoky_kwh:          Math.round(pretoky),
    pokryti_procenta:     Math.round(pokryti * 100),
    ze_site_kwh:          Math.round(spotreba_kwh - vlastni_spotreba)
  };
}

/**
 * Ekonomický výpočet FVE
 * @param {object} vstup
 * @returns {object}
 */
function ekonomikaFVE(vstup) {
  const {
    kwp,
    vyroba_kwh_rok,
    vlastni_spotreba_kwh,
    pretoky_kwh,
    cena_elektriny_kc_mwh,   // průměrná cena el. ze sítě (Kč/MWh)
    vykupni_cena_kc_mwh,      // cena výkupu přetoků (Kč/MWh), typicky 2000-3000
    degrace_rocni = 0.005,    // roční degradace výkonu (0.5%)
    inflace_energie = 0.04,   // roční zdražení energie (4%)
    horizont_let = 25,
    pretoky_detail = null
  } = vstup;

  const investice = Math.round(kwp * cenInstallace(kwp));

  // Roční úspora v roce 1
  const uspora_vlastni  = vlastni_spotreba_kwh * cena_elektriny_kc_mwh / 1000;
  const prijem_pretoky  = pretoky_kwh * vykupni_cena_kc_mwh / 1000;
  const rocni_prinos_r1 = Math.round(uspora_vlastni + prijem_pretoky);

  // 25-letý horizont s degracía a inflací
  let celkovy_prinos = 0;
  let kumulativni = 0;
  let navratnost_rok = null;
  const cashflow = [];

  for (let rok = 1; rok <= horizont_let; rok++) {
    const degradace_faktor  = Math.pow(1 - degrace_rocni, rok - 1);
    const inflace_faktor    = Math.pow(1 + inflace_energie, rok - 1);
    const prinos_rok        = Math.round(rocni_prinos_r1 * degradace_faktor * inflace_faktor);

    celkovy_prinos += prinos_rok;
    kumulativni    += prinos_rok;

    if (navratnost_rok === null && kumulativni >= investice) {
      // Přesná návratnost (interpolace)
      const predchozi = kumulativni - prinos_rok;
      const zlomek    = (investice - predchozi) / prinos_rok;
      navratnost_rok  = parseFloat((rok - 1 + zlomek).toFixed(1));
    }

    cashflow.push({ rok, prinos: prinos_rok, kumulativni });
  }

  const roi_procenta = investice > 0
    ? Math.round((celkovy_prinos - investice) / investice * 100)
    : 0;

  return {
    investice_kc:       investice,
    rocni_prinos_r1:    rocni_prinos_r1,
    navratnost_let:     navratnost_rok || `>${horizont_let}`,
    roi_25let_procenta: roi_procenta,
    celkovy_prinos_25l: Math.round(celkovy_prinos),
    cistý_zisk_25l:     Math.round(celkovy_prinos - investice),
    cashflow,
    cena_elektriny_kc_mwh,
    pretoky_detail
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────────────────────

function inicializujModulFVE(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">☀️</span> Fotovoltaika (FVE) – analýza a ekonomika
      </div>

      <div class="state-grid">
        <!-- Levý sloupec – parametry střechy a systému -->
        <div style="display:flex;flex-direction:column;gap:0">

          <div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
            Střecha a lokalita
          </div>

          <div class="field">
            <label>Lokalita / region</label>
            <select id="f_lokalita" onchange="spocitejFVE()">
              <option value="Praha">Praha</option>
              <option value="Brno" selected>Brno</option>
              <option value="Ostrava">Ostrava</option>
              <option value="Plzen">Plzeň</option>
              <option value="Liberec">Liberec</option>
              <option value="Olomouc">Olomouc</option>
              <option value="Ceske_Bud">České Budějovice</option>
              <option value="Hradec_Kral">Hradec Králové</option>
              <option value="Zlin">Zlín</option>
              <option value="Jihlava">Jihlava</option>
              <option value="default">Jiná / průměr ČR</option>
            </select>
          </div>

          <div class="field">
            <label>Orientace střechy</label>
            <select id="f_orientace" onchange="spocitejFVE()">
              <option value="JIH">Jih (optimální)</option>
              <option value="JIH_VYCHOD">Jihovýchod</option>
              <option value="JIH_ZAPAD">Jihozápad</option>
              <option value="VYCHOD">Východ</option>
              <option value="ZAPAD">Západ</option>
              <option value="PLOCHÁ">Plochá střecha</option>
              <option value="SEVER">Sever</option>
            </select>
          </div>

          <div class="field">
            <label>Sklon střechy <span class="unit">°</span></label>
            <select id="f_sklon" onchange="spocitejFVE()">
              <option value="0">0° – plochá</option>
              <option value="15">15°</option>
              <option value="25">25°</option>
              <option value="30" selected>30° – optimální</option>
              <option value="35">35°</option>
              <option value="45">45°</option>
              <option value="60">60°</option>
            </select>
          </div>

          <div class="field">
            <label>Dostupná plocha pro FVE <span class="unit">m²</span></label>
            <input type="number" id="f_plocha" value="80" min="10" step="5"
                   oninput="odhadniKwp(); spocitejFVE()">
            <div class="hint">1 panel ≈ 2 m², 1 panel ≈ 420–450 Wp</div>
          </div>

          <div class="field">
            <label>Instalovaný výkon <span class="unit">kWp</span></label>
            <input type="number" id="f_kwp" value="15" min="1" step="0.5"
                   oninput="spocitejFVE()">
            <div class="hint" id="f_kwp_hint">Odhadnuto dle plochy (přibližně 500 Wp/m²)</div>
          </div>

          <div class="field">
            <label>Počet střech / sekcí</label>
            <input type="number" id="f_pocet_strech" value="1" min="1" max="10"
                   oninput="spocitejFVE()">
            <div class="hint">Při více střechách s různou orientací</div>
          </div>

          <div class="field">
            <label>FVE na pozemku (ground-mounted)</label>
            <select id="f_pozemek">
              <option value="ne">Ne – na střeše</option>
              <option value="ano">Ano – na pozemku</option>
            </select>
          </div>

          <div class="field">
            <label>Počet optimizérů</label>
            <input type="number" id="f_optimizery" value="0" min="0"
                   oninput="spocitejFVE()">
            <div class="hint">Výkonové optimizéry panelů (Tigo, SolarEdge apod.)</div>
          </div>
        </div>

        <!-- Pravý sloupec – spotřeba a ekonomika -->
        <div style="display:flex;flex-direction:column;gap:0">

          <div style="font-size:0.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
            Spotřeba a ekonomika
          </div>

          <div class="field">
            <label>Roční spotřeba elektřiny <span class="unit">MWh/rok</span></label>
            <input type="number" id="f_spotreba" value="20" min="1" step="0.5"
                   oninput="spocitejFVE()">
          </div>

          <div class="field">
            <label>Provoz přes den <span class="unit">(vliv na vlastní spotřebu)</span></label>
            <select id="f_profil" onchange="spocitejFVE()">
              <option value="0.30">Domácnost (30% vlastní spotřeba)</option>
              <option value="0.45" selected>Kancelář / obchod (45%)</option>
              <option value="0.60">Výroba přes den (60%)</option>
              <option value="0.70">Průmysl 8-16h (70%)</option>
              <option value="0.40">Smíšený provoz (40%)</option>
            </select>
          </div>

          <div class="field">
            <label>Průměrná cena elektřiny ze sítě <span class="unit">Kč/MWh vč. DPH</span></label>
            <input type="number" id="f_cena_el" value="5800" min="1000" step="100"
                   oninput="spocitejFVE()">
            <div class="hint">Dodávka + distribuce + daně. Spočítáno v modulu Elektřina.</div>
          </div>

          <div class="field">
            <label>Bateriové úložiště</label>
            <select id="f_baterie" onchange="spocitejFVE()">
              <option value="ne">Bez baterie</option>
              <option value="mala">Malá (5–10 kWh) +cca 8% zvýšení SC</option>
              <option value="stredni">Střední (10–20 kWh) +cca 15% zvýšení SC</option>
              <option value="velka">Velká (20+ kWh) +cca 20% zvýšení SC</option>
            </select>
          </div>

          <div class="card-subtitle" style="margin-top:12px">Přetoky – kam jde přebytečná výroba (MWh/rok)</div>
          <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px">
            Celkový přebytek se automaticky dopočte z výroby − vlastní spotřeby.
            Rozdělte přebytek mezi cíle. Zbytek jde do sítě.
          </p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="field">
              <label>Přetoky do baterie <span class="unit">MWh/rok</span></label>
              <input type="number" id="f_pretok_baterie" value="0" min="0" step="0.1"
                     oninput="spocitejFVE()">
              <div class="hint">Úspora = koupená elektřina ze sítě</div>
            </div>
            <div class="field">
              <label>Úspora z baterie <span class="unit">Kč/MWh</span></label>
              <input type="number" id="f_cena_baterie" value="5800" min="0" step="100"
                     oninput="spocitejFVE()">
              <div class="hint">= cena elektřiny ze sítě (ušetřeno)</div>
            </div>

            <div class="field">
              <label>Přetoky do akumulace (ohřev TUV) <span class="unit">MWh/rok</span></label>
              <input type="number" id="f_pretok_akumulace" value="0" min="0" step="0.1"
                     oninput="spocitejFVE()">
              <div class="hint">Nahrazuje plyn/elektřinu na ohřev vody</div>
            </div>
            <div class="field">
              <label>Úspora z akumulace <span class="unit">Kč/MWh</span></label>
              <input type="number" id="f_cena_akumulace" value="2800" min="0" step="100"
                     oninput="spocitejFVE()">
              <div class="hint">= cena nahrazeného paliva (plyn ~2800)</div>
            </div>

            <div class="field">
              <label>Prodej do en. komunity <span class="unit">MWh/rok</span></label>
              <input type="number" id="f_pretok_komunita" value="0" min="0" step="0.1"
                     oninput="spocitejFVE()">
            </div>
            <div class="field">
              <label>Cena prodeje do komunity <span class="unit">Kč/MWh</span></label>
              <input type="number" id="f_cena_komunita" value="3500" min="0" step="100"
                     oninput="spocitejFVE()">
            </div>

            <div class="field">
              <label>Prodej do sítě <span class="unit">MWh/rok</span></label>
              <input type="number" id="f_pretok_sit" value="0" min="0" step="0.1"
                     oninput="spocitejFVE()" readonly style="background:rgba(255,255,255,0.05)">
              <div class="hint">Automaticky = přebytek − baterie − akumulace − komunita</div>
            </div>
            <div class="field">
              <label>Výkupní cena (prodej do sítě) <span class="unit">Kč/MWh</span></label>
              <input type="number" id="f_vykup" value="2500" min="0" step="100"
                     oninput="spocitejFVE()">
            </div>
          </div>

          <div class="field">
            <label>Očekávané zdražení energie <span class="unit">%/rok</span></label>
            <input type="number" id="f_inflace" value="4" min="0" max="15" step="0.5"
                   oninput="spocitejFVE()">
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="spocitejFVE()">
          ☀️ Spočítat FVE
        </button>
        <button class="btn btn-secondary" onclick="nactiPVGIS()">
          🌍 Načíst data ze satelitu (PVGIS)
        </button>
      </div>

      <div id="fve_vysledky" style="display:none"></div>
    </div>
  `;

  // Inicializuj
  odhadniKwp();
  spocitejFVE();
}

// ─── Odhad kWp dle plochy ────────────────────────────────────────────────────

function odhadniKwp() {
  const plocha = parseFloat(document.getElementById('f_plocha')?.value) || 0;
  // 1 panel 440Wp ≈ 1.8m² → ~244 Wp/m², ale účinná plocha je méně
  // Realita: ~130–160 Wp/m² instalovaného výkonu
  const odhadKwp = Math.round(plocha * 0.145 * 10) / 10;  // cca 145 Wp/m²
  const input = document.getElementById('f_kwp');
  if (input) input.value = odhadKwp;
}

// ─── Napojení na PVGIS API ───────────────────────────────────────────────────

async function nactiPVGIS() {
  // TODO: geocoding adresy → GPS souřadnice → PVGIS API call
  // PVGIS API: https://re.jrc.ec.europa.eu/api/v5_2/PVcalc
  alert('Napojení na PVGIS bude implementováno po zadání GPS souřadnic objektu.\nPro nyní používáme průměrné hodnoty pro vybraný region.');
}

// ─── Hlavní výpočet FVE ──────────────────────────────────────────────────────

function spocitejFVE() {
  const kwp         = parseFloat(document.getElementById('f_kwp')?.value) || 0;
  const lokalita    = document.getElementById('f_lokalita')?.value || 'default';
  const orientace   = document.getElementById('f_orientace')?.value || 'JIH';
  const sklon       = parseInt(document.getElementById('f_sklon')?.value) || 30;
  const spotreba    = parseFloat(document.getElementById('f_spotreba')?.value) || 0;
  const profil      = parseFloat(document.getElementById('f_profil')?.value) || 0.45;
  const cena_el     = parseFloat(document.getElementById('f_cena_el')?.value) || 5800;
  const vykup       = parseFloat(document.getElementById('f_vykup')?.value) || 2500;
  const baterie     = document.getElementById('f_baterie')?.value || 'ne';
  const inflace     = parseFloat(document.getElementById('f_inflace')?.value) || 4;

  // Přetoky v MWh/rok
  const pretok_baterie_mwh   = parseFloat(document.getElementById('f_pretok_baterie')?.value) || 0;
  const pretok_akumulace_mwh = parseFloat(document.getElementById('f_pretok_akumulace')?.value) || 0;
  const pretok_komunita_mwh  = parseFloat(document.getElementById('f_pretok_komunita')?.value) || 0;
  const cena_baterie_mwh     = parseFloat(document.getElementById('f_cena_baterie')?.value) || 5800;
  const cena_akumulace_mwh   = parseFloat(document.getElementById('f_cena_akumulace')?.value) || 2800;
  const cena_komunita_mwh    = parseFloat(document.getElementById('f_cena_komunita')?.value) || 3500;

  if (kwp <= 0) return;

  // Korekce self-consumption pro baterii
  let sc_ratio = profil;
  if (baterie === 'mala')   sc_ratio = Math.min(profil + 0.08, 0.95);
  if (baterie === 'stredni') sc_ratio = Math.min(profil + 0.15, 0.95);
  if (baterie === 'velka')   sc_ratio = Math.min(profil + 0.20, 0.95);

  // Výroba
  const vyroba = odhadVyroby(kwp, lokalita, orientace, sklon);

  // Self-consumption
  const sc = vypocetSelfConsumption(vyroba, spotreba * 1000, sc_ratio);

  // Přetoky – rozdělit celkový přebytek (MWh)
  const celkovy_prebytekMWh = sc.pretoky_kwh / 1000;
  const alokovaneMWh = pretok_baterie_mwh + pretok_akumulace_mwh + pretok_komunita_mwh;
  const pretok_sit_mwh = Math.max(0, celkovy_prebytekMWh - alokovaneMWh);
  // Aktualizuj pole "prodej do sítě" (readonly)
  const sitEl = document.getElementById('f_pretok_sit');
  if (sitEl) sitEl.value = Math.round(pretok_sit_mwh * 10) / 10;

  // Ekonomika s rozdělenými přetoky
  const ekonomika = ekonomikaFVE({
    kwp,
    vyroba_kwh_rok:        vyroba,
    vlastni_spotreba_kwh:  sc.vlastni_spotreba_kwh,
    pretoky_kwh:           sc.pretoky_kwh,
    cena_elektriny_kc_mwh: cena_el,
    // Vážená výkupní cena přetoků
    vykupni_cena_kc_mwh:   celkovy_prebytekMWh > 0
      ? Math.round((pretok_baterie_mwh * cena_baterie_mwh + pretok_akumulace_mwh * cena_akumulace_mwh
          + pretok_komunita_mwh * cena_komunita_mwh + pretok_sit_mwh * vykup) / celkovy_prebytekMWh)
      : vykup,
    inflace_energie:        inflace / 100,
    horizont_let:           25,
    // Detailní přetoky pro výsledky
    pretoky_detail: {
      baterie:   { mwh: pretok_baterie_mwh,   cena: cena_baterie_mwh },
      akumulace: { mwh: pretok_akumulace_mwh, cena: cena_akumulace_mwh },
      komunita:  { mwh: pretok_komunita_mwh,  cena: cena_komunita_mwh },
      sit:       { mwh: pretok_sit_mwh,        cena: vykup }
    }
  });

  // Uložit do OEES_STATE
  OEES_STATE.case.fve = {
    vstup: { kwp, lokalita, orientace, sklon, spotreba_mwh: spotreba, profil: sc_ratio, baterie },
    vysledek: {
      vyroba_mwh_rok: Math.round(vyroba / 100) / 10,
      vlastni_spotreba_mwh: Math.round(sc.vlastni_spotreba_kwh / 100) / 10,
      pretoky_mwh_rok: Math.round(celkovy_prebytekMWh * 10) / 10,
      pokryti_procenta: sc.pokryti_procenta,
      investice_kc: ekonomika.investice_kc,
      rocni_prinos_r1: ekonomika.rocni_prinos_r1,
      navratnost_let: ekonomika.navratnost_let,
      roi_25let_procenta: ekonomika.roi_25let_procenta,
      cisty_zisk_25l: ekonomika.cistý_zisk_25l,
      pretoky: {
        baterie_mwh: pretok_baterie_mwh,   baterie_kc_mwh: cena_baterie_mwh,
        akumulace_mwh: pretok_akumulace_mwh, akumulace_kc_mwh: cena_akumulace_mwh,
        komunita_mwh: pretok_komunita_mwh, komunita_kc_mwh: cena_komunita_mwh,
        sit_mwh: pretok_sit_mwh,           sit_kc_mwh: vykup
      }
    }
  };

  zobrazVysledkyFVE(kwp, vyroba, sc, ekonomika, spotreba * 1000);
}

function zobrazVysledkyFVE(kwp, vyroba, sc, eko, spotreba_kwh) {
  const el = document.getElementById('fve_vysledky');
  el.style.display = 'block';
  const fmt = n => new Intl.NumberFormat('cs-CZ').format(n);

  const navrat = typeof eko.navratnost_let === 'number'
    ? eko.navratnost_let.toFixed(1) + ' let'
    : eko.navratnost_let;

  el.innerHTML = `
    <div class="results-panel">
      <h3>☀️ Výsledky FVE analýzy – ${kwp} kWp</h3>

      <div class="results-grid">
        <div class="result-box">
          <div class="val">${fmt(Math.round(vyroba/100)/10)} MWh</div>
          <div class="lbl">Roční výroba</div>
        </div>
        <div class="result-box">
          <div class="val">${sc.pokryti_procenta} %</div>
          <div class="lbl">Pokrytí spotřeby z FVE</div>
        </div>
        <div class="result-box highlight">
          <div class="val">${fmt(eko.rocni_prinos_r1)} Kč</div>
          <div class="lbl">Roční přínos (rok 1)</div>
        </div>
        <div class="result-box highlight">
          <div class="val">${navrat}</div>
          <div class="lbl">Prostá návratnost</div>
        </div>
      </div>

      <table class="breakdown" style="margin-top:16px">
        <thead><tr>
          <th>Ukazatel</th><th class="num">MWh/rok</th><th class="num">Kč/MWh</th><th class="num">Kč/rok</th>
        </tr></thead>
        <tbody>
          <tr><td>Výroba FVE</td>
              <td class="num">${fmt(Math.round(vyroba/100)/10)}</td><td></td><td></td></tr>
          <tr><td>Vlastní spotřeba (úspora)</td>
              <td class="num">${fmt(Math.round(sc.vlastni_spotreba_kwh/100)/10)}</td>
              <td class="num">${fmt(eko.cena_elektriny_kc_mwh || 5800)}</td>
              <td class="num">${fmt(Math.round(sc.vlastni_spotreba_kwh * (eko.cena_elektriny_kc_mwh || 5800) / 1000))}</td></tr>
          <tr style="font-weight:600;background:rgba(100,180,255,0.08)"><td colspan="4">Přetoky – celkem ${fmt(Math.round(sc.pretoky_kwh/100)/10)} MWh/rok</td></tr>
          ${eko.pretoky_detail?.baterie?.mwh > 0 ? `<tr><td>&nbsp;&nbsp;→ Baterie</td>
              <td class="num">${fmt(eko.pretoky_detail.baterie.mwh)}</td>
              <td class="num">${fmt(eko.pretoky_detail.baterie.cena)}</td>
              <td class="num">${fmt(Math.round(eko.pretoky_detail.baterie.mwh * eko.pretoky_detail.baterie.cena))}</td></tr>` : ''}
          ${eko.pretoky_detail?.akumulace?.mwh > 0 ? `<tr><td>&nbsp;&nbsp;→ Akumulace (TUV)</td>
              <td class="num">${fmt(eko.pretoky_detail.akumulace.mwh)}</td>
              <td class="num">${fmt(eko.pretoky_detail.akumulace.cena)}</td>
              <td class="num">${fmt(Math.round(eko.pretoky_detail.akumulace.mwh * eko.pretoky_detail.akumulace.cena))}</td></tr>` : ''}
          ${eko.pretoky_detail?.komunita?.mwh > 0 ? `<tr><td>&nbsp;&nbsp;→ Energetická komunita</td>
              <td class="num">${fmt(eko.pretoky_detail.komunita.mwh)}</td>
              <td class="num">${fmt(eko.pretoky_detail.komunita.cena)}</td>
              <td class="num">${fmt(Math.round(eko.pretoky_detail.komunita.mwh * eko.pretoky_detail.komunita.cena))}</td></tr>` : ''}
          ${eko.pretoky_detail?.sit?.mwh > 0 ? `<tr><td>&nbsp;&nbsp;→ Prodej do sítě</td>
              <td class="num">${fmt(eko.pretoky_detail.sit.mwh)}</td>
              <td class="num">${fmt(eko.pretoky_detail.sit.cena)}</td>
              <td class="num">${fmt(Math.round(eko.pretoky_detail.sit.mwh * eko.pretoky_detail.sit.cena))}</td></tr>` : ''}
          <tr><td>Ze sítě zbývá odebrat</td>
              <td class="num">${fmt(Math.round(sc.ze_site_kwh/100)/10)}</td><td></td><td></td></tr>
          <tr><td>Odhadovaná investice</td>
              <td></td><td></td><td class="num">${fmt(eko.investice_kc)} Kč</td></tr>
          <tr><td>Čistý zisk za 25 let</td>
              <td></td><td></td><td class="num">${fmt(eko.cistý_zisk_25l)} Kč</td></tr>
          <tr class="total">
            <td><strong>ROI za 25 let</strong></td>
            <td></td><td></td><td class="num"><strong>${eko.roi_25let_procenta} %</strong></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:14px;background:rgba(255,255,255,0.1);border-radius:6px;padding:12px;font-size:0.83rem">
        <strong>💡 Klíčové parametry výpočtu</strong><br>
        Výroba ${new Intl.NumberFormat('cs-CZ').format(vyroba)} kWh/rok =
        ${kwp} kWp × irradiace × performance ratio × orientace × sklon.<br>
        Vlastní spotřeba ${sc.pokryti_procenta}% ze spotřeby
        ${new Intl.NumberFormat('cs-CZ').format(spotreba_kwh)} kWh/rok.<br>
        <em>Pro přesnější výsledky použijte tlačítko PVGIS (satelitní data).</em>
      </div>

      ${(function(){
        const voda = OEES_STATE.case?.voda;
        if (!voda || !voda.el_spotreba_tc_tuv_mwh || voda.el_spotreba_tc_tuv_mwh < 0.1) return '';
        const mwh = voda.el_spotreba_tc_tuv_mwh.toFixed(1);
        const celkem = (spotreba_kwh/1000 + voda.el_spotreba_tc_tuv_mwh).toFixed(1);
        return '<div style="margin-top:10px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);border-radius:6px;padding:12px;font-size:0.83rem">' +
          '<strong>💧 TČ pro TUV (z modulu Voda)</strong><br>' +
          'Tepelné čerpadlo pro ohřev TUV potřebuje <strong>' + mwh + ' MWh/rok</strong> elektřiny (COP ' + voda.cop_tc + ', podíl TČ ' + Math.round(voda.podil_tc*100) + '%).<br>' +
          'Celková spotřeba vč. TČ TUV: <strong>' + celkem + ' MWh/rok</strong>. ' +
          'Pro správné dimenzování FVE zadejte tuto hodnotu do pole Spotřeba objektu.' +
          '</div>';
      })()}
    </div>
  `;
}
