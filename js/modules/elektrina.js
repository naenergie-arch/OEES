/**
 * OEES – Modul Elektřina
 * Výpočet nákladů na elektřinu: stávající stav vs. budoucí stav
 * Podporuje: NN (domácnosti + malé firmy) i VN (průmysl)
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// VÝPOČETNÍ JÁDRO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vypočítá roční náklady na elektřinu – DODÁVKA (obchodní část)
 * @param {object} vstup
 * @param {string} vstup.typ_odberu  "NN" | "VN"
 * @param {string} vstup.tarif_typ   "VT" | "DT" | "SPOT" | "VN_fixni" | "VN_spot"
 * @param {number} vstup.spotreba_vt  MWh/rok (VT nebo celková u JT)
 * @param {number} vstup.spotreba_nt  MWh/rok v NT (0 pro JT)
 * @param {number} vstup.cena_vt      Kč/MWh (dodávka VT / jednotná)
 * @param {number} vstup.cena_nt      Kč/MWh (dodávka NT, 0 pro JT)
 * @param {number} vstup.mesicni_plat Kč/měsíc (stálá platba dodavateli)
 * @param {number} vstup.cena_spot    Kč/MWh (průměrná spot cena, pokud tarif=SPOT)
 * @param {number} vstup.marze_spot   Kč/MWh (marže dodavatele u spotu)
 * @returns {object}
 */
function vypocetDodavky(vstup) {
  const {
    spotreba_vt = 0,
    spotreba_nt = 0,
    cena_vt = 0,
    cena_nt = 0,
    mesicni_plat = 0,
    cena_spot = 0,
    marze_spot = 0,
    tarif_typ = "VT"
  } = vstup;

  const celkova_spotreba = spotreba_vt + spotreba_nt;
  let dodavka_energie = 0;

  if (tarif_typ === "SPOT") {
    dodavka_energie = celkova_spotreba * (cena_spot + marze_spot) / 1000;
  } else {
    dodavka_energie = (spotreba_vt * cena_vt + spotreba_nt * cena_nt) / 1000;
  }

  const stala_platba_rok = mesicni_plat * 12;
  const celkem_bez_dph   = dodavka_energie + stala_platba_rok;

  return {
    dodavka_energie_kc:  Math.round(dodavka_energie),
    stala_platba_kc_rok: Math.round(stala_platba_rok),
    celkem_bez_dph:      Math.round(celkem_bez_dph),
    celkem_s_dph:        Math.round(celkem_bez_dph * 1.21),
    prumer_kc_mwh_dodavka: celkova_spotreba > 0
      ? Math.round(celkem_bez_dph / celkova_spotreba * 1000)
      : 0
  };
}

/**
 * Celkový výpočet nákladů na elektřinu (dodávka + distribuce + daně)
 * @param {object} dodavka   výsledek vypocetDodavky()
 * @param {object} distribuce výsledek vypocetDistribuce() z tarify.js
 * @param {number} spotreba_celkem MWh/rok
 * @returns {object}
 */
function celkoveNaklady(dodavka, distribuce, spotreba_celkem) {
  // Distribuce se fakturuje bez DPH, DPH přidáváme společně s dodávkou
  const celkem_bez_dph = dodavka.celkem_bez_dph + distribuce.celkem_bez_dph;
  const dph            = celkem_bez_dph * 0.21;
  const celkem_s_dph   = celkem_bez_dph + dph;

  return {
    dodavka_kc_bez_dph:   dodavka.celkem_bez_dph,
    distribuce_kc_bez_dph: distribuce.celkem_bez_dph,
    celkem_bez_dph:        Math.round(celkem_bez_dph),
    dph_kc:                Math.round(dph),
    celkem_s_dph:          Math.round(celkem_s_dph),
    prumer_kc_mwh_vse:     spotreba_celkem > 0
      ? Math.round(celkem_s_dph / spotreba_celkem * 1000)
      : 0
  };
}

/**
 * Porovnání stávajícího a budoucího stavu
 * @param {object} stavajici  výsledek celkoveNaklady() pro stávající stav
 * @param {object} budouci    výsledek celkoveNaklady() pro budoucí stav
 * @returns {object}
 */
