/**
 * OEES Modul: Kogeneracni jednotka (KGJ)
 * Podil na vyrobe tepla, provozni hodiny, typ zarizeni,
 * zeleny bonus KVET, SVR (sluzby vykonove rovnovahy), ekonomika
 *
 * SVR + Zeleny bonus: dle SVR_kalkulace_KGJ.xlsx
 * Zeleny bonus sazby 2026: cenovy vymer ERU c. 10/2025
 */

'use strict';

// ─── Data KGJ ───────────────────────────────────────────────────────────────
const KGJ_DATA = {
  typy: {
    'kgj_15_38': {
      nazev: 'KGJ 15 kW el / 38 kW tep',
      el_vykon: 15, tep_vykon: 38.3,
      ucinnost_el: 0.28, ucinnost_tep: 0.58,
      spotreba_plynu_mwh_h: 0.053,
      cena_od: 650000, cena_do: 900000
    },
    'kgj_20_46': {
      nazev: 'KGJ 20 kW el / 46 kW tep',
      el_vykon: 20, tep_vykon: 46.5,
      ucinnost_el: 0.30, ucinnost_tep: 0.56,
      spotreba_plynu_mwh_h: 0.067,
      cena_od: 800000, cena_do: 1100000
    },
    'kgj_50_83': {
      nazev: 'KGJ 50 kW el / 83 kW tep',
      el_vykon: 50, tep_vykon: 83,
      ucinnost_el: 0.33, ucinnost_tep: 0.54,
      spotreba_plynu_mwh_h: 0.152,
      cena_od: 1500000, cena_do: 2200000
    },
    'kgj_70_117': {
      nazev: 'KGJ 70 kW el / 117 kW tep',
      el_vykon: 70, tep_vykon: 117,
      ucinnost_el: 0.33, ucinnost_tep: 0.55,
      spotreba_plynu_mwh_h: 0.212,
      cena_od: 2000000, cena_do: 3000000
    },
    'kgj_100_173': {
      nazev: 'KGJ 100 kW el / 173 kW tep',
      el_vykon: 100, tep_vykon: 173,
      ucinnost_el: 0.34, ucinnost_tep: 0.59,
      spotreba_plynu_mwh_h: 0.294,
      cena_od: 3200000, cena_do: 4500000
    },
    'kgj_130_200': {
      nazev: 'KGJ 130 kW el / 200 kW tep',
      el_vykon: 130, tep_vykon: 200,
      ucinnost_el: 0.35, ucinnost_tep: 0.54,
      spotreba_plynu_mwh_h: 0.372,
      cena_od: 4000000, cena_do: 5500000
    },
    'kgj_205_300': {
      nazev: 'KGJ 205 kW el / 300 kW tep',
      el_vykon: 205, tep_vykon: 300,
      ucinnost_el: 0.36, ucinnost_tep: 0.52,
      spotreba_plynu_mwh_h: 0.570,
      cena_od: 5500000, cena_do: 7500000
    },
    'kgj_372_500': {
      nazev: 'KGJ 372 kW el / 500 kW tep',
      el_vykon: 372, tep_vykon: 500,
      ucinnost_el: 0.38, ucinnost_tep: 0.51,
      spotreba_plynu_mwh_h: 0.980,
      cena_od: 9000000, cena_do: 12000000
    },
    'kgj_617_750': {
      nazev: 'KGJ 617 kW el / 750 kW tep',
      el_vykon: 617, tep_vykon: 750,
      ucinnost_el: 0.39, ucinnost_tep: 0.47,
      spotreba_plynu_mwh_h: 1.582,
      cena_od: 14000000, cena_do: 18000000
    },
    'kgj_900_1000': {
      nazev: 'KGJ 900 kW el / 1000 kW tep',
      el_vykon: 900, tep_vykon: 1000,
      ucinnost_el: 0.40, ucinnost_tep: 0.44,
      spotreba_plynu_mwh_h: 2.250,
      cena_od: 20000000, cena_do: 26000000
    }
  },

  // Servisni naklady
  servis_kc_hodina: 1.50,

  // Instalace
  instalace_procent: 0.15
};

// ─── SVR + Zeleny bonus: dynamicke data z admin nebo vychozi ────────────────
// Data jsou definovana v js/admin/svr-zb.js (SVR_LOOKUP_DEFAULT, ZB_SAZBY_DEFAULT)
// a mohou byt prepasana z ADMIN DB pres getSvrLookup() / getZbSazby()

