/**
 * OEES – Datový soubor distribučních tarifů elektřiny
 * Zdroj: ERÚ Cenový výměr č. 13/2025 a 14/2025, platný od 1. 1. 2026
 * Aktualizace: 2026-03-05
 *
 * Struktura ceny distribuce NN:
 *  - cena_vt:    Kč/MWh (vysoký tarif / jednotarifní)
 *  - cena_nt:    Kč/MWh (nízký tarif, 0 pro jednotarifní sazby)
 *  - nt_hodiny:  hodin/den v NT (0 pro jednotarifní)
 *  - jistic:     objekt { "1x25":XX, "3x10":XX, ... } Kč/měsíc
 *
 * Distributorské zóny:
 *  - CEZ  = ČEZ Distribuce (Čechy, část Moravy)
 *  - EGD  = EG.D (jihozápad + jihovýchod ČR)
 *  - PRE  = PREdistribuce (Praha)
 */

const TARIFY_2026 = {

  // ─── SLOŽKY NEZÁVISLÉ NA DISTRIBUTOROVI ──────────────────────────────────
  spolecne: {
    // Systémové služby (ČEPS) – stejné pro všechny distributory
    systemove_sluzby_vt: 120.0,   // Kč/MWh – orientační 2026
    systemove_sluzby_nt: 120.0,

    // POZE (podpora OZE) – vláda přenesla na stát, zbývá symbolická částka
    poze: 8.27,                    // Kč/MWh bez DPH (= 10 Kč/MWh vč. DPH)

    // OTE poplatek (operátor trhu)
    ote: 4.13,                     // Kč/MWh – orientační 2026

    // Daň z elektřiny
    dan_elektriny: 28.3,           // Kč/MWh (zákonná sazba)

    // DPH
    dph: 0.21
  },

  // ─── ČEZ DISTRIBUCE ──────────────────────────────────────────────────────
  CEZ: {
    nazev: "ČEZ Distribuce",
    region: "Čechy, severní a střední Morava",

    sazby: {
      // Jednotarifní sazby (VT = jednotná cena, NT = 0)
      D01d: {
        popis: "Jednotarifní – malá spotřeba (do 1 800 kWh/rok)",
        tarif: "JT",
        cena_vt: 1650.0,   // Kč/MWh – TODO: ověřit z ERÚ PDF
        cena_nt: 0,
        nt_hodiny: 0
      },
      D02d: {
        popis: "Jednotarifní – standardní domácnost",
        tarif: "JT",
        cena_vt: 2078.58,  // Kč/MWh – ověřeno z ERÚ 2026
        cena_nt: 0,
        nt_hodiny: 0
      },

      // Dvoutarifní sazby
      D25d: {
        popis: "Dvoutarifní – akumulační ohřev vody (8h NT/den)",
        tarif: "DT",
        cena_vt: 2350.0,   // Kč/MWh – TODO: ověřit
        cena_nt: 950.0,    // Kč/MWh – TODO: ověřit
        nt_hodiny: 8
      },
      D35d: {
        popis: "Dvoutarifní – kombinované vytápění (16h NT/den)",
        tarif: "DT",
        cena_vt: 2400.0,   // Kč/MWh – TODO: ověřit
        cena_nt: 850.0,    // Kč/MWh – TODO: ověřit
        nt_hodiny: 16
      },
      D45d: {
        popis: "Dvoutarifní – přímotopy (20h NT/den)",
        tarif: "DT",
        cena_vt: 2450.0,   // Kč/MWh – TODO: ověřit
        cena_nt: 800.0,    // Kč/MWh – TODO: ověřit
        nt_hodiny: 20
      },
      D56d: {
        popis: "Dvoutarifní – tepelné čerpadlo (20h NT/den)",
        tarif: "DT",
        cena_vt: 2350.0,   // Kč/MWh – TODO: ověřit
        cena_nt: 780.0,    // Kč/MWh – TODO: ověřit
        nt_hodiny: 20
      },
      D61d: {
        popis: "Dvoutarifní – víkendový / noční tarif",
        tarif: "DT",
        cena_vt: 2300.0,   // Kč/MWh – TODO: ověřit
        cena_nt: 700.0,    // Kč/MWh – TODO: ověřit
        nt_hodiny: 16      // variabilní dle nastavení HDO
      },

      // ─── C-sazby (podnikatelé) ──────────────────────────
      C01d: {
        popis: "Podnikatelé – jednotarifní malá spotřeba",
        tarif: "JT",
        cena_vt: 1680.0,   // Kč/MWh – orientační 2026
        cena_nt: 0,
        nt_hodiny: 0
      },
      C02d: {
        popis: "Podnikatelé – jednotarifní standardní",
        tarif: "JT",
        cena_vt: 2100.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C03d: {
        popis: "Podnikatelé – jednotarifní velká spotřeba",
        tarif: "JT",
        cena_vt: 2050.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C25d: {
        popis: "Podnikatelé – dvoutarifní (8h NT/den)",
        tarif: "DT",
        cena_vt: 2380.0,
        cena_nt: 970.0,
        nt_hodiny: 8
      },
      C35d: {
        popis: "Podnikatelé – dvoutarifní (16h NT/den)",
        tarif: "DT",
        cena_vt: 2430.0,
        cena_nt: 870.0,
        nt_hodiny: 16
      },
      C45d: {
        popis: "Podnikatelé – dvoutarifní (20h NT/den)",
        tarif: "DT",
        cena_vt: 2480.0,
        cena_nt: 820.0,
        nt_hodiny: 20
      },
      C56d: {
        popis: "Podnikatelé – tepelné čerpadlo (20h NT/den)",
        tarif: "DT",
        cena_vt: 2380.0,
        cena_nt: 800.0,
        nt_hodiny: 20
      },
      C62d: {
        popis: "Podnikatelé – víkendový tarif",
        tarif: "DT",
        cena_vt: 2330.0,
        cena_nt: 720.0,
        nt_hodiny: 16
      }
    },

    // Platba za jistič (Kč/měsíc) – rezervovaný příkon
    jistic: {
      "1x10":  38,
      "1x16":  58,
      "1x20":  70,
      "1x25":  87,
      "3x10":  95,
      "3x16": 102,   // ověřeno 2026
      "3x20": 135,
      "3x25": 172,   // tepelná čerpadla – +18% oproti 2025
      "3x32": 220,
      "3x40": 270,
      "3x50": 340,
      "3x63": 430,
      "3x80": 550,
      "3x100": 695,
      "3x160": 1120
    }
  },

  // ─── EG.D (E.ON Distribuce) ───────────────────────────────────────────────
  EGD: {
    nazev: "EG.D (E.ON Distribuce)",
    region: "Jihozápad a jihovýchod ČR (ex E.ON)",

    sazby: {
      D01d: {
        popis: "Jednotarifní – malá spotřeba",
        tarif: "JT",
        cena_vt: 1800.0,   // Kč/MWh – TODO: ověřit
        cena_nt: 0,
        nt_hodiny: 0
      },
      D02d: {
        popis: "Jednotarifní – standardní domácnost",
        tarif: "JT",
        cena_vt: 2295.34,  // Kč/MWh – ověřeno z ERÚ 2026
        cena_nt: 0,
        nt_hodiny: 0
      },
      D25d: {
        popis: "Dvoutarifní – akumulační ohřev vody (8h NT/den)",
        tarif: "DT",
        cena_vt: 2500.0,
        cena_nt: 980.0,
        nt_hodiny: 8
      },
      D35d: {
        popis: "Dvoutarifní – kombinované vytápění (16h NT/den)",
        tarif: "DT",
        cena_vt: 2550.0,
        cena_nt: 900.0,
        nt_hodiny: 16
      },
      D45d: {
        popis: "Dvoutarifní – přímotopy (20h NT/den)",
        tarif: "DT",
        cena_vt: 2580.0,
        cena_nt: 850.0,
        nt_hodiny: 20
      },
      D56d: {
        popis: "Dvoutarifní – tepelné čerpadlo (20h NT/den)",
        tarif: "DT",
        cena_vt: 2480.0,
        cena_nt: 820.0,
        nt_hodiny: 20
      },
      D61d: {
        popis: "Dvoutarifní – víkendový tarif",
        tarif: "DT",
        cena_vt: 2420.0,
        cena_nt: 730.0,
        nt_hodiny: 16
      },

      // ─── C-sazby (podnikatelé) ──────────────────────────
      C01d: {
        popis: "Podnikatelé – jednotarifní malá spotřeba",
        tarif: "JT",
        cena_vt: 1830.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C02d: {
        popis: "Podnikatelé – jednotarifní standardní",
        tarif: "JT",
        cena_vt: 2320.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C03d: {
        popis: "Podnikatelé – jednotarifní velká spotřeba",
        tarif: "JT",
        cena_vt: 2270.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C25d: {
        popis: "Podnikatelé – dvoutarifní (8h NT/den)",
        tarif: "DT",
        cena_vt: 2530.0,
        cena_nt: 1000.0,
        nt_hodiny: 8
      },
      C35d: {
        popis: "Podnikatelé – dvoutarifní (16h NT/den)",
        tarif: "DT",
        cena_vt: 2580.0,
        cena_nt: 920.0,
        nt_hodiny: 16
      },
      C45d: {
        popis: "Podnikatelé – dvoutarifní (20h NT/den)",
        tarif: "DT",
        cena_vt: 2610.0,
        cena_nt: 870.0,
        nt_hodiny: 20
      },
      C56d: {
        popis: "Podnikatelé – tepelné čerpadlo (20h NT/den)",
        tarif: "DT",
        cena_vt: 2510.0,
        cena_nt: 840.0,
        nt_hodiny: 20
      },
      C62d: {
        popis: "Podnikatelé – víkendový tarif",
        tarif: "DT",
        cena_vt: 2450.0,
        cena_nt: 750.0,
        nt_hodiny: 16
      }
    },

    jistic: {
      "1x10":  42,
      "1x16":  62,
      "1x20":  78,
      "1x25": 100,   // ověřeno 2026
      "3x10": 105,
      "3x16": 142,   // ověřeno – nárůst 142% oproti 2025
      "3x20": 180,
      "3x25": 225,
      "3x32": 285,
      "3x40": 360,
      "3x50": 450,
      "3x63": 570,
      "3x80": 720,
      "3x100": 910,
      "3x160": 1460
    }
  },

  // ─── PREdistribuce (Praha) ────────────────────────────────────────────────
  PRE: {
    nazev: "PREdistribuce",
    region: "Praha a okolí",

    sazby: {
      D01d: {
        popis: "Jednotarifní – malá spotřeba",
        tarif: "JT",
        cena_vt: 1520.0,   // Kč/MWh – orientační (D01d +23% oproti 2025)
        cena_nt: 0,
        nt_hodiny: 0
      },
      D02d: {
        popis: "Jednotarifní – standardní domácnost",
        tarif: "JT",
        cena_vt: 1516.53,  // Kč/MWh – ověřeno z ERÚ 2026
        cena_nt: 0,
        nt_hodiny: 0
      },
      D25d: {
        popis: "Dvoutarifní – akumulační ohřev vody (8h NT/den)",
        tarif: "DT",
        cena_vt: 1800.0,
        cena_nt: 750.0,
        nt_hodiny: 8
      },
      D35d: {
        popis: "Dvoutarifní – kombinované vytápění (16h NT/den)",
        tarif: "DT",
        cena_vt: 1850.0,
        cena_nt: 680.0,
        nt_hodiny: 16
      },
      D45d: {
        popis: "Dvoutarifní – přímotopy (20h NT/den)",
        tarif: "DT",
        cena_vt: 1900.0,
        cena_nt: 650.0,
        nt_hodiny: 20
      },
      D56d: {
        popis: "Dvoutarifní – tepelné čerpadlo (20h NT/den)",
        tarif: "DT",
        cena_vt: 1820.0,
        cena_nt: 630.0,
        nt_hodiny: 20
      },
      D61d: {
        popis: "Dvoutarifní – víkendový tarif",
        tarif: "DT",
        cena_vt: 1750.0,
        cena_nt: 580.0,
        nt_hodiny: 16
      },

      // ─── C-sazby (podnikatelé) ──────────────────────────
      C01d: {
        popis: "Podnikatelé – jednotarifní malá spotřeba",
        tarif: "JT",
        cena_vt: 1550.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C02d: {
        popis: "Podnikatelé – jednotarifní standardní",
        tarif: "JT",
        cena_vt: 1540.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C03d: {
        popis: "Podnikatelé – jednotarifní velká spotřeba",
        tarif: "JT",
        cena_vt: 1500.0,
        cena_nt: 0,
        nt_hodiny: 0
      },
      C25d: {
        popis: "Podnikatelé – dvoutarifní (8h NT/den)",
        tarif: "DT",
        cena_vt: 1830.0,
        cena_nt: 770.0,
        nt_hodiny: 8
      },
      C35d: {
        popis: "Podnikatelé – dvoutarifní (16h NT/den)",
        tarif: "DT",
        cena_vt: 1880.0,
        cena_nt: 700.0,
        nt_hodiny: 16
      },
      C45d: {
        popis: "Podnikatelé – dvoutarifní (20h NT/den)",
        tarif: "DT",
        cena_vt: 1930.0,
        cena_nt: 670.0,
        nt_hodiny: 20
      },
      C56d: {
        popis: "Podnikatelé – tepelné čerpadlo (20h NT/den)",
        tarif: "DT",
        cena_vt: 1850.0,
        cena_nt: 650.0,
        nt_hodiny: 20
      },
      C62d: {
        popis: "Podnikatelé – víkendový tarif",
        tarif: "DT",
        cena_vt: 1780.0,
        cena_nt: 600.0,
        nt_hodiny: 16
      }
    },

    jistic: {
      "1x10":  32,
      "1x16":  48,
      "1x20":  60,
      "1x25":  87,   // ověřeno 2026 (+60 Kč/měsíc oproti 2025)
      "3x10":  80,
      "3x16":  87,
      "3x20": 110,
      "3x25": 140,
      "3x32": 178,
      "3x40": 220,
      "3x50": 278,
      "3x63": 350,
      "3x80": 445,
      "3x100": 560,
      "3x160": 900
    }
  }
};

/**
 * Vrátí distribuční cenu za elektřinu pro daný distributor, sazbu a spotřebu.
 * @param {string} distributor  "CEZ" | "EGD" | "PRE"
 * @param {string} sazba        "D02d" | "D56d" | ...
 * @param {number} spotreba_vt  MWh/rok ve VT (nebo celková spotřeba pro JT)
 * @param {number} spotreba_nt  MWh/rok v NT (0 pro jednotarifní)
 * @param {string} jistic_typ   "3x16" | "3x25" | ...
 * @returns {object} { distribuce_kc_rok, jistic_kc_rok, celkem_kc_rok, prumer_kc_mwh }
 */
function vypocetDistribuce(distributor, sazba, spotreba_vt, spotreba_nt, jistic_typ) {
  const dist = TARIFY_2026[distributor];
  const saz  = dist.sazby[sazba];
  const spol = TARIFY_2026.spolecne;

  const celkova_spotreba = spotreba_vt + spotreba_nt;

  // Distribuční složka
  const distribuce_vt = spotreba_vt * saz.cena_vt / 1000;  // Kč (cena je Kč/MWh, spotřeba MWh)
  const distribuce_nt = spotreba_nt * saz.cena_nt / 1000;
  const distribuce_rok = distribuce_vt + distribuce_nt;

  // Jistič
  const jistic_rok = (dist.jistic[jistic_typ] || 0) * 12;

  // Systémové složky (stejné pro všechny)
  const poze_rok       = celkova_spotreba * spol.poze / 1000;
  const sys_sluzby_rok = celkova_spotreba * spol.systemove_sluzby_vt / 1000;
  const ote_rok        = celkova_spotreba * spol.ote / 1000;
  const dan_rok        = celkova_spotreba * spol.dan_elektriny / 1000;

  const celkem_bez_dph = distribuce_rok + jistic_rok + poze_rok + sys_sluzby_rok + ote_rok + dan_rok;
  const dph            = celkem_bez_dph * spol.dph;
  const celkem_s_dph   = celkem_bez_dph + dph;

  return {
    distribuce_kc_rok:  Math.round(distribuce_rok),
    jistic_kc_rok:      Math.round(jistic_rok),
    poze_kc_rok:        Math.round(poze_rok),
    sys_sluzby_kc_rok:  Math.round(sys_sluzby_rok),
    dan_kc_rok:         Math.round(dan_rok),
    celkem_bez_dph:     Math.round(celkem_bez_dph),
    dph_kc:             Math.round(dph),
    celkem_s_dph:       Math.round(celkem_s_dph),
    prumer_kc_mwh:      celkova_spotreba > 0
                          ? Math.round(celkem_s_dph / celkova_spotreba * 1000)
                          : 0
  };
}

// ─── SPOTŘEBIČE PRO OPTIMALIZACI DISTRIBUCE (dle V15) ─────────────────────

const SPOTREBICE_TYPY = [
  { id: 'osvetleni',     nazev: 'Osvětlení',                  vychozi_kw: 0 },
  { id: 'bojler',        nazev: 'Bojler / ohřev vody',        vychozi_kw: 0 },
  { id: 'tc',            nazev: 'Tepelné čerpadlo',           vychozi_kw: 0 },
  { id: 'primotop',      nazev: 'Přímotop / el. vytápění',    vychozi_kw: 0 },
  { id: 'klimatizace',   nazev: 'Klimatizace',                vychozi_kw: 0 },
  { id: 'ev_nabijec',    nazev: 'Nabíječka EV',               vychozi_kw: 0 },
  { id: 'fve',           nazev: 'FVE / střídač',              vychozi_kw: 0 },
  { id: 'baterie',       nazev: 'Bateriové úložiště',         vychozi_kw: 0 },
  { id: 'pracka',        nazev: 'Pračka / sušička',           vychozi_kw: 0 },
  { id: 'myc',           nazev: 'Myčka nádobí',               vychozi_kw: 0 },
  { id: 'trouba',        nazev: 'Trouba / varná deska',       vychozi_kw: 0 },
  { id: 'lednice',       nazev: 'Lednice / mrazák',           vychozi_kw: 0 },
  { id: 'cerpadlo',      nazev: 'Čerpadlo (voda, bazén)',     vychozi_kw: 0 },
  { id: 'dílna',         nazev: 'Dílenské nářadí',            vychozi_kw: 0 },
  { id: 'sauna',         nazev: 'Sauna / vířivka',            vychozi_kw: 0 },
  { id: 'server',        nazev: 'Server / IT',                vychozi_kw: 0 },
  { id: 'ostatni',       nazev: 'Ostatní',                    vychozi_kw: 0 }
];

// Investiční náklad na úpravu spotřebiče pro danou sazbu (Kč/kW)
const INVESTICE_KW_SAZBA = {
  D25d: 1500, D26d: 2000, D27d: 13500, D35d: 0, D45d: 0,
  D56d: 2000, D57d: 1500, D61d: 9000,
  C25d: 1500, C26d: 2000, C27d: 13500, C35d: 0, C45d: 0,
  C56d: 2000, C57d: 1500, C62d: 9000
};

// Minimální výkon spotřebiče (kW) pro způsobilost k dané sazbě
const MIN_KW_SAZBA = {
  D25d: 1.0, D26d: 1.0, D27d: 2.0, D35d: 0, D45d: 0,
  D56d: 2.0, D57d: 2.0, D61d: 0,
  C25d: 1.0, C26d: 1.0, C27d: 2.0, C35d: 0, C45d: 0,
  C56d: 2.0, C57d: 2.0, C62d: 0
};

// Optimalizační náklady (admin + práce) bez investice do spotřebičů
const OPTIMALIZACE_NAKLADY = {
  admin_poplatek: 500,     // Kč – poplatek distributorovi za změnu sazby
  prace_hodina:   800,     // Kč/h – práce elektrikáře
  prace_hodiny:   2        // h – odhadovaný čas na přepojení HDO
};

// ─── TARIFY VN (vysoké napětí) 2026 ──────────────────────────────────────────
// Zdroj: ERÚ cenové rozhodnutí č. 13/2025 (VVN/VN), upraveno o pokles ~5,8 % pro 2026

// ── VN tarify – ERÚ cenové rozhodnutí (odhad 2026 z ERÚ 2025 +/- korekce) ──
// Zdroje: ERÚ rozhodnutí 7/2023, 11/2024, SPČR analýza, ČEZ/EGD/PRE ceníky
//
// POJMY:
// - Rezervovaný příkon = technický limit přípojky (smlouva o připojení), pevný
// - Roční rezervovaná kapacita (RK) = smluvní max 1/4h výkon na celý rok, levnější
// - Měsíční rezervovaná kapacita (MK) = dodatečná kapacita nad RK pro daný měsíc, dražší (~10%)
// - Pravidlo: RK + MK <= Rezervovaný příkon
// - Optimalizace: nastavit RK na celoroční minimum, MK přidávat jen v měsících se špičkou

const TARIFY_VN_2026 = {

  spolecne: {
    systemove_sluzby: 164.24,   // Kč/MWh – ERÚ 2026
    ote_mesic:        2.39,     // Kč/OM/měsíc
    poze:             0,        // Kč/MWh – od 2026 hradí stát
    dan_elektriny:    28.30,    // Kč/MWh
    dph:              0.21,
    // Penalizace za překročení
    penalizace_kapacita_nasobek: 1.5,   // 1,5× měsíční sazba RK za MW překročení RK
    penalizace_prikon_nasobek:   4,     // 4× roční sazba RK za MW překročení příkonu
    penalizace_jalovy_kvarh:     0.44,  // Kč/kVArh (= 440 Kč/MVArh)
    ucinek_min: 0.95,                   // min cos φ (neutrální pásmo 0,95–1,00)
    ucinek_max: 1.00,
    // Orientační cena kompenzačního rozváděče
    kompenzace_kc_kvar: 350             // Kč/kVAr instalovaného výkonu
  },

  CEZ: {
    nazev: "ČEZ Distribuce",
    region: "Čechy, severní a střední Morava",
    // Ceny za rezervovanou kapacitu (Kč/MW/měsíc)
    rocni_kapacita:    243700,   // Roční RK – levnější, fixní 12 měsíců
    mesicni_kapacita:  267000,   // Měsíční MK – dražší (~10%), flexibilní
    pouziti_siti:      88.50,    // Kč/MWh (2025: silný pokles ~53%)
    jednoslozkova:     4035.45,  // Kč/MWh – bez měření příkonu
    // Penalizace za překročení
    penalizace_prekroceni_rk_kw:  365,  // Kč/kW/měs za překročení RK (1,5× rocni/1000)
    penalizace_prekroceni_prikon_kw: 975  // Kč/kW/měs za překročení příkonu (4× rocni/1000)
  },

  EGD: {
    nazev: "EG.D (E.ON Distribuce)",
    region: "Jihozápad a jihovýchod ČR",
    rocni_kapacita:    212260,
    mesicni_kapacita:  237500,
    pouziti_siti:      88.20,
    jednoslozkova:     3538.84,
    penalizace_prekroceni_rk_kw:  318,
    penalizace_prekroceni_prikon_kw: 849
  },

  PRE: {
    nazev: "PREdistribuce",
    region: "Praha a okolí",
    rocni_kapacita:    240950,
    mesicni_kapacita:  266700,
    pouziti_siti:      55.30,
    jednoslozkova:     3925.31,
    penalizace_prekroceni_rk_kw:  361,
    penalizace_prekroceni_prikon_kw: 964
  }
};

// Export pro použití v ostatních modulech
if (typeof module !== 'undefined') {
  module.exports = { TARIFY_2026, vypocetDistribuce, SPOTREBICE_TYPY, INVESTICE_KW_SAZBA, MIN_KW_SAZBA, OPTIMALIZACE_NAKLADY, TARIFY_VN_2026 };
}