function porovnaniStavu(stavajici, budouci) {
  const uspora_kc_rok   = stavajici.celkem_s_dph - budouci.celkem_s_dph;
  const uspora_procenta = stavajici.celkem_s_dph > 0
    ? (uspora_kc_rok / stavajici.celkem_s_dph) * 100
    : 0;

  return {
    stavajici_kc_rok:    stavajici.celkem_s_dph,
    budouci_kc_rok:      budouci.celkem_s_dph,
    uspora_kc_rok:       Math.round(uspora_kc_rok),
    uspora_procenta:     Math.round(uspora_procenta * 10) / 10,
    uspora_kc_mesic:     Math.round(uspora_kc_rok / 12),
    je_uspora:           uspora_kc_rok > 0,
    hodnoceni: uspora_kc_rok > 5000  ? "Výrazná úspora"
             : uspora_kc_rok > 1000  ? "Dobrá úspora"
             : uspora_kc_rok > 0     ? "Mírná úspora"
             : uspora_kc_rok === 0   ? "Beze změny"
             : "Zdražení – zvažte jiné řešení"
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

function inicializujModulElektrina(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">⚡</span> Elektřina – stávající vs. budoucí stav
      </div>

      <div class="state-grid">
        <!-- STÁVAJÍCÍ -->
        <div class="state-panel stavajici">
          <div class="state-label">📋 Stávající stav</div>

          <div class="field">
            <label>Distributor</label>
            <select id="s_distributor">
              <option value="CEZ">ČEZ Distribuce</option>
              <option value="EGD">EG.D (E.ON)</option>
              <option value="PRE">PREdistribuce (Praha)</option>
            </select>
          </div>

          <div class="field">
            <label>Napěťová hladina</label>
            <select id="s_napeti" onchange="zmenNapeti('s')">
              <option value="NN">NN – nízké napětí (domácnosti, malé firmy)</option>
              <option value="VN">VN – vysoké napětí (průmysl, velké firmy)</option>
            </select>
          </div>

          <!-- NN pole -->
          <div id="s_nn_sekce">
            <div class="field" id="s_sazba_wrap">
              <label>Distribuční sazba</label>
              <select id="s_sazba" onchange="aktualizujNTpole('s')">
                <option value="D02d">D02d – jednotarifní standard</option>
                <option value="D01d">D01d – jednotarifní malá spotřeba</option>
                <option value="D25d">D25d – dvoutarifní (8h NT, ohřev vody)</option>
                <option value="D35d">D35d – dvoutarifní (16h NT, vytápění)</option>
                <option value="D45d">D45d – dvoutarifní (20h NT, přímotopy)</option>
                <option value="D56d">D56d – dvoutarifní (20h NT, tepelné čerpadlo)</option>
                <option value="D61d">D61d – dvoutarifní víkendový tarif</option>
                <option value="C01d">C01d – podnikatelé, jednotarifní</option>
                <option value="C02d">C02d – podnikatelé, jednotarifní střední</option>
                <option value="C03d">C03d – podnikatelé, jednotarifní velká</option>
                <option value="C25d">C25d – podnikatelé, dvoutarifní (8h NT)</option>
                <option value="C35d">C35d – podnikatelé, dvoutarifní (16h NT)</option>
                <option value="C45d">C45d – podnikatelé, dvoutarifní (20h NT)</option>
                <option value="C56d">C56d – podnikatelé, TČ (20h NT)</option>
                <option value="C62d">C62d – podnikatelé, víkendový</option>
              </select>
            </div>

            <div class="field">
              <label>Jistič <span class="unit">(dle rozvodné skříně)</span></label>
              <select id="s_jistic">
                <option value="1x25">1×25 A</option>
                <option value="3x10">3×10 A</option>
                <option value="3x16" selected>3×16 A</option>
                <option value="3x20">3×20 A</option>
                <option value="3x25">3×25 A</option>
                <option value="3x32">3×32 A</option>
                <option value="3x40">3×40 A</option>
                <option value="3x50">3×50 A</option>
                <option value="3x63">3×63 A</option>
                <option value="3x80">3×80 A</option>
                <option value="3x100">3×100 A</option>
                <option value="3x125">3×125 A</option>
                <option value="3x160">3×160 A</option>
              </select>
            </div>

            <div class="field">
              <label>Počet fází</label>
              <select id="s_faze">
                <option value="1">1-fázový</option>
                <option value="3" selected>3-fázový</option>
              </select>
            </div>

            <div class="field">
              <label>Stálá platba dodavateli <span class="unit">Kč/měsíc</span></label>
              <input type="number" id="s_mesicni_plat" value="150" min="0" step="10">
            </div>
          </div>

          <!-- VN pole (skryto defaultně) -->
          <div id="s_vn_sekce" style="display:none">
            <div class="vn-active-notice">
              VN odběr – jistič, fáze a stálá platba se u VN nesledují.
              Místo nich se zadává rezervovaná kapacita a příkon.
            </div>

            <div class="field">
              <label>Rezervovaná kapacita – roční <span class="unit">kW</span></label>
              <input type="number" id="s_vn_rez_kap_rocni" value="200" min="0" step="5">
            </div>

            <div class="field">
              <label>Rezervovaná kapacita – měsíční <span class="unit">kW</span></label>
              <input type="number" id="s_vn_rez_kap_mesicni" value="200" min="0" step="5">
            </div>

            <div class="field">
              <label>Rezervovaný příkon <span class="unit">kW</span></label>
              <input type="number" id="s_vn_rez_prikon" value="300" min="0" step="5">
            </div>

            <div class="field">
              <label>Účiník (cos φ)</label>
              <input type="number" id="s_vn_ucinik" value="0.95" min="0.5" max="1.0" step="0.01">
            </div>

            <div class="field">
              <label>Vlastní trafostanice</label>
              <select id="s_vn_trafo">
                <option value="ne">Ne</option>
                <option value="ano">Ano</option>
              </select>
            </div>

            <div class="field" id="s_vn_trafo_kap_wrap" style="display:none">
              <label>Kapacita trafostanice <span class="unit">kVA</span></label>
              <input type="number" id="s_vn_trafo_kap" value="630" min="0" step="10">
            </div>

            <div class="field">
              <label>Druh měření</label>
              <select id="s_vn_mereni">
                <option value="prime">Přímé</option>
                <option value="neprime">Nepřímé (transformátory proudu)</option>
              </select>
            </div>
          </div>

          <!-- Společné pole pro NN i VN -->
          <div class="field">
            <label>Dodavatel elektřiny</label>
            <select id="s_dodavatel_el">
              <option value="">-- dle smlouvy --</option>
              <option value="CEZ_P">ČEZ Prodej</option>
              <option value="EON">E.ON Energie</option>
              <option value="PRE_P">PRE</option>
              <option value="innogy">innogy</option>
              <option value="bohemia">Bohemia Energy</option>
              <option value="vlastni">Vlastní cena</option>
            </select>
          </div>

          <div class="field">
            <label>Typ tarifu dodavatele</label>
            <select id="s_tarif_typ" onchange="zmenTarifTyp('s')">
              <option value="DT">Fixní cena VT/NT</option>
              <option value="SPOT">Spotová cena (OTE)</option>
            </select>
          </div>

          <div id="s_fixni_ceny">
            <div class="field">
              <label>Cena VT <span class="unit">Kč/MWh bez DPH</span></label>
              <input type="number" id="s_cena_vt" value="3200" min="0" step="10">
            </div>
            <div class="field" id="s_nt_wrap">
              <label>Cena NT <span class="unit">Kč/MWh bez DPH</span></label>
              <input type="number" id="s_cena_nt" value="2100" min="0" step="10">
            </div>
          </div>

          <div id="s_spot_ceny" style="display:none">
            <div class="field">
              <label>Průměrná spot cena OTE <span class="unit">Kč/MWh</span></label>
              <input type="number" id="s_cena_spot" value="1800" min="0" step="10">
            </div>
            <div class="field">
              <label>Marže/koeficient dodavatele <span class="unit">Kč/MWh</span></label>
              <input type="number" id="s_marze" value="350" min="0" step="10">
            </div>
          </div>

          <div class="field">
            <label>Spotřeba VT <span class="unit">MWh/rok</span></label>
            <input type="number" id="s_spotreba_vt" value="12" min="0" step="0.1">
            <div class="hint">Nebo celková spotřeba u jednotarifní sazby</div>
          </div>

          <div class="field" id="s_spotreba_nt_wrap">
            <label>Spotřeba NT <span class="unit">MWh/rok</span></label>
            <input type="number" id="s_spotreba_nt" value="0" min="0" step="0.1">
          </div>
        </div>

        <!-- BUDOUCÍ -->
        <div class="state-panel budouci">
          <div class="state-label">🔮 Budoucí stav (po optimalizaci)</div>

          <div class="field">
            <label>Distributor</label>
            <select id="b_distributor">
              <option value="CEZ">ČEZ Distribuce</option>
              <option value="EGD">EG.D (E.ON)</option>
              <option value="PRE">PREdistribuce (Praha)</option>
            </select>
          </div>

          <div class="field">
            <label>Napěťová hladina</label>
            <select id="b_napeti" onchange="zmenNapeti('b')">
              <option value="NN">NN – nízké napětí</option>
              <option value="VN">VN – vysoké napětí</option>
            </select>
          </div>

          <!-- NN pole -->
          <div id="b_nn_sekce">
            <div class="field" id="b_sazba_wrap">
              <label>Distribuční sazba</label>
              <select id="b_sazba" onchange="aktualizujNTpole('b')">
                <option value="D02d">D02d – jednotarifní standard</option>
                <option value="D01d">D01d – jednotarifní malá spotřeba</option>
                <option value="D25d">D25d – dvoutarifní (8h NT, ohřev vody)</option>
                <option value="D35d">D35d – dvoutarifní (16h NT, vytápění)</option>
                <option value="D45d">D45d – dvoutarifní (20h NT, přímotopy)</option>
                <option value="D56d">D56d – dvoutarifní (20h NT, tepelné čerpadlo)</option>
                <option value="D61d">D61d – dvoutarifní víkendový tarif</option>
                <option value="C01d">C01d – podnikatelé, jednotarifní</option>
                <option value="C02d">C02d – podnikatelé, jednotarifní střední</option>
                <option value="C03d">C03d – podnikatelé, jednotarifní velká</option>
                <option value="C25d">C25d – podnikatelé, dvoutarifní (8h NT)</option>
                <option value="C35d">C35d – podnikatelé, dvoutarifní (16h NT)</option>
                <option value="C45d">C45d – podnikatelé, dvoutarifní (20h NT)</option>
                <option value="C56d">C56d – podnikatelé, TČ (20h NT)</option>
                <option value="C62d">C62d – podnikatelé, víkendový</option>
              </select>
            </div>

            <div class="field">
              <label>Jistič <span class="unit">(dle rozvodné skříně)</span></label>
              <select id="b_jistic">
                <option value="1x25">1×25 A</option>
                <option value="3x10">3×10 A</option>
                <option value="3x16" selected>3×16 A</option>
                <option value="3x20">3×20 A</option>
                <option value="3x25">3×25 A</option>
                <option value="3x32">3×32 A</option>
                <option value="3x40">3×40 A</option>
                <option value="3x50">3×50 A</option>
                <option value="3x63">3×63 A</option>
                <option value="3x80">3×80 A</option>
                <option value="3x100">3×100 A</option>
                <option value="3x125">3×125 A</option>
                <option value="3x160">3×160 A</option>
              </select>
            </div>

            <div class="field">
              <label>Počet fází</label>
              <select id="b_faze">
                <option value="1">1-fázový</option>
                <option value="3" selected>3-fázový</option>
              </select>
            </div>

            <div class="field">
              <label>Stálá platba dodavateli <span class="unit">Kč/měsíc</span></label>
              <input type="number" id="b_mesicni_plat" value="150" min="0" step="10">
            </div>
          </div>

          <!-- VN pole (skryto defaultně) -->
          <div id="b_vn_sekce" style="display:none">
            <div class="vn-active-notice">
              VN odběr – jistič, fáze a stálá platba se u VN nesledují.
            </div>

            <div class="field">
              <label>Rezervovaná kapacita – roční <span class="unit">kW</span></label>
              <input type="number" id="b_vn_rez_kap_rocni" value="200" min="0" step="5">
            </div>

            <div class="field">
              <label>Rezervovaná kapacita – měsíční <span class="unit">kW</span></label>
              <input type="number" id="b_vn_rez_kap_mesicni" value="200" min="0" step="5">
            </div>

            <div class="field">
              <label>Rezervovaný příkon <span class="unit">kW</span></label>
              <input type="number" id="b_vn_rez_prikon" value="300" min="0" step="5">
            </div>

            <div class="field">
              <label>Účiník (cos φ)</label>
              <input type="number" id="b_vn_ucinik" value="0.95" min="0.5" max="1.0" step="0.01">
            </div>

            <div class="field">
              <label>Vlastní trafostanice</label>
              <select id="b_vn_trafo">
                <option value="ne">Ne</option>
                <option value="ano">Ano</option>
              </select>
            </div>

            <div class="field">
              <label>Druh měření</label>
              <select id="b_vn_mereni">
                <option value="prime">Přímé</option>
                <option value="neprime">Nepřímé (transformátory proudu)</option>
              </select>
            </div>
          </div>

          <!-- Společné pole pro NN i VN -->
          <div class="field">
            <label>Dodavatel elektřiny</label>
            <select id="b_dodavatel_el">
              <option value="">-- dle smlouvy --</option>
              <option value="CEZ_P">ČEZ Prodej</option>
              <option value="EON">E.ON Energie</option>
              <option value="PRE_P">PRE</option>
              <option value="innogy">innogy</option>
              <option value="bohemia">Bohemia Energy</option>
              <option value="vlastni">Vlastní cena</option>
            </select>
          </div>

          <div class="field">
            <label>Typ tarifu dodavatele</label>
            <select id="b_tarif_typ" onchange="zmenTarifTyp('b')">
              <option value="DT">Fixní cena VT/NT</option>
              <option value="SPOT">Spotová cena (OTE)</option>
            </select>
          </div>

          <div id="b_fixni_ceny">
            <div class="field">
              <label>Cena VT <span class="unit">Kč/MWh bez DPH</span></label>
              <input type="number" id="b_cena_vt" value="2800" min="0" step="10">
            </div>
            <div class="field" id="b_nt_wrap">
              <label>Cena NT <span class="unit">Kč/MWh bez DPH</span></label>
              <input type="number" id="b_cena_nt" value="1800" min="0" step="10">
            </div>
          </div>

          <div id="b_spot_ceny" style="display:none">
            <div class="field">
              <label>Průměrná spot cena OTE <span class="unit">Kč/MWh</span></label>
              <input type="number" id="b_cena_spot" value="1800" min="0" step="10">
            </div>
            <div class="field">
              <label>Marže/koeficient dodavatele <span class="unit">Kč/MWh</span></label>
              <input type="number" id="b_marze" value="250" min="0" step="10">
            </div>
          </div>

          <div class="field">
            <label>Spotřeba VT <span class="unit">MWh/rok</span></label>
            <input type="number" id="b_spotreba_vt" value="10" min="0" step="0.1">
            <div class="hint">Lze snížit přesunem spotřeby do NT nebo FVE</div>
          </div>

          <div class="field" id="b_spotreba_nt_wrap">
            <label>Spotřeba NT <span class="unit">MWh/rok</span></label>
            <input type="number" id="b_spotreba_nt" value="2" min="0" step="0.1">
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="spocitejElektrinu()">
          ⚡ Spočítat úsporu
        </button>
        <button class="btn btn-secondary" onclick="optimalizujDistribuci()">
          🔍 Najít nejlepší sazbu
        </button>
      </div>

      <div id="elektrina_vysledky" style="display:none"></div>
    </div>
  `;

  // Inicializace zobrazení NT polí
  aktualizujNTpole('s');
  aktualizujNTpole('b');

  // Trafostanice toggle
  document.getElementById('s_vn_trafo')?.addEventListener('change', function() {
    document.getElementById('s_vn_trafo_kap_wrap').style.display = this.value === 'ano' ? 'block' : 'none';
  });
}

// ─── Pomocné UI funkce ───────────────────────────────────────────────────────

function zmenTarifTyp(prefix) {
  const typ = document.getElementById(prefix + '_tarif_typ').value;
  document.getElementById(prefix + '_fixni_ceny').style.display = typ === 'SPOT' ? 'none' : 'block';
  document.getElementById(prefix + '_spot_ceny').style.display  = typ === 'SPOT' ? 'block' : 'none';
}

function zmenNapeti(prefix) {
  const napeti = document.getElementById(prefix + '_napeti').value;
  const nnSekce = document.getElementById(prefix + '_nn_sekce');
  const vnSekce = document.getElementById(prefix + '_vn_sekce');

  if (napeti === 'VN') {
    if (nnSekce) nnSekce.style.display = 'none';
    if (vnSekce) vnSekce.style.display = 'block';
  } else {
    if (nnSekce) nnSekce.style.display = 'block';
    if (vnSekce) vnSekce.style.display = 'none';
  }
  aktualizujNTpole(prefix);
}

function aktualizujNTpole(prefix) {
  const sazbaEl = document.getElementById(prefix + '_sazba');
  if (!sazbaEl) return;
  const sazba = sazbaEl.value;
  const jeTarifDT = ['D25d','D35d','D45d','D56d','D61d','C25d','C35d','C45d','C56d','C62d'].includes(sazba);
  const ntWrap    = document.getElementById(prefix + '_spotreba_nt_wrap');
  const ntCena    = document.getElementById(prefix + '_nt_wrap');
  if (ntWrap) ntWrap.style.display = jeTarifDT ? 'block' : 'none';
  if (ntCena) ntCena.style.display = jeTarifDT ? 'block' : 'none';
}

// ─── Hlavní výpočet ──────────────────────────────────────────────────────────

function spocitejElektrinu() {
  // Načtení vstupů – stávající
  const s = {
    distributor:   document.getElementById('s_distributor').value,
    sazba:         document.getElementById('s_sazba')?.value || 'D02d',
    tarif_typ:     document.getElementById('s_tarif_typ').value,
    spotreba_vt:   parseFloat(document.getElementById('s_spotreba_vt').value) || 0,
    spotreba_nt:   parseFloat(document.getElementById('s_spotreba_nt')?.value) || 0,
    cena_vt:       parseFloat(document.getElementById('s_cena_vt')?.value) || 0,
    cena_nt:       parseFloat(document.getElementById('s_cena_nt')?.value) || 0,
    cena_spot:     parseFloat(document.getElementById('s_cena_spot')?.value) || 0,
    marze_spot:    parseFloat(document.getElementById('s_marze')?.value) || 0,
    mesicni_plat:  parseFloat(document.getElementById('s_mesicni_plat').value) || 0,
    jistic:        document.getElementById('s_jistic').value,
    napeti:        document.getElementById('s_napeti').value
  };

  // Načtení vstupů – budoucí
  const b = {
    distributor:   document.getElementById('b_distributor').value,
    sazba:         document.getElementById('b_sazba')?.value || 'D02d',
    tarif_typ:     document.getElementById('b_tarif_typ').value,
    spotreba_vt:   parseFloat(document.getElementById('b_spotreba_vt').value) || 0,
    spotreba_nt:   parseFloat(document.getElementById('b_spotreba_nt')?.value) || 0,
    cena_vt:       parseFloat(document.getElementById('b_cena_vt')?.value) || 0,
    cena_nt:       parseFloat(document.getElementById('b_cena_nt')?.value) || 0,
    cena_spot:     parseFloat(document.getElementById('b_cena_spot')?.value) || 0,
    marze_spot:    parseFloat(document.getElementById('b_marze')?.value) || 0,
    mesicni_plat:  parseFloat(document.getElementById('b_mesicni_plat').value) || 0,
    jistic:        document.getElementById('b_jistic').value,
    napeti:        document.getElementById('b_napeti').value
  };

  // Výpočet dodávky
  const sDodavka = vypocetDodavky({ ...s, typ_odberu: s.napeti });
  const bDodavka = vypocetDodavky({ ...b, typ_odberu: b.napeti });

  // Výpočet distribuce (z tarify.js)
  const sDistribuce = vypocetDistribuce(s.distributor, s.sazba, s.spotreba_vt, s.spotreba_nt, s.jistic);
  const bDistribuce = vypocetDistribuce(b.distributor, b.sazba, b.spotreba_vt, b.spotreba_nt, b.jistic);

  // Celkové náklady
  const sCelkem = celkoveNaklady(sDodavka, sDistribuce, s.spotreba_vt + s.spotreba_nt);
  const bCelkem = celkoveNaklady(bDodavka, bDistribuce, b.spotreba_vt + b.spotreba_nt);

  // Porovnání
  const porovnani = porovnaniStavu(sCelkem, bCelkem);

  // Uložit do OEES_STATE
  OEES_STATE.case.elektrina = {
    stavajici: { ...s, dodavka: sDodavka, distribuce: sDistribuce, celkem: sCelkem },
    budouci:   { ...b, dodavka: bDodavka, distribuce: bDistribuce, celkem: bCelkem },
    vysledek:  porovnani
  };

  // Zobrazení výsledků
  zobrazVysledkyElektrina(s, b, sCelkem, bCelkem, porovnani, sDodavka, bDodavka, sDistribuce, bDistribuce);
}

function zobrazVysledkyElektrina(s, b, sC, bC, p, sD, bD, sDist, bDist) {
  const el = document.getElementById('elektrina_vysledky');
  el.style.display = 'block';

  const usporaSign = p.je_uspora ? '+' : '';
  const usporaClass = p.je_uspora ? '' : 'ztrata';

  el.innerHTML = `
    <div class="results-panel">
      <h3>📊 Výsledek porovnání</h3>
      <div class="results-grid">
        <div class="result-box">
          <div class="val">${formatCastka(sC.celkem_s_dph)}</div>
          <div class="lbl">Stávající stav (Kč/rok)</div>
        </div>
        <div class="result-box">
          <div class="val">${formatCastka(bC.celkem_s_dph)}</div>
          <div class="lbl">Budoucí stav (Kč/rok)</div>
        </div>
        <div class="result-box highlight">
          <div class="val">${sC.prumer_kc_mwh_vse}</div>
          <div class="lbl">Průměr dnes (Kč/MWh vč. DPH)</div>
        </div>
        <div class="result-box highlight">
          <div class="val">${bC.prumer_kc_mwh_vse}</div>
          <div class="lbl">Průměr budoucí (Kč/MWh vč. DPH)</div>
        </div>
      </div>

      <div class="uspora-badge ${usporaClass}">
        <span class="arrow">${p.je_uspora ? '↓' : '↑'}</span>
        ${p.je_uspora ? 'Úspora' : 'Navýšení'}:
        ${formatCastka(Math.abs(p.uspora_kc_rok))} Kč/rok
        (${Math.abs(p.uspora_procenta)} %) –
        ${formatCastka(Math.abs(p.uspora_kc_mesic))} Kč/měsíc
      </div>

      <table class="breakdown" style="margin-top:20px">
        <thead>
          <tr>
            <th>Složka</th>
            <th class="num">Stávající (Kč/rok)</th>
            <th class="num">Budoucí (Kč/rok)</th>
            <th class="num">Rozdíl</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Dodávka energie (bez DPH)</td>
            <td class="num">${formatCastka(sD.dodavka_energie_kc)}</td>
            <td class="num">${formatCastka(bD.dodavka_energie_kc)}</td>
            <td class="num">${formatRozdil(sD.dodavka_energie_kc - bD.dodavka_energie_kc)}</td>
          </tr>
          <tr>
            <td>Stálá platba dodavateli</td>
            <td class="num">${formatCastka(sD.stala_platba_kc_rok)}</td>
            <td class="num">${formatCastka(bD.stala_platba_kc_rok)}</td>
            <td class="num">${formatRozdil(sD.stala_platba_kc_rok - bD.stala_platba_kc_rok)}</td>
          </tr>
          <tr>
            <td>Distribuce (sazba + POZE + SyS)</td>
            <td class="num">${formatCastka(sDist.celkem_bez_dph)}</td>
            <td class="num">${formatCastka(bDist.celkem_bez_dph)}</td>
            <td class="num">${formatRozdil(sDist.celkem_bez_dph - bDist.celkem_bez_dph)}</td>
          </tr>
          <tr>
            <td>Jistič (rezervovaný příkon)</td>
            <td class="num">${formatCastka(sDist.jistic_kc_rok)}</td>
            <td class="num">${formatCastka(bDist.jistic_kc_rok)}</td>
            <td class="num">${formatRozdil(sDist.jistic_kc_rok - bDist.jistic_kc_rok)}</td>
          </tr>
          <tr>
            <td>DPH 21 %</td>
            <td class="num">${formatCastka(sC.dph_kc)}</td>
            <td class="num">${formatCastka(bC.dph_kc)}</td>
            <td class="num">${formatRozdil(sC.dph_kc - bC.dph_kc)}</td>
          </tr>
          <tr class="total">
            <td><strong>CELKEM vč. DPH</strong></td>
            <td class="num"><strong>${formatCastka(sC.celkem_s_dph)}</strong></td>
            <td class="num"><strong>${formatCastka(bC.celkem_s_dph)}</strong></td>
            <td class="num"><strong>${formatRozdil(p.uspora_kc_rok)}</strong></td>
          </tr>
        </tbody>
      </table>

      ${p.je_uspora ? `
        <div class="doporuceni" style="margin-top:16px;background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.3);color:white">
          <strong>✅ ${p.hodnoceni}</strong>
          Optimalizací lze ušetřit ${formatCastka(p.uspora_kc_rok)} Kč ročně.
          Doporučujeme pokračovat analýzou FVE pro další úspory.
        </div>
      ` : `
        <div class="doporuceni" style="margin-top:16px;background:rgba(231,76,60,0.2);border-color:rgba(231,76,60,0.5);color:white">
          <strong>⚠️ ${p.hodnoceni}</strong>
          Navrhované změny vedou k navýšení nákladů. Upravte parametry.
        </div>
      `}

      ${(function(){
        const voda = OEES_STATE.case?.voda;
        if (!voda || !voda.el_spotreba_tc_tuv_mwh || voda.el_spotreba_tc_tuv_mwh < 0.1) return '';
        const mwh = voda.el_spotreba_tc_tuv_mwh.toFixed(1);
        const kc = Math.round(voda.el_spotreba_tc_tuv_mwh * 1000 * (b.cena_vt || 4.5));
        return '<div class="doporuceni" style="margin-top:12px;background:rgba(59,130,246,0.15);border-color:rgba(59,130,246,0.4);color:white">' +
          '<strong>💧 TČ pro TUV (z modulu Voda)</strong> ' +
          'Tepelné čerpadlo pro ohřev TUV zvýší spotřebu elektřiny o <strong>' + mwh + ' MWh/rok</strong> ' +
          '(≈ ' + new Intl.NumberFormat('cs-CZ').format(kc) + ' Kč/rok). ' +
          'Zohledněte v budoucí spotřebě.' +
          '</div>';
      })()}
    </div>
  `;
}

// ─── Formátovací pomocníky ───────────────────────────────────────────────────

function formatCastka(kc) {
  return new Intl.NumberFormat('cs-CZ').format(Math.abs(kc)) + ' Kč';
}

function formatRozdil(diff) {
  if (diff > 0) return `<span style="color:#4ade80">-${formatCastka(diff)}</span>`;
  if (diff < 0) return `<span style="color:#f87171">+${formatCastka(Math.abs(diff))}</span>`;
  return '–';
}

// Export
if (typeof module !== 'undefined') {
  module.exports = { vypocetDodavky, celkoveNaklady, porovnaniStavu };
}