function zelenyBonusSazba(el_vykon_kw) {
  const sazby = (typeof getZbSazby === 'function') ? getZbSazby() : ZB_SAZBY_DEFAULT;
  for (const s of sazby) {
    if (el_vykon_kw >= s.el_od && el_vykon_kw <= s.el_do) return s.sazba;
  }
  return sazby[sazby.length - 1]?.sazba || 957;
}

function getSvrParams(tep_vykon_kw) {
  const lookup = (typeof getSvrLookup === 'function') ? getSvrLookup() : SVR_LOOKUP_DEFAULT;
  if (tep_vykon_kw < lookup[0].tep_kw) return null;

  for (let i = 0; i < lookup.length - 1; i++) {
    if (tep_vykon_kw >= lookup[i].tep_kw && tep_vykon_kw <= lookup[i + 1].tep_kw) {
      const a = lookup[i], b = lookup[i + 1];
      const t = (tep_vykon_kw - a.tep_kw) / (b.tep_kw - a.tep_kw);
      return {
        inv_kc_kw:  Math.round(a.inv_kc_kw  + (b.inv_kc_kw  - a.inv_kc_kw)  * t),
        kap_platba: Math.round(a.kap_platba + (b.kap_platba - a.kap_platba) * t),
        hod_kap:    Math.round(a.hod_kap    + (b.hod_kap    - a.hod_kap)    * t),
        akt_platba: Math.round(a.akt_platba + (b.akt_platba - a.akt_platba) * t),
        hod_akt:    Math.round(a.hod_akt    + (b.hod_akt    - a.hod_akt)    * t),
        reg_rozsah: Math.round(((a.el_kw + (b.el_kw - a.el_kw) * t) * 0.5))
      };
    }
  }
  const last = lookup[lookup.length - 1];
  return {
    inv_kc_kw: last.inv_kc_kw, kap_platba: last.kap_platba,
    hod_kap: last.hod_kap, akt_platba: last.akt_platba,
    hod_akt: last.hod_akt, reg_rozsah: Math.round(last.el_kw * 0.5)
  };
}

// ─── Vypocet ────────────────────────────────────────────────────────────────

