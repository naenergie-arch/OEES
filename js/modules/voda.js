/**
 * OEES Modul: Voda + TUV
 * Dle Excel V15: TUV vypocty, TUV dimenzovani, Voda-vypocty, voda cenik podklady
 *
 * Struktura:
 * 1. Spotreba studene a teple vody (m3/rok)
 * 2. TUV dimenzovani: ohrev stavajici, s FVE, s TC, s FVE+TC
 * 3. Recyklace odpadni vody (cisticky dle kapacity m3/den)
 * 4. Rekuperace tepla z odpadni vody
 * 5. Usporne prvky (sporici sprchy SV, sporici sprchy TV, perlatory, WC)
 * 6. Destovka
 * 7. Ekonomika: investice, uspora, navratnost, cash flow s inflaci
 */

'use strict';

// ─── Data dle Excel V15 ────────────────────────────────────────────────────

const VODA_DATA = {
  // Normy spotreby
  norma_tuv_l_os_den: 40,         // litrů TUV/osobu/den
  norma_studena_l_os_den: 100,    // litrů studená/osobu/den
  dt_tepelny_spad: 40,            // °C (z 10 na 50)
  doba_ohrevu_h: 8,               // hodin

  // Koeficienty uspor dle Excel Voda-výpočty řádky 37-41
  koef_uspora_studena_voda: 0.30,      // recyklace šedé vody
  koef_uspora_sporici_sprchy_sv: 0.20, // úspora studené ze spořičů sprch
  koef_uspora_sporici_sprchy_tv: 0.35, // úspora teplé ze spořičů sprch
  koef_rekuperace_ucinnost: 0.65,      // účinnost rekuperace TUV (65%)

  // Cirkulace prirazka
  prirazka_cirkulace: 0.60,  // +60% na ohřev při cirkulaci

  // TC parametry (vychozi)
  tc_cop: 3.3,               // T faktor tepelného čerpadla
  tc_podil_ohrevu: 0.85,     // podíl TČ na ohřevu TUV
  tc_ucinnost_vymeniku: 0.96,
  tc_vykon_kw: 10,           // výchozí výkon TČ pro TUV

  // Ceny (vychozi, editovatelne)
  cena_tepla_gj: 3500,       // Kč/GJ (stávající ohřev)
  cena_elektriny_kwh: 4.19,  // Kč/kWh
  cena_studena_m3: 110,      // vodné Kč/m3
  cena_tepla_m3: 176.46,     // cena teplé vody Kč/m3 (vodné+stočné+ohřev)
  cena_stocne_m3: 55,        // stočné Kč/m3
  cena_tepla_mwh: 2200,      // Kč/MWh cena tepla na TUV (z CZT nebo plynové kotelny)

  // Recyklace vody – cena čističky dle kapacity (m3/den) z Excel voda ceník podklady řádek 33
  recyklace_cisticka: [
    { kapacita: 0.5, cena: 730000 },
    { kapacita: 1.0, cena: 730000 },
    { kapacita: 1.5, cena: 730000 },
    { kapacita: 2.0, cena: 730000 },
    { kapacita: 2.5, cena: 1150000 },
    { kapacita: 3.0, cena: 1150000 },
    { kapacita: 3.5, cena: 1150000 },
    { kapacita: 4.0, cena: 1150000 },
    { kapacita: 4.5, cena: 1150000 },
    { kapacita: 5.0, cena: 1150000 },
    { kapacita: 6.0, cena: 1150000 },
    { kapacita: 7.0, cena: 1150000 },
    { kapacita: 8.0, cena: 2350000 },
    { kapacita: 9.0, cena: 2350000 },
    { kapacita: 10.0, cena: 2350000 }
  ],

  // Servisní náklady dle kapacity (Kč/rok) z Excel voda ceník podklady řádek 24
  recyklace_servis: [
    { kapacita: 0.5, servis: 10500 },
    { kapacita: 1.0, servis: 12700 },
    { kapacita: 1.5, servis: 14800 },
    { kapacita: 2.0, servis: 17200 },
    { kapacita: 2.5, servis: 18600 },
    { kapacita: 3.0, servis: 22500 },
    { kapacita: 3.5, servis: 24700 },
    { kapacita: 4.0, servis: 26900 },
    { kapacita: 4.5, servis: 28600 },
    { kapacita: 5.0, servis: 30800 },
    { kapacita: 6.0, servis: 35700 },
    { kapacita: 7.0, servis: 38100 },
    { kapacita: 8.0, servis: 41500 },
    { kapacita: 9.0, servis: 44900 },
    { kapacita: 10.0, servis: 48800 }
  ],

  // Rekuperace tepla – základ cena
  rekuperace_zaklad_kc: 80000,

  // Recyklace – základ cena (bez čističky – potrubí, napojení...)
  recyklace_zaklad_kc: 650000,

  // Cena připojení bytu
  cena_pripojeni_bytu: 4500,

  // Cena spořiče sprchy (Kč/ks)
  cena_sporici_sprchy: 6500,

  // Inflace pro cash flow
  inflace: 0.035,

  // Pořizovací ceny variant (odhady z Excel TUV dimenzovani)
  tuv_cena_fve: 3500000,       // závisí na FVE výkonu - orientační
  tuv_cena_tc: 78000,          // TC pro TUV
  tuv_cena_tc_fve: 104000      // TC + FVE pro TUV
};