function vypocetKogenerace() {
  const container = document.getElementById('kogenerace_vysledky');
  if (!container) return;

  const typ = document.getElementById('kgj_typ')?.value || 'kgj_50_83';
  const pocet = parseInt(document.getElementById('kgj_pocet')?.value) || 1;
  let podil_tepla = parseFloat(document.getElementById('kgj_podil_tepla')?.value) || 0;
  const provozni_hodiny = parseInt(document.getElementById('kgj_hodiny')?.value) || 0;

  // Prevezmi z tepelne bilance pokud je aktivni
  const bilance_kgj = OEES_STATE.case.teplo;
  if (bilance_kgj && bilance_kgj.mwh_kgj > 0) {
    const el = document.getElementById('kgj_podil_tepla');
    if (el && parseFloat(el.value) !== bilance_kgj.mwh_kgj) el.value = bilance_kgj.mwh_kgj;
    podil_tepla = bilance_kgj.mwh_kgj;
  }
  const naddimenzovani = parseFloat(document.getElementById('kgj_naddimenzovani')?.value) || 0;
  const cena_plynu = parseFloat(document.getElementById('kgj_cena_plynu')?.value) || 1350;
  const cena_elektriny = parseFloat(document.getElementById('kgj_cena_el')?.value) || 4500;
  const chceZelenyBonus = document.getElementById('kgj_zeleny_bonus')?.checked || false;
  const chceSVR = document.getElementById('kgj_svr')?.checked || false;

  // SVR vlastni parametry (uzivatel muze prepsat)
  const svr_kap_platba_custom = parseFloat(document.getElementById('kgj_svr_kap_platba')?.value);
  const svr_hod_kap_custom = parseInt(document.getElementById('kgj_svr_hod_kap')?.value);
  const svr_akt_platba_custom = parseFloat(document.getElementById('kgj_svr_akt_platba')?.value);
  const svr_hod_akt_custom = parseInt(document.getElementById('kgj_svr_hod_akt')?.value);

  if (provozni_hodiny <= 0) {
    container.innerHTML = '<p class="text-muted">Zadejte provozni hodiny pro zobrazeni analyzy.</p>';
    return;
  }

  const kgj = KGJ_DATA.typy[typ];

  // Investice KGJ
  const cena_prumer = (kgj.cena_od + kgj.cena_do) / 2;
  const investice_zarizeni = Math.round(cena_prumer * pocet);
  const instalace = Math.round(investice_zarizeni * KGJ_DATA.instalace_procent);
  const investice_kgj = investice_zarizeni + instalace;

  // Celkovy tepelny a elektricky vykon
  const celk_tep_vykon = kgj.tep_vykon * pocet;
  const celk_el_vykon = kgj.el_vykon * pocet;

  // Vyroba za rok
  const vyroba_tepla_mwh = (kgj.tep_vykon * pocet * provozni_hodiny) / 1000;
  const vyroba_el_mwh = (kgj.el_vykon * pocet * provozni_hodiny) / 1000;

  // Spotreba plynu
  const spotreba_plynu_mwh = kgj.spotreba_plynu_mwh_h * pocet * provozni_hodiny;

  // Naklady na plyn
  const naklad_plyn = Math.round(spotreba_plynu_mwh * cena_plynu);

  // Prijem za elektrinu
  const prijem_elektrina = Math.round(vyroba_el_mwh * cena_elektriny);

  // Zeleny bonus KVET (sazba dle el. vykonu, ERU 2026)
  const zb_sazba = zelenyBonusSazba(celk_el_vykon);
  const zeleny_bonus = chceZelenyBonus ? Math.round(vyroba_el_mwh * zb_sazba) : 0;

  // Servisni naklady
  const servis = Math.round(provozni_hodiny * pocet * KGJ_DATA.servis_kc_hodina);

  // ── SVR vypocet ──
  let svr = null;
  let investice_svr = 0;
  let prijem_svr_kapacita = 0;
  let prijem_svr_aktivace = 0;
  let prijem_svr_celkem = 0;

  if (chceSVR) {
    const svrParams = getSvrParams(celk_tep_vykon);
    if (svrParams) {
      // Pouzij custom hodnoty pokud zadany, jinak z lookup tabulky
      const kap_platba = !isNaN(svr_kap_platba_custom) ? svr_kap_platba_custom : svrParams.kap_platba;
      const hod_kap = !isNaN(svr_hod_kap_custom) ? svr_hod_kap_custom : svrParams.hod_kap;
      const akt_platba = !isNaN(svr_akt_platba_custom) ? svr_akt_platba_custom : svrParams.akt_platba;
      const hod_akt = !isNaN(svr_hod_akt_custom) ? svr_hod_akt_custom : svrParams.hod_akt;

      investice_svr = Math.round(celk_tep_vykon * svrParams.inv_kc_kw);
      // Kapacitni platba: (el_vykon v MW) * kap_platba * hodiny
      prijem_svr_kapacita = Math.round((celk_el_vykon / 1000) * kap_platba * hod_kap);
      // Aktivacni platba: (reg_rozsah v MWh) * akt_platba * hodiny
      prijem_svr_aktivace = Math.round((svrParams.reg_rozsah / 1000) * akt_platba * hod_akt);
      prijem_svr_celkem = prijem_svr_kapacita + prijem_svr_aktivace;

      svr = {
        reg_rozsah: svrParams.reg_rozsah,
        investice: investice_svr,
        inv_kc_kw: svrParams.inv_kc_kw,
        kap_platba, hod_kap, akt_platba, hod_akt,
        prijem_kapacita: prijem_svr_kapacita,
        prijem_aktivace: prijem_svr_aktivace,
        prijem_celkem: prijem_svr_celkem,
        navratnost_svr: prijem_svr_celkem > 0 ? (investice_svr / prijem_svr_celkem).toFixed(1) : '---'
      };
    }
  }

  // Celkova bilance
  const investice_celkem = investice_kgj + investice_svr;
  const rocni_vynos = prijem_elektrina + zeleny_bonus + prijem_svr_celkem;
  const rocni_naklad = naklad_plyn + servis;
  const rocni_uspora = rocni_vynos - rocni_naklad;
  const navratnost = rocni_uspora > 0 ? (investice_celkem / rocni_uspora).toFixed(1) : '---';

  // Uloz do stavu
  OEES_STATE.case.kogenerace = {
    typ, pocet, provozni_hodiny, podil_tepla,
    investice: investice_celkem,
    investice_kgj, investice_svr,
    vyroba_tepla_mwh, vyroba_el_mwh,
    spotreba_plynu_mwh, rocni_uspora, navratnost,
    zeleny_bonus: chceZelenyBonus ? { sazba: zb_sazba, prijem: zeleny_bonus } : null,
    svr: svr
  };

  // ── Zobrazeni ──
  let html = `
    <div class="results-panel">
      <h3>Kogeneracni jednotka – ekonomika</h3>
      <table class="breakdown-table">
        <thead><tr><th>Parametr</th><th>Hodnota</th></tr></thead>
        <tbody>
          <tr><td>Typ KGJ</td><td>${kgj.nazev} x ${pocet}</td></tr>
          <tr><td>Celkovy tepelny vykon</td><td>${celk_tep_vykon.toFixed(0)} kW</td></tr>
          <tr><td>Celkovy elektricky vykon</td><td>${celk_el_vykon.toFixed(0)} kW</td></tr>
          <tr><td>Provozni hodiny</td><td>${provozni_hodiny.toLocaleString('cs-CZ')} hod/rok</td></tr>
          <tr><td>Vyroba tepla</td><td>${vyroba_tepla_mwh.toFixed(1)} MWh/rok</td></tr>
          <tr><td>Vyroba elektriny</td><td>${vyroba_el_mwh.toFixed(1)} MWh/rok</td></tr>
          <tr><td>Spotreba plynu</td><td>${spotreba_plynu_mwh.toFixed(1)} MWh/rok</td></tr>
        </tbody>
      </table>`;

  // Zeleny bonus sekce
  if (chceZelenyBonus) {
    html += `
      <h3 style="margin-top:20px">Zeleny bonus KVET (ERU 2026)</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Sazba zeleneho bonusu</td><td>${zb_sazba.toLocaleString('cs-CZ')} Kc/MWh</td></tr>
          <tr><td>Pasmo dle el. vykonu</td><td>${celk_el_vykon <= 50 ? 'do 50 kWe' : celk_el_vykon <= 200 ? '50–200 kWe' : '200–999 kWe'}</td></tr>
          <tr class="total-row"><td><strong>Prijem zeleny bonus</strong></td><td class="text-success"><strong>${zeleny_bonus.toLocaleString('cs-CZ')} Kc/rok</strong></td></tr>
        </tbody>
      </table>`;
  }

  // SVR sekce
  if (svr) {
    html += `
      <h3 style="margin-top:20px">SVR – Sluzby vykonove rovnovahy</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Regulacni rozsah</td><td>${svr.reg_rozsah} kW (50% el. vykonu)</td></tr>
          <tr><td>Investice SVR</td><td>${svr.investice.toLocaleString('cs-CZ')} Kc (${svr.inv_kc_kw} Kc/kW tep.)</td></tr>
          <tr><td>Kapacitni platba</td><td>${svr.kap_platba} Kc/MW/hod × ${svr.hod_kap.toLocaleString('cs-CZ')} hod</td></tr>
          <tr><td>Prijem kapacita</td><td class="text-success">${svr.prijem_kapacita.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr><td>Aktivacni platba</td><td>${svr.akt_platba} Kc/MWh × ${svr.hod_akt} hod</td></tr>
          <tr><td>Prijem aktivace</td><td class="text-success">${svr.prijem_aktivace.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr class="total-row"><td><strong>Prijem SVR celkem</strong></td><td class="text-success"><strong>${svr.prijem_celkem.toLocaleString('cs-CZ')} Kc/rok</strong></td></tr>
          <tr><td>Navratnost SVR (samostatne)</td><td><strong>${svr.navratnost_svr} let</strong></td></tr>
        </tbody>
      </table>
      <p class="text-muted" style="margin-top:6px;font-size:0.8rem">KGJ pod 1 MW el. se zapojuje pres agregatora flexibility (min. blok CEPS = 1 MW). Investice zahrnuje: ridici system, SCADA, akumulacni nadrz, certifikaci CEPS, projekt.</p>`;
  } else if (chceSVR) {
    html += `<p class="text-muted" style="margin-top:16px">SVR neni dostupne pro KGJ s tepelnym vykonem pod 100 kW. Zvolte vetsi jednotku.</p>`;
  }

  // Celkova financni analyza
  html += `
      <h3 style="margin-top:20px">Celkova financni analyza</h3>
      <table class="breakdown-table">
        <tbody>
          <tr><td>Investice KGJ (zarizeni + instalace)</td><td>${investice_kgj.toLocaleString('cs-CZ')} Kc</td></tr>
          ${investice_svr > 0 ? `<tr><td>Investice SVR</td><td>${investice_svr.toLocaleString('cs-CZ')} Kc</td></tr>` : ''}
          ${investice_svr > 0 ? `<tr><td><strong>Investice celkem</strong></td><td><strong>${investice_celkem.toLocaleString('cs-CZ')} Kc</strong></td></tr>` : ''}
          <tr><td>Naklad na plyn</td><td>${naklad_plyn.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr><td>Servisni naklady</td><td>${servis.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          <tr><td>Prijem za elektrinu</td><td class="text-success">${prijem_elektrina.toLocaleString('cs-CZ')} Kc/rok</td></tr>
          ${zeleny_bonus > 0 ? `<tr><td>Prijem zeleny bonus KVET</td><td class="text-success">${zeleny_bonus.toLocaleString('cs-CZ')} Kc/rok</td></tr>` : ''}
          ${prijem_svr_celkem > 0 ? `<tr><td>Prijem SVR</td><td class="text-success">${prijem_svr_celkem.toLocaleString('cs-CZ')} Kc/rok</td></tr>` : ''}
          <tr class="total-row">
            <td><strong>Rocni uspora/vynos celkem</strong></td>
            <td class="${rocni_uspora > 0 ? 'text-success' : 'text-danger'}">
              <strong>${rocni_uspora.toLocaleString('cs-CZ')} Kc/rok</strong>
            </td>
          </tr>
          <tr><td>Navratnost celkem</td><td><strong>${navratnost} let</strong></td></tr>
        </tbody>
      </table>
    </div>`;

  container.innerHTML = html;
}

// ─── Aktualizace SVR poli dle vybraneho KGJ ─────────────────────────────────
function aktualizujSvrPole() {
  const typ = document.getElementById('kgj_typ')?.value;
  const pocet = parseInt(document.getElementById('kgj_pocet')?.value) || 1;
  if (!typ) return;

  const kgj = KGJ_DATA.typy[typ];
  const celk_tep = kgj.tep_vykon * pocet;
  const svrParams = getSvrParams(celk_tep);
  const svrWrap = document.getElementById('kgj_svr_params');

  if (!svrWrap) return;

  if (!svrParams) {
    svrWrap.style.display = 'none';
    return;
  }

  const chceSVR = document.getElementById('kgj_svr')?.checked;
  svrWrap.style.display = chceSVR ? 'block' : 'none';

  if (chceSVR) {
    document.getElementById('kgj_svr_kap_platba').value = svrParams.kap_platba;
    document.getElementById('kgj_svr_hod_kap').value = svrParams.hod_kap;
    document.getElementById('kgj_svr_akt_platba').value = svrParams.akt_platba;
    document.getElementById('kgj_svr_hod_akt').value = svrParams.hod_akt;
    document.getElementById('kgj_svr_inv_info').textContent =
      `Investice SVR: ${svrParams.inv_kc_kw} Kc/kW tep. = ${(celk_tep * svrParams.inv_kc_kw).toLocaleString('cs-CZ')} Kc | Reg. rozsah: ${svrParams.reg_rozsah} kW`;
  }

  vypocetKogenerace();
}