// ─── Pomocné funkce ────────────────────────────────────────────────────────

function najdiRecyklacniCenu(kapacita_m3_den) {
  const t = VODA_DATA.recyklace_cisticka;
  for (let i = t.length - 1; i >= 0; i--) {
    if (kapacita_m3_den >= t[i].kapacita) return t[i].cena;
  }
  return t[0].cena;
}

function najdiServisniNaklady(kapacita_m3_den) {
  const t = VODA_DATA.recyklace_servis;
  for (let i = t.length - 1; i >= 0; i--) {
    if (kapacita_m3_den >= t[i].kapacita) return t[i].servis;
  }
  return t[0].servis;
}

// ─── Hlavní výpočet ────────────────────────────────────────────────────────

function vypocetVoda() {
  const container = document.getElementById('voda_vysledky');
  if (!container) return;

  // === VSTUPY ===
  const pocet_osob = parseInt(document.getElementById('voda_pocet_osob')?.value) || 0;
  const pocet_bytu = parseInt(document.getElementById('voda_pocet_bytu')?.value) || 0;
  const norma_tuv = parseFloat(document.getElementById('voda_norma_tuv')?.value) || VODA_DATA.norma_tuv_l_os_den;
  const dt = parseFloat(document.getElementById('voda_dt')?.value) || VODA_DATA.dt_tepelny_spad;
  const doba_ohrevu = parseFloat(document.getElementById('voda_doba_ohrevu')?.value) || VODA_DATA.doba_ohrevu_h;
  const cirkulace = document.getElementById('voda_cirkulace')?.value === 'ano';
  const cop_tc = parseFloat(document.getElementById('voda_cop_tc')?.value) || VODA_DATA.tc_cop;
  const podil_tc = parseFloat(document.getElementById('voda_podil_tc')?.value) || VODA_DATA.tc_podil_ohrevu;

  const cena_tepla_gj = parseFloat(document.getElementById('voda_cena_gj')?.value) || VODA_DATA.cena_tepla_gj;
  const cena_el_kwh = parseFloat(document.getElementById('voda_cena_el')?.value) || VODA_DATA.cena_elektriny_kwh;
  const spotreba_sv_m3 = parseFloat(document.getElementById('voda_spotreba_sv')?.value) || 0;
  const spotreba_tv_m3 = parseFloat(document.getElementById('voda_spotreba_tv')?.value) || 0;
  const spotreba_tepla_tuv = parseFloat(document.getElementById('voda_spotreba_tepla_tuv')?.value) || 0;
  const cena_tepla_tuv = parseFloat(document.getElementById('voda_cena_tepla_tuv')?.value) || VODA_DATA.cena_tepla_mwh;
  const cena_vodne = parseFloat(document.getElementById('voda_cena_vodne')?.value) || VODA_DATA.cena_studena_m3;
  const cena_stocne = parseFloat(document.getElementById('voda_cena_stocne')?.value) || VODA_DATA.cena_stocne_m3;

  // Úsporná opatření
  const chce_recyklaci = document.getElementById('voda_recyklace_check')?.checked || false;
  const chce_rekuperaci = document.getElementById('voda_rekuperace_check')?.checked || false;
  const chce_sporici = document.getElementById('voda_sporici_check')?.checked || false;
  const chce_destovku = document.getElementById('voda_destovka_check')?.checked || false;

  if (pocet_osob <= 0 && spotreba_sv_m3 <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte pocet osob nebo spotreby vody.</p>';
    return;
  }

  // === TUV VÝPOČTY (dle Excel TUV vypocty) ===
  const spotreba_tuv_l_den = pocet_osob * norma_tuv;
  const spotreba_tuv_m3_rok = spotreba_tuv_l_den * 365 / 1000;

  // Energie na ohřev: Q = m × c × dt; c_vody = 4186 J/(kg·K) = 1.163 Wh/(kg·K)
  const energie_ohrev_kwh_den = spotreba_tuv_l_den * dt * 1.163 / 1000;
  const prirazka = cirkulace ? (1 + VODA_DATA.prirazka_cirkulace) : 1;
  const energie_ohrev_kwh_rok = energie_ohrev_kwh_den * prirazka * 365;
  const energie_ohrev_mwh_rok = energie_ohrev_kwh_rok / 1000;

  // Výkon těles
  const vykon_teles_kw = energie_ohrev_kwh_den * prirazka / doba_ohrevu;

  // Zásobník (1.5× denní spotřeba)
  const zasobnik_l = Math.round(spotreba_tuv_l_den * 1.5);

  // Cena tepla: převod GJ → kWh (1 GJ = 277.78 kWh)
  const cena_tepla_kwh = cena_tepla_gj / 277.78;

  // --- Varianta 1: Stávající ohřev ---
  const naklad_tuv_stavajici = Math.round(energie_ohrev_kwh_rok * cena_tepla_kwh);

  // --- Varianta 2: Ohřev s FVE ---
  // FVE pokryje energii na ohřev elektrickým boilerem
  const naklad_tuv_fve = Math.round(energie_ohrev_kwh_rok * cena_el_kwh);

  // --- Varianta 3: Ohřev s TČ ---
  const energie_tc_kwh_rok = energie_ohrev_kwh_rok * podil_tc / cop_tc;
  const naklad_tuv_tc = Math.round(energie_tc_kwh_rok * cena_el_kwh);

  // --- Varianta 4: Ohřev s FVE + TČ ---
  // TČ pokrývá podíl, FVE dodává elektřinu pro TČ
  const naklad_tuv_fve_tc = Math.round(energie_tc_kwh_rok * cena_el_kwh * 0.3); // FVE pokryje ~70% elektřiny pro TČ

  // === VODA - SPOTŘEBY A NÁKLADY (dle Excel Voda-výpočty) ===
  // Spotřeba – buď z faktur nebo výpočet z osob
  const sv_m3_rok = spotreba_sv_m3 > 0 ? spotreba_sv_m3 : (pocet_osob * VODA_DATA.norma_studena_l_os_den * 365 / 1000);
  const tv_m3_rok = spotreba_tv_m3 > 0 ? spotreba_tv_m3 : spotreba_tuv_m3_rok;
  const celkem_voda_m3 = sv_m3_rok + tv_m3_rok;

  // Teplo na TUV (buď zadaná spotřeba nebo vypočtená)
  const teplo_tuv_mwh = spotreba_tepla_tuv > 0 ? spotreba_tepla_tuv : energie_ohrev_mwh_rok;

  // Stávající náklady voda
  const naklad_vodne = Math.round(celkem_voda_m3 * cena_vodne);
  const naklad_stocne_rok = Math.round(celkem_voda_m3 * cena_stocne);
  const naklad_teplo_tuv = Math.round(teplo_tuv_mwh * cena_tepla_tuv);
  const puvodni_naklady = naklad_vodne + naklad_stocne_rok + naklad_teplo_tuv;

  // === ÚSPORY ===
  let uspora_sv_kc = 0, uspora_tv_kc = 0, uspora_teplo_kc = 0, uspora_destovka_kc = 0;
  let investice = 0;
  let servisni_naklady_rok = 0;

  // Recyklace šedé vody
  if (chce_recyklaci) {
    const uspora_sv_m3 = sv_m3_rok * VODA_DATA.koef_uspora_studena_voda;
    uspora_sv_kc = Math.round(uspora_sv_m3 * cena_vodne);

    // Kapacita čističky (m3/den)
    const kapacita_den = celkem_voda_m3 / 365;
    investice += najdiRecyklacniCenu(kapacita_den);
    servisni_naklady_rok += najdiServisniNaklady(kapacita_den);
  }

  // Rekuperace tepla z odpadní vody
  if (chce_rekuperaci) {
    const uspora_teplo_mwh = teplo_tuv_mwh * VODA_DATA.koef_rekuperace_ucinnost;
    uspora_teplo_kc = Math.round(uspora_teplo_mwh * cena_tepla_tuv);
    investice += VODA_DATA.rekuperace_zaklad_kc;
  }

  // Spořiče sprch (úspora SV + TV)
  if (chce_sporici) {
    const pocet_sprch = parseInt(document.getElementById('voda_pocet_sprch')?.value) || pocet_bytu;
    uspora_sv_kc += Math.round(sv_m3_rok * VODA_DATA.koef_uspora_sporici_sprchy_sv * cena_vodne);
    uspora_tv_kc += Math.round(tv_m3_rok * VODA_DATA.koef_uspora_sporici_sprchy_tv * cena_vodne);
    // Úspora tepla ze snížení teplé vody
    const uspora_tv_m3 = tv_m3_rok * VODA_DATA.koef_uspora_sporici_sprchy_tv;
    uspora_teplo_kc += Math.round(uspora_tv_m3 * 0.058 * cena_tepla_tuv); // 0.058 MWh/m3
    investice += pocet_sprch * VODA_DATA.cena_sporici_sprchy;
  }

  // Dešťovka
  if (chce_destovku) {
    // Odhad: dešťovka pokryje 15% spotřeby studené vody
    const uspora_dest_m3 = sv_m3_rok * 0.15;
    uspora_destovka_kc = Math.round(uspora_dest_m3 * cena_vodne);
    investice += 45000; // záchytný systém – orientační
  }

  // Připojení bytů
  if (pocet_bytu > 0 && (chce_recyklaci || chce_rekuperaci)) {
    investice += pocet_bytu * VODA_DATA.cena_pripojeni_bytu;
  }

  const uspora_celkem = uspora_sv_kc + uspora_tv_kc + uspora_teplo_kc + uspora_destovka_kc;
  const cista_uspora = uspora_celkem - servisni_naklady_rok;
  const navratnost = cista_uspora > 0 ? (investice / cista_uspora) : 0;
  const naklady_po_realizaci = puvodni_naklady - uspora_celkem + servisni_naklady_rok;

  // === ULOŽ DO STAVU ===
  OEES_STATE.case.voda = {
    pocet_osob, pocet_bytu, cirkulace,
    spotreba_tuv_m3_rok, energie_ohrev_mwh_rok, vykon_teles_kw, zasobnik_l,
    naklad_tuv_stavajici, naklad_tuv_fve, naklad_tuv_tc, naklad_tuv_fve_tc,
    sv_m3_rok, tv_m3_rok, celkem_voda_m3, teplo_tuv_mwh,
    puvodni_naklady, naklady_po_realizaci,
    uspora_sv_kc, uspora_tv_kc, uspora_teplo_kc, uspora_destovka_kc,
    uspora_celkem, cista_uspora, investice, servisni_naklady_rok,
    navratnost: navratnost > 0 ? parseFloat(navratnost.toFixed(1)) : 0
  };

  // Přenese teplo TUV do modulu Tepelná bilance
  const tuvEl = document.getElementById('teplo_tuv_mwh');
  if (tuvEl && energie_ohrev_mwh_rok > 0) {
    tuvEl.value = energie_ohrev_mwh_rok.toFixed(1);
  }

  // === RENDER VÝSLEDKY ===
  const fmt = (v) => Math.round(v).toLocaleString('cs-CZ');

  container.innerHTML = `
    <div class="results-panel">
      <h3>TUV – dimenzovani ohrevu</h3>
      <table class="breakdown-table">
        <thead><tr><th>Parametr</th><th>Hodnota</th></tr></thead>
        <tbody>
          <tr><td>Spotreba TUV</td><td>${fmt(spotreba_tuv_l_den)} l/den (${spotreba_tuv_m3_rok.toFixed(1)} m3/rok)</td></tr>
          <tr><td>Energie na ohrev${cirkulace ? ' (vcetne cirkulace +60%)' : ''}</td><td>${energie_ohrev_mwh_rok.toFixed(1)} MWh/rok</td></tr>
          <tr><td>Vykon teles</td><td>${vykon_teles_kw.toFixed(1)} kW</td></tr>
          <tr><td>Doporuceny zasobnik</td><td>${fmt(zasobnik_l)} l</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:16px">Porovnani variant ohrevu TUV</h3>
      <table class="breakdown-table">
        <thead><tr><th>Varianta</th><th>Naklady Kc/rok</th><th>Uspora vs stavajici</th></tr></thead>
        <tbody>
          <tr><td><strong>Stavajici ohrev</strong></td><td>${fmt(naklad_tuv_stavajici)}</td><td>—</td></tr>
          <tr><td>Ohrev s FVE</td><td>${fmt(naklad_tuv_fve)}</td>
            <td class="${naklad_tuv_stavajici - naklad_tuv_fve > 0 ? 'text-success' : ''}">${fmt(naklad_tuv_stavajici - naklad_tuv_fve)} Kc</td></tr>
          <tr><td>Ohrev s TC (COP ${cop_tc})</td><td>${fmt(naklad_tuv_tc)}</td>
            <td class="text-success">${fmt(naklad_tuv_stavajici - naklad_tuv_tc)} Kc</td></tr>
          <tr><td>Ohrev s FVE + TC</td><td>${fmt(naklad_tuv_fve_tc)}</td>
            <td class="text-success">${fmt(naklad_tuv_stavajici - naklad_tuv_fve_tc)} Kc</td></tr>
        </tbody>
      </table>

      <h3 style="margin-top:16px">Celkova analyza vody a uspor</h3>
      <table class="breakdown-table">
        <thead><tr><th>Polozka</th><th>Stavajici</th><th>Uspora</th></tr></thead>
        <tbody>
          <tr><td>Vodne (${celkem_voda_m3.toFixed(0)} m3)</td><td>${fmt(naklad_vodne)} Kc</td>
            <td>${uspora_sv_kc > 0 ? fmt(uspora_sv_kc) + ' Kc' : '—'}</td></tr>
          <tr><td>Stocne</td><td>${fmt(naklad_stocne_rok)} Kc</td><td>—</td></tr>
          <tr><td>Teplo na TUV (${teplo_tuv_mwh.toFixed(1)} MWh)</td><td>${fmt(naklad_teplo_tuv)} Kc</td>
            <td>${uspora_teplo_kc > 0 ? fmt(uspora_teplo_kc) + ' Kc' : '—'}</td></tr>
          ${uspora_tv_kc > 0 ? `<tr><td>Uspora tepla vody (sporici sprchy)</td><td>—</td><td>${fmt(uspora_tv_kc)} Kc</td></tr>` : ''}
          ${uspora_destovka_kc > 0 ? `<tr><td>Destovka</td><td>—</td><td>${fmt(uspora_destovka_kc)} Kc</td></tr>` : ''}
          ${servisni_naklady_rok > 0 ? `<tr><td>Servisni naklady cisticka</td><td>—</td><td class="text-danger">-${fmt(servisni_naklady_rok)} Kc</td></tr>` : ''}
          <tr class="total-row"><td><strong>Celkem rocne</strong></td>
            <td><strong>${fmt(puvodni_naklady)} Kc</strong></td>
            <td><strong>${fmt(naklady_po_realizaci)} Kc</strong></td></tr>
        </tbody>
      </table>

      <div class="results-grid" style="margin-top:16px">
        <div class="result-box highlight">
          <div class="val">${fmt(cista_uspora)} Kc</div>
          <div class="lbl">Cista uspora / rok</div>
        </div>
        <div class="result-box">
          <div class="val">${fmt(investice)} Kc</div>
          <div class="lbl">Investice</div>
        </div>
        <div class="result-box">
          <div class="val">${navratnost > 0 ? navratnost.toFixed(1) : '—'} let</div>
          <div class="lbl">Navratnost</div>
        </div>
      </div>
    </div>`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulVoda(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128167;</span> Voda + TUV – spotreby, ohrev, uspory
      </div>

      <div class="state-grid">
        <!-- LEVÁ: SPOTŘEBY A PARAMETRY -->
        <div class="state-panel stavajici">
          <h3>Stavajici stav</h3>

          <div class="card-subtitle">Zakladni udaje</div>
          <div class="form-grid-2">
            <div class="field">
              <label>Pocet osob</label>
              <input type="number" id="voda_pocet_osob" placeholder="napr. 50" min="0" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Pocet bytu</label>
              <input type="number" id="voda_pocet_bytu" placeholder="napr. 10" min="0" oninput="vypocetVoda()">
            </div>
          </div>

          <div class="card-subtitle">Spotreby z faktur <small class="text-muted">(ponechte prazdne pro vypocet z osob)</small></div>
          <div class="form-grid-2">
            <div class="field">
              <label>Spotreba studene vody <span class="unit">m3/rok</span></label>
              <input type="number" id="voda_spotreba_sv" placeholder="z faktur" min="0" step="1" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Spotreba teple vody <span class="unit">m3/rok</span></label>
              <input type="number" id="voda_spotreba_tv" placeholder="z faktur" min="0" step="1" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Spotreba tepla na TUV <span class="unit">MWh/rok</span></label>
              <input type="number" id="voda_spotreba_tepla_tuv" placeholder="z faktur" min="0" step="0.1" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Cena tepla na TUV <span class="unit">Kc/MWh</span></label>
              <input type="number" id="voda_cena_tepla_tuv" value="${VODA_DATA.cena_tepla_mwh}" min="0" step="50" oninput="vypocetVoda()">
            </div>
          </div>

          <div class="card-subtitle">Ceny vody</div>
          <div class="form-grid-2">
            <div class="field">
              <label>Vodne <span class="unit">Kc/m3</span></label>
              <input type="number" id="voda_cena_vodne" value="${VODA_DATA.cena_studena_m3}" min="0" step="1" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Stocne <span class="unit">Kc/m3</span></label>
              <input type="number" id="voda_cena_stocne" value="${VODA_DATA.cena_stocne_m3}" min="0" step="1" oninput="vypocetVoda()">
            </div>
          </div>

          <div class="card-subtitle">TUV – parametry ohrevu</div>
          <div class="form-grid-2">
            <div class="field">
              <label>Norma TUV <span class="unit">l/os/den</span></label>
              <input type="number" id="voda_norma_tuv" value="${VODA_DATA.norma_tuv_l_os_den}" min="10" max="80" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Tepelny spad (dt) <span class="unit">°C</span></label>
              <input type="number" id="voda_dt" value="${VODA_DATA.dt_tepelny_spad}" min="20" max="60" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Doba ohrevu <span class="unit">hod</span></label>
              <input type="number" id="voda_doba_ohrevu" value="${VODA_DATA.doba_ohrevu_h}" min="2" max="24" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Cirkulace</label>
              <select id="voda_cirkulace" onchange="vypocetVoda()">
                <option value="ano">Ano (+60 % na ohrev)</option>
                <option value="ne">Ne</option>
              </select>
            </div>
            <div class="field">
              <label>Cena tepla <span class="unit">Kc/GJ</span></label>
              <input type="number" id="voda_cena_gj" value="${VODA_DATA.cena_tepla_gj}" min="0" step="100" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Cena elektriny <span class="unit">Kc/kWh</span></label>
              <input type="number" id="voda_cena_el" value="${VODA_DATA.cena_elektriny_kwh}" min="0" step="0.1" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>COP tepelneho cerpadla</label>
              <input type="number" id="voda_cop_tc" value="${VODA_DATA.tc_cop}" min="2" max="6" step="0.1" oninput="vypocetVoda()">
            </div>
            <div class="field">
              <label>Podil TC na ohrevu <span class="unit">%</span></label>
              <input type="number" id="voda_podil_tc" value="${Math.round(VODA_DATA.tc_podil_ohrevu * 100)}" min="0" max="100" step="5" oninput="vypocetVoda()">
              <small class="text-muted">Obvykle 85 %</small>
            </div>
          </div>
        </div>

        <!-- PRAVÁ: ÚSPORNÁ OPATŘENÍ -->
        <div class="state-panel budouci">
          <h3>Usporna opatreni</h3>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_recyklace_check" onchange="vypocetVoda()">
              <strong>Recyklace odpadni vody</strong> (cisticky sede vody)
            </label>
            <small class="text-muted">Uspora studene vody ${Math.round(VODA_DATA.koef_uspora_studena_voda*100)} %. Cena cisticka dle kapacity (730 tis. – 2,35 mil. Kc)</small>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_rekuperace_check" onchange="vypocetVoda()">
              <strong>Rekuperace tepla z odpadni vody</strong>
            </label>
            <small class="text-muted">Ucinnost ${Math.round(VODA_DATA.koef_rekuperace_ucinnost*100)} %, zakladni cena ${VODA_DATA.rekuperace_zaklad_kc.toLocaleString('cs-CZ')} Kc</small>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_sporici_check" onchange="vypocetVoda()">
              <strong>Sporici sprchy</strong>
            </label>
            <div style="margin-top:6px">
              <input type="number" id="voda_pocet_sprch" placeholder="Pocet ks (default = pocet bytu)" min="0" oninput="vypocetVoda()">
            </div>
            <small class="text-muted">Uspora SV ${Math.round(VODA_DATA.koef_uspora_sporici_sprchy_sv*100)} %, TV ${Math.round(VODA_DATA.koef_uspora_sporici_sprchy_tv*100)} %. Cena ${VODA_DATA.cena_sporici_sprchy.toLocaleString('cs-CZ')} Kc/ks</small>
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="voda_destovka_check" onchange="vypocetVoda()">
              <strong>Destovka</strong> (zachytavani destove vody)
            </label>
            <small class="text-muted">Pokryje cca 15 % spotreby studene vody</small>
          </div>
        </div>
      </div>

      <div id="voda_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte pocet osob nebo spotreby vody.</p>
      </div>
    </div>`;
}