// ── Aktualizace sazby zeleneho bonusu v labelu ──
function aktualizujZbLabel() {
  const typ = document.getElementById('kgj_typ')?.value;
  const pocet = parseInt(document.getElementById('kgj_pocet')?.value) || 1;
  if (!typ) return;
  const kgj = KGJ_DATA.typy[typ];
  const sazba = zelenyBonusSazba(kgj.el_vykon * pocet);
  const lbl = document.getElementById('kgj_zb_label');
  if (lbl) lbl.textContent = `Zeleny bonus KVET (${sazba} Kc/MWh, ERU 2026)`;
}

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulKogenerace(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const typOptions = Object.entries(KGJ_DATA.typy).map(([key, t]) =>
    `<option value="${key}">${t.nazev}</option>`
  ).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#9889;</span> Kogeneracni jednotka (KGJ) – analyza, SVR a zeleny bonus
      </div>

      <div class="state-grid">
        <!-- PARAMETRY KGJ -->
        <div class="state-panel stavajici">
          <h3>Parametry KGJ</h3>

          <div class="field">
            <label>Typ kogeneracni jednotky</label>
            <select id="kgj_typ" onchange="aktualizujSvrPole(); aktualizujZbLabel(); vypocetKogenerace()">
              ${typOptions}
            </select>
          </div>

          <div class="field">
            <label>Pocet jednotek</label>
            <input type="number" id="kgj_pocet" value="1" min="1" max="10" oninput="aktualizujSvrPole(); aktualizujZbLabel(); vypocetKogenerace()">
          </div>

          <div class="field">
            <label>Podil na vyrobe tepla <span class="unit">MWh/rok</span></label>
            <input type="number" id="kgj_podil_tepla" placeholder="napr. 200" min="0" step="1" oninput="vypocetKogenerace()">
            <small class="text-muted">Kolik MWh tepla ma KGJ pokryt rocne</small>
          </div>

          <div class="field">
            <label>Provozni hodiny <span class="unit">hod/rok</span></label>
            <input type="number" id="kgj_hodiny" placeholder="napr. 5000" min="0" max="8760" oninput="vypocetKogenerace()">
            <small class="text-muted">Typicky 3000-6000 hod/rok</small>
          </div>

          <div class="field">
            <label>Naddimenzovani <span class="unit">%</span></label>
            <input type="number" id="kgj_naddimenzovani" value="0" min="0" max="50" step="5" oninput="vypocetKogenerace()">
          </div>
        </div>

        <!-- EKONOMICKE PARAMETRY -->
        <div class="state-panel budouci">
          <h3>Ekonomicke parametry</h3>

          <div class="field">
            <label>Cena plynu <span class="unit">Kc/MWh</span></label>
            <input type="number" id="kgj_cena_plynu" value="1350" min="0" step="10" oninput="vypocetKogenerace()">
          </div>

          <div class="field">
            <label>Cena elektriny (uspora/prodej) <span class="unit">Kc/MWh</span></label>
            <input type="number" id="kgj_cena_el" value="4500" min="0" step="100" oninput="vypocetKogenerace()">
          </div>

          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="kgj_zeleny_bonus" checked onchange="vypocetKogenerace()">
              <span id="kgj_zb_label">Zeleny bonus KVET (1894 Kc/MWh, ERU 2026)</span>
            </label>
            <small class="text-muted">Sazba se meni dle el. vykonu: do 50 kWe = 1 894 | 50-200 kWe = 1 921 | 200-999 kWe = 957 Kc/MWh</small>
          </div>

          <div class="field" style="margin-top:12px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="kgj_svr" onchange="aktualizujSvrPole()">
              Zapojeni do SVR (sluzby vykonove rovnovahy)
            </label>
            <small class="text-muted">Dodavka regulacni energie pres CEPS (min. 100 kW tep. vykonu). KGJ pod 1 MW el. pres agregatora.</small>
          </div>

          <!-- SVR parametry (zobrazuji se po zaskrtnuti SVR) -->
          <div id="kgj_svr_params" style="display:none;margin-top:12px;padding:12px;background:#f1f5f9;border-radius:6px">
            <strong style="font-size:0.85rem;color:#1B6CA8">Parametry SVR</strong>
            <p id="kgj_svr_inv_info" class="text-muted" style="font-size:0.8rem;margin:6px 0"></p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
              <div class="field">
                <label>Kapacitni platba <span class="unit">Kc/MW/hod</span></label>
                <input type="number" id="kgj_svr_kap_platba" value="250" min="0" step="10" oninput="vypocetKogenerace()">
              </div>
              <div class="field">
                <label>Hodiny kapacity <span class="unit">hod/rok</span></label>
                <input type="number" id="kgj_svr_hod_kap" value="2500" min="0" max="8760" oninput="vypocetKogenerace()">
              </div>
              <div class="field">
                <label>Aktivacni platba <span class="unit">Kc/MWh</span></label>
                <input type="number" id="kgj_svr_akt_platba" value="700" min="0" step="10" oninput="vypocetKogenerace()">
              </div>
              <div class="field">
                <label>Hodiny aktivace <span class="unit">hod/rok</span></label>
                <input type="number" id="kgj_svr_hod_akt" value="80" min="0" max="8760" oninput="vypocetKogenerace()">
              </div>
            </div>
            <small class="text-muted" style="margin-top:6px;display:block">Hodnoty predvyplneny dle velikosti KGJ. Muzete upravit dle konkretni nabidky agregatora.</small>
          </div>
        </div>
      </div>

      <div id="kogenerace_vysledky" style="margin-top:20px">
        <p class="text-muted">Zadejte provozni hodiny pro zobrazeni analyzy.</p>
      </div>
    </div>`;

  // Inicializuj label zeleneho bonusu
  aktualizujZbLabel();
}
