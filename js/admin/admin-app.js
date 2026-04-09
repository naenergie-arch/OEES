/* ================================================================
   OEES Admin – Core Controller, Auth & API
   ================================================================ */

const ADMIN_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbzRTSFxU28lSpMCS5JKD9yBtuj_YCRqXzx61KDS7SctpbnKx6Y4hkpZZDKz6blYJRU/exec',
  sheetId: '188Z6jN_VALp59XsoEw-gkGX2xjJkr_-FNQ92ocbErGw',
  version: '1.0.0'
};

// ── Admin State ──
const ADMIN_STATE = {
  authenticated: false,
  ceniky: [],
  rozpocty: [],
  pd: [],
  naklady: [],
  provizniTabulka: [],
  provizniEtapy: [],
  poradci: [],
  dodavatele: [],
  technologie: [],
  adminUsers: [],
  settings: {}
};

// ── Default Data (vychozi hodnoty pred nactenim z DB) ──
const DEFAULT_SCALING_TABLE = [
  { pasmoId: 1, dolni_kc: 0,        horni_kc: 1000000,  dolni_marze: 20, horni_marze: 20 },
  { pasmoId: 2, dolni_kc: 1000000,  horni_kc: 2000000,  dolni_marze: 14, horni_marze: 12 },
  { pasmoId: 3, dolni_kc: 2000000,  horni_kc: 3000000,  dolni_marze: 12, horni_marze: 10 },
  { pasmoId: 4, dolni_kc: 3000000,  horni_kc: 5000000,  dolni_marze: 10, horni_marze: 8 },
  { pasmoId: 5, dolni_kc: 5000000,  horni_kc: 10000000, dolni_marze: 8,  horni_marze: 7 },
  { pasmoId: 6, dolni_kc: 10000000, horni_kc: 15000000, dolni_marze: 7,  horni_marze: 6 },
  { pasmoId: 7, dolni_kc: 15000000, horni_kc: 20000000, dolni_marze: 6,  horni_marze: 5 },
  { pasmoId: 8, dolni_kc: 20000000, horni_kc: 999999999,dolni_marze: 5,  horni_marze: 4 }
];

const DEFAULT_ETAPY = [
  { etapaId: 1, podil_pct: 5,  cinnost: 'Poskytnuti kontaktu na klienta',              za_obchod_pct: 5,  za_odbornost_pct: 0 },
  { etapaId: 2, podil_pct: 10, cinnost: 'Domluveni 1. schuzky, zalozeni OP v NIS',     za_obchod_pct: 10, za_odbornost_pct: 0 },
  { etapaId: 3, podil_pct: 20, cinnost: 'Absolvovani 1. schuzky u klienta',            za_obchod_pct: 10, za_odbornost_pct: 10 },
  { etapaId: 4, podil_pct: 5,  cinnost: 'Nahrani zakladnich podkladu do NIS',           za_obchod_pct: 5,  za_odbornost_pct: 0 },
  { etapaId: 5, podil_pct: 10, cinnost: 'Vypracovani predbezne studie v kalkulatoru',   za_obchod_pct: 0,  za_odbornost_pct: 10 },
  { etapaId: 6, podil_pct: 10, cinnost: 'Vypracovani modelace v PVSol/SolarEdge',       za_obchod_pct: 0,  za_odbornost_pct: 10 },
  { etapaId: 7, podil_pct: 30, cinnost: 'Obhajoba + podpis studie/smlouvy',            za_obchod_pct: 15, za_odbornost_pct: 15 },
  { etapaId: 8, podil_pct: 5,  cinnost: 'Obstarani podkladu za EP a nahrani do NIS',    za_obchod_pct: 5,  za_odbornost_pct: 0 },
  { etapaId: 9, podil_pct: 5,  cinnost: 'Obstarani podkladu za ESO a nahrani do NIS',   za_obchod_pct: 0,  za_odbornost_pct: 5 }
];

// Vychozi ciselnik technologii – muze byt rozsireny v Nastaveni
const DEFAULT_TECHNOLOGIE = [
  { value: 'fve',          label: 'FVE',                       cenovy_vzorec: '{{FVECena}}',           nazev_rozpocet: 'Fotovoltaická elektrárna' },
  { value: 'tc',           label: 'Tepelné čerpadlo',          cenovy_vzorec: '{{TUVCena}}',           nazev_rozpocet: 'Tepelné čerpadlo' },
  { value: 'baterie',      label: 'Baterie',                   cenovy_vzorec: '{{BaterieCena}}',       nazev_rozpocet: 'Bateriové úložiště' },
  { value: 'ev',           label: 'Nabíječka elektromobilů',   cenovy_vzorec: '{{NabijeckaCena}}',     nazev_rozpocet: 'Nabíječka elektromobilů' },
  { value: 'kogenerace',   label: 'Kogenerace',                cenovy_vzorec: '{{KGJCena}}',           nazev_rozpocet: 'Kogenerační jednotka' },
  { value: 'kotel',        label: 'Plynový kotel',             cenovy_vzorec: '{{PLKCena}}',           nazev_rozpocet: 'Plynový kotel' },
  { value: 'inteligentni', label: 'Inteligentní řízení',       cenovy_vzorec: '{{RizeniCena}}',        nazev_rozpocet: 'Inteligentní řízení + dispečerské řízení' },
  { value: 'voda',         label: 'Voda',                      cenovy_vzorec: '{{WavitarCena}}',       nazev_rozpocet: 'Recyklace vody s rekuperací tepla' },
  { value: 'distribuce',   label: 'Optimalizace + Sloučení',   cenovy_vzorec: '{{OptimalizaceCena}}',  nazev_rozpocet: 'Optimalizace sazby, jističe, sloučení' },
  { value: 'dokumentace',  label: 'Projektová dokumentace',    cenovy_vzorec: '{{dokumentaceCena}}',   nazev_rozpocet: 'Projektová dokumentace' }
];

// Dynamicky seznam – pouzivej getTechnologieList() vsude
function getTechnologieList() {
  return ADMIN_STATE.technologie && ADMIN_STATE.technologie.length
    ? ADMIN_STATE.technologie
    : DEFAULT_TECHNOLOGIE;
}

// Alias pro zpetnou kompatibilitu
const TECHNOLOGIE_LIST = DEFAULT_TECHNOLOGIE;

// ── Default Rozpocty (sablony z V15 Centralniho kalkulatoru) ──
const DEFAULT_ROZPOCTY = [
  // ====== CELKOVY POLOZKOV ROZPOCET (souhrn) ======
  { rozpocetId: 'c01', technologie: 'voda',         typ_rozpoctu: 'celkovy', nazev_polozky: 'Recyklace vody s rekuperaci tepla z odpadni vody', mj: 'kpl', podil_pct: null, poradi: 1, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{WavitarCena}}', poznamka: '' },
  { rozpocetId: 'c02', technologie: 'distribuce',   typ_rozpoctu: 'celkovy', nazev_polozky: 'Optimalizace sazby, optimalizace jistice, slouceni odbernych mist', mj: 'kpl', podil_pct: null, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{OptimalizaceCena}}', poznamka: '' },
  { rozpocetId: 'c03', technologie: 'fve',          typ_rozpoctu: 'celkovy', nazev_polozky: 'Fotovoltaicka elektrarna', mj: 'kpl', podil_pct: null, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{FVECena}}', poznamka: '' },
  { rozpocetId: 'c04', technologie: 'tc',           typ_rozpoctu: 'celkovy', nazev_polozky: 'Tepelne cerpadlo', mj: 'kpl', podil_pct: null, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{TUVCena}}', poznamka: '' },
  { rozpocetId: 'c05', technologie: 'kogenerace',   typ_rozpoctu: 'celkovy', nazev_polozky: 'Kogeneracni jednotka', mj: 'kpl', podil_pct: null, poradi: 5, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{KGJCena}}', poznamka: '' },
  { rozpocetId: 'c06', technologie: 'kotel',        typ_rozpoctu: 'celkovy', nazev_polozky: 'Plynovy kotel', mj: 'kpl', podil_pct: null, poradi: 6, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{PLKCena}}', poznamka: '' },
  { rozpocetId: 'c07', technologie: 'ev',           typ_rozpoctu: 'celkovy', nazev_polozky: 'Nabijecka elektromobilu', mj: 'kpl', podil_pct: null, poradi: 7, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{NabijeckaCena}}', poznamka: '' },
  { rozpocetId: 'c08', technologie: 'inteligentni', typ_rozpoctu: 'celkovy', nazev_polozky: 'Inteligentni rizeni + dispecerske rizeni', mj: 'kpl', podil_pct: null, poradi: 8, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{RizeniCena}}', poznamka: '' },
  { rozpocetId: 'c09', technologie: 'dokumentace',  typ_rozpoctu: 'celkovy', nazev_polozky: 'Projektova dokumentace', mj: 'kpl', podil_pct: null, poradi: 9, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '{{dokumentaceCena}}', poznamka: '' },

  // ====== DILCI ROZPOCTY ======

  // -- VODA (6 polozek, procentni podily z celku) --
  { rozpocetId: 'd_voda_01', technologie: 'voda', typ_rozpoctu: 'dilci', nazev_polozky: 'Nadrz COV + ostatni nadrze', mj: 'kpl', podil_pct: 50, poradi: 1, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_voda_02', technologie: 'voda', typ_rozpoctu: 'dilci', nazev_polozky: 'Elektro vybaveni', mj: 'kpl', podil_pct: 6, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_voda_03', technologie: 'voda', typ_rozpoctu: 'dilci', nazev_polozky: 'Voda vybaveni', mj: 'kpl', podil_pct: 8, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_voda_04', technologie: 'voda', typ_rozpoctu: 'dilci', nazev_polozky: 'Instalace, montaz a doprava', mj: 'kpl', podil_pct: 25, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_voda_05', technologie: 'voda', typ_rozpoctu: 'dilci', nazev_polozky: 'Rekuperace tepla', mj: 'kpl', podil_pct: 7, poradi: 5, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_voda_06', technologie: 'voda', typ_rozpoctu: 'dilci', nazev_polozky: 'Testovani a ladeni', mj: 'kpl', podil_pct: 4, poradi: 6, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },

  // -- DISTRIBUCE / OPTIMALIZACE + SLOUCENI (5 polozek) --
  { rozpocetId: 'd_dist_01', technologie: 'distribuce', typ_rozpoctu: 'dilci', nazev_polozky: 'Slucovani odbernych mist', mj: 'kpl', podil_pct: null, poradi: 1, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: 'Cena z cenove nabidky slouceni' },
  { rozpocetId: 'd_dist_02', technologie: 'distribuce', typ_rozpoctu: 'dilci', nazev_polozky: 'Naklady na optimalizaci sazby bez investice do spotrebicu', mj: 'kpl', podil_pct: null, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_dist_03', technologie: 'distribuce', typ_rozpoctu: 'dilci', nazev_polozky: 'Investice do rozsireni spotrebicu pro splneni podminek optimalizace', mj: 'kpl', podil_pct: null, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_dist_04', technologie: 'distribuce', typ_rozpoctu: 'dilci', nazev_polozky: 'Prace spojene s optimalizaci dle poctu OM', mj: 'kpl', podil_pct: null, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_dist_05', technologie: 'distribuce', typ_rozpoctu: 'dilci', nazev_polozky: 'Rezerva', mj: 'kpl', podil_pct: null, poradi: 5, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },

  // -- FVE (10 polozek) --
  { rozpocetId: 'd_fve_01', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'Baterie', mj: 'kWh', podil_pct: null, poradi: 1, mnozstvi_vzorec: 'baterie_kwh', cena_ref_cenikId: '', cena_vzorec: '', poznamka: 'Cena z ceniku baterii' },
  { rozpocetId: 'd_fve_02', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'FVE - technologie', mj: 'kWp', podil_pct: null, poradi: 2, mnozstvi_vzorec: 'fve_kwp', cena_ref_cenikId: '', cena_vzorec: '', poznamka: 'Stridace, elektro' },
  { rozpocetId: 'd_fve_03', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'FVE panely', mj: 'kWp', podil_pct: null, poradi: 3, mnozstvi_vzorec: 'fve_kwp', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_fve_04', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'AC/DC rozvadece', mj: 'kpl', podil_pct: null, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_fve_05', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'AC/DC kabelove trasy', mj: 'kpl', podil_pct: null, poradi: 5, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_fve_06', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'Konstrukce', mj: 'kpl', podil_pct: null, poradi: 6, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_fve_07', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'Instalace, montaz a doprava', mj: 'kpl', podil_pct: null, poradi: 7, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_fve_08', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'Administrativa (revize, UTP)', mj: 'kpl', podil_pct: null, poradi: 8, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_fve_09', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'Optimizery (Odpojovace)', mj: 'ks', podil_pct: null, poradi: 9, mnozstvi_vzorec: 'pocet_optimizeru', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '350 Kc/ks' },
  { rozpocetId: 'd_fve_10', technologie: 'fve', typ_rozpoctu: 'dilci', nazev_polozky: 'Inteligentni rizeni FVE', mj: 'kpl', podil_pct: null, poradi: 10, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: 'Volitelne – dle konfigurace' },

  // -- TEPELNE CERPADLO (6 polozek, procentni podily) --
  { rozpocetId: 'd_tc_01', technologie: 'tc', typ_rozpoctu: 'dilci', nazev_polozky: 'TC - technologie', mj: 'kpl', podil_pct: 41, poradi: 1, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_tc_02', technologie: 'tc', typ_rozpoctu: 'dilci', nazev_polozky: 'Instalace, montaz a doprava', mj: 'kpl', podil_pct: 28, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_tc_03', technologie: 'tc', typ_rozpoctu: 'dilci', nazev_polozky: 'Elektricke pripojeni', mj: 'kpl', podil_pct: 11, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_tc_04', technologie: 'tc', typ_rozpoctu: 'dilci', nazev_polozky: 'Trubky a dalsi material', mj: 'kpl', podil_pct: 9, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_tc_05', technologie: 'tc', typ_rozpoctu: 'dilci', nazev_polozky: 'Termostat a rizeni systemu', mj: 'kpl', podil_pct: 7, poradi: 5, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_tc_06', technologie: 'tc', typ_rozpoctu: 'dilci', nazev_polozky: 'Testovani a ladeni', mj: 'kpl', podil_pct: 4, poradi: 6, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },

  // -- KOGENERACE (6 polozek) --
  { rozpocetId: 'd_kgj_01', technologie: 'kogenerace', typ_rozpoctu: 'dilci', nazev_polozky: 'KGJ - technologie', mj: 'kpl', podil_pct: null, poradi: 1, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_kgj_02', technologie: 'kogenerace', typ_rozpoctu: 'dilci', nazev_polozky: 'Instalace, montaz a doprava', mj: 'kpl', podil_pct: null, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_kgj_03', technologie: 'kogenerace', typ_rozpoctu: 'dilci', nazev_polozky: 'Stavebni upravy a priprava mista', mj: 'kpl', podil_pct: null, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_kgj_04', technologie: 'kogenerace', typ_rozpoctu: 'dilci', nazev_polozky: 'Pripojeni k distribucni soustave', mj: 'kpl', podil_pct: null, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_kgj_05', technologie: 'kogenerace', typ_rozpoctu: 'dilci', nazev_polozky: 'Zaskoleni obsluhy', mj: 'kpl', podil_pct: null, poradi: 5, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_kgj_06', technologie: 'kogenerace', typ_rozpoctu: 'dilci', nazev_polozky: 'Revize a uvedeni do provozu', mj: 'kpl', podil_pct: null, poradi: 6, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },

  // -- PLYNOVY KOTEL (5 polozek) --
  { rozpocetId: 'd_plk_01', technologie: 'kotel', typ_rozpoctu: 'dilci', nazev_polozky: 'PLK - technologie', mj: 'kpl', podil_pct: null, poradi: 1, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_plk_02', technologie: 'kotel', typ_rozpoctu: 'dilci', nazev_polozky: 'Instalace, montaz a doprava', mj: 'kpl', podil_pct: null, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_plk_03', technologie: 'kotel', typ_rozpoctu: 'dilci', nazev_polozky: 'Stavebni upravy a priprava mista', mj: 'kpl', podil_pct: null, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_plk_04', technologie: 'kotel', typ_rozpoctu: 'dilci', nazev_polozky: 'Pripojeni k distribucni soustave', mj: 'kpl', podil_pct: null, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_plk_05', technologie: 'kotel', typ_rozpoctu: 'dilci', nazev_polozky: 'Revize a uvedeni do provozu', mj: 'kpl', podil_pct: null, poradi: 5, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },

  // -- EV NABIJECKY (3 polozky) --
  { rozpocetId: 'd_ev_01', technologie: 'ev', typ_rozpoctu: 'dilci', nazev_polozky: 'NE - technologie', mj: 'ks', podil_pct: null, poradi: 1, mnozstvi_vzorec: 'pocet_nabijecek', cena_ref_cenikId: '', cena_vzorec: '', poznamka: 'Wallbox 11kW=35000, 22kW=49000' },
  { rozpocetId: 'd_ev_02', technologie: 'ev', typ_rozpoctu: 'dilci', nazev_polozky: 'Instalace a montaz', mj: 'kpl', podil_pct: null, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_ev_03', technologie: 'ev', typ_rozpoctu: 'dilci', nazev_polozky: 'Montazni a jistici material', mj: 'kpl', podil_pct: null, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },

  // -- INTELIGENTNI RIZENI (4 polozky, procentni podily) --
  { rozpocetId: 'd_ir_01', technologie: 'inteligentni', typ_rozpoctu: 'dilci', nazev_polozky: 'IR - ridici system (hardware a software)', mj: 'kpl', podil_pct: 80, poradi: 1, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_ir_02', technologie: 'inteligentni', typ_rozpoctu: 'dilci', nazev_polozky: 'Instalace, montaz a doprava', mj: 'kpl', podil_pct: 12, poradi: 2, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_ir_03', technologie: 'inteligentni', typ_rozpoctu: 'dilci', nazev_polozky: 'Dokumentace a inzenyring', mj: 'kpl', podil_pct: 5, poradi: 3, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' },
  { rozpocetId: 'd_ir_04', technologie: 'inteligentni', typ_rozpoctu: 'dilci', nazev_polozky: 'Zaskoleni obsluhy, uvedeni do provozu', mj: 'kpl', podil_pct: 3, poradi: 4, mnozstvi_vzorec: '', cena_ref_cenikId: '', cena_vzorec: '', poznamka: '' }
];

// ── Default Ceniky (vychozi cenove polozky z modulu kalkulatoru) ──
const DEFAULT_CENIKY = [
  // ====== FVE ======
  { cenikId: 'cen_fve_01', technologie: 'fve', nazev_polozky: 'FVE instalace do 5 kWp', mj: 'kWp', cena_nakup: 28000, marze_pct: 25, cena_prodej: 35000, poznamka: 'Komplet vcetne panelu, stridacu, montaze', platnost_od: '2026-01-01' },
  { cenikId: 'cen_fve_02', technologie: 'fve', nazev_polozky: 'FVE instalace 5-10 kWp', mj: 'kWp', cena_nakup: 24800, marze_pct: 25, cena_prodej: 31000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_fve_03', technologie: 'fve', nazev_polozky: 'FVE instalace 10-20 kWp', mj: 'kWp', cena_nakup: 22400, marze_pct: 25, cena_prodej: 28000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_fve_04', technologie: 'fve', nazev_polozky: 'FVE instalace 20-50 kWp', mj: 'kWp', cena_nakup: 20000, marze_pct: 25, cena_prodej: 25000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_fve_05', technologie: 'fve', nazev_polozky: 'FVE instalace 50-100 kWp', mj: 'kWp', cena_nakup: 17600, marze_pct: 25, cena_prodej: 22000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_fve_06', technologie: 'fve', nazev_polozky: 'FVE instalace 100-500 kWp', mj: 'kWp', cena_nakup: 15200, marze_pct: 25, cena_prodej: 19000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_fve_07', technologie: 'fve', nazev_polozky: 'FVE instalace nad 500 kWp', mj: 'kWp', cena_nakup: 13600, marze_pct: 25, cena_prodej: 17000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_fve_08', technologie: 'fve', nazev_polozky: 'Optimizer / Odpojovac', mj: 'ks', cena_nakup: 280, marze_pct: 25, cena_prodej: 350, poznamka: '', platnost_od: '2026-01-01' },

  // ====== BATERIE ======
  { cenikId: 'cen_bat_01', technologie: 'baterie', nazev_polozky: 'LiFePO4 (LFP) baterie', mj: 'kWh', cena_nakup: 9000, marze_pct: 22, cena_prodej: 11000, poznamka: '6000 cyklu, 15 let zivotnost, 95% ucinnost', platnost_od: '2026-01-01' },
  { cenikId: 'cen_bat_02', technologie: 'baterie', nazev_polozky: 'NMC (Li-ion) baterie', mj: 'kWh', cena_nakup: 8000, marze_pct: 22, cena_prodej: 9760, poznamka: '3000 cyklu, 12 let, 93% ucinnost', platnost_od: '2026-01-01' },
  { cenikId: 'cen_bat_03', technologie: 'baterie', nazev_polozky: 'Sodikova (Na-ion) baterie', mj: 'kWh', cena_nakup: 6000, marze_pct: 22, cena_prodej: 7320, poznamka: '4000 cyklu, 12 let, 90% ucinnost', platnost_od: '2026-01-01' },

  // ====== TEPELNE CERPADLO ======
  { cenikId: 'cen_tc_01', technologie: 'tc', nazev_polozky: 'TC vzduch/voda', mj: 'kW', cena_nakup: 19000, marze_pct: 25, cena_prodej: 23750, poznamka: 'COP 3.2, zivotnost 20 let', platnost_od: '2026-01-01' },
  { cenikId: 'cen_tc_02', technologie: 'tc', nazev_polozky: 'TC zeme/voda (vrty)', mj: 'kW', cena_nakup: 28000, marze_pct: 25, cena_prodej: 35000, poznamka: 'COP 4.0, zivotnost 25 let', platnost_od: '2026-01-01' },
  { cenikId: 'cen_tc_03', technologie: 'tc', nazev_polozky: 'TC voda/voda', mj: 'kW', cena_nakup: 24000, marze_pct: 25, cena_prodej: 30000, poznamka: 'COP 4.5, zivotnost 25 let', platnost_od: '2026-01-01' },

  // ====== EV NABIJECKY ======
  { cenikId: 'cen_ev_01', technologie: 'ev', nazev_polozky: 'AC wallbox 3.7 kW (1f)', mj: 'ks', cena_nakup: 16000, marze_pct: 25, cena_prodej: 20000, poznamka: 'Instalace +8 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ev_02', technologie: 'ev', nazev_polozky: 'AC wallbox 7.4 kW (1f)', mj: 'ks', cena_nakup: 22000, marze_pct: 25, cena_prodej: 27500, poznamka: 'Instalace +12 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ev_03', technologie: 'ev', nazev_polozky: 'AC wallbox 11 kW (3f)', mj: 'ks', cena_nakup: 32000, marze_pct: 25, cena_prodej: 40000, poznamka: 'Instalace +18 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ev_04', technologie: 'ev', nazev_polozky: 'AC wallbox 22 kW (3f)', mj: 'ks', cena_nakup: 48000, marze_pct: 25, cena_prodej: 60000, poznamka: 'Instalace +25 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ev_05', technologie: 'ev', nazev_polozky: 'DC rychlonabijecka 50 kW', mj: 'ks', cena_nakup: 560000, marze_pct: 20, cena_prodej: 672000, poznamka: 'Instalace +150 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ev_06', technologie: 'ev', nazev_polozky: 'DC ultrafast 150 kW', mj: 'ks', cena_nakup: 1500000, marze_pct: 20, cena_prodej: 1800000, poznamka: 'Instalace +300 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ev_07', technologie: 'ev', nazev_polozky: 'Instalace AC nabijecky', mj: 'kpl', cena_nakup: 12000, marze_pct: 25, cena_prodej: 15000, poznamka: 'Prumer 11-22 kW', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ev_08', technologie: 'ev', nazev_polozky: 'Instalace DC nabijecky', mj: 'kpl', cena_nakup: 180000, marze_pct: 20, cena_prodej: 216000, poznamka: 'Prumer 50-150 kW', platnost_od: '2026-01-01' },

  // ====== PLYNOVY KOTEL ======
  { cenikId: 'cen_plk_01', technologie: 'kotel', nazev_polozky: 'Kondenzacni kotel 10-20 kW', mj: 'ks', cena_nakup: 40000, marze_pct: 25, cena_prodej: 50000, poznamka: 'Ucinnost 98%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_plk_02', technologie: 'kotel', nazev_polozky: 'Kondenzacni kotel 20-30 kW', mj: 'ks', cena_nakup: 52000, marze_pct: 25, cena_prodej: 65000, poznamka: 'Ucinnost 97%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_plk_03', technologie: 'kotel', nazev_polozky: 'Kondenzacni kotel 30-50 kW', mj: 'ks', cena_nakup: 82000, marze_pct: 25, cena_prodej: 102500, poznamka: 'Ucinnost 96%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_plk_04', technologie: 'kotel', nazev_polozky: 'Kaskada 50-100 kW', mj: 'ks', cena_nakup: 172000, marze_pct: 25, cena_prodej: 215000, poznamka: 'Ucinnost 95%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_plk_05', technologie: 'kotel', nazev_polozky: 'Prumyslovy kotel 100-300 kW', mj: 'ks', cena_nakup: 420000, marze_pct: 20, cena_prodej: 504000, poznamka: 'Ucinnost 94%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_plk_06', technologie: 'kotel', nazev_polozky: 'Prumyslovy kotel 300+ kW', mj: 'ks', cena_nakup: 1000000, marze_pct: 20, cena_prodej: 1200000, poznamka: 'Ucinnost 93%', platnost_od: '2026-01-01' },

  // ====== KOGENERACE ======
  { cenikId: 'cen_kgj_01', technologie: 'kogenerace', nazev_polozky: 'KGJ 15 kWe / 38.3 kWt', mj: 'ks', cena_nakup: 620000, marze_pct: 20, cena_prodej: 744000, poznamka: 'El. ucinnost 28%, tepelna 58%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_kgj_02', technologie: 'kogenerace', nazev_polozky: 'KGJ 20 kWe / 46.5 kWt', mj: 'ks', cena_nakup: 760000, marze_pct: 20, cena_prodej: 912000, poznamka: 'El. ucinnost 30%, tepelna 56%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_kgj_03', technologie: 'kogenerace', nazev_polozky: 'KGJ 50 kWe / 83 kWt', mj: 'ks', cena_nakup: 1480000, marze_pct: 20, cena_prodej: 1776000, poznamka: 'El. ucinnost 33%, tepelna 54%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_kgj_04', technologie: 'kogenerace', nazev_polozky: 'KGJ 70 kWe / 117 kWt', mj: 'ks', cena_nakup: 2000000, marze_pct: 20, cena_prodej: 2400000, poznamka: 'El. ucinnost 33%, tepelna 55%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_kgj_05', technologie: 'kogenerace', nazev_polozky: 'KGJ 100 kWe / 173 kWt', mj: 'ks', cena_nakup: 3080000, marze_pct: 20, cena_prodej: 3696000, poznamka: 'El. ucinnost 34%, tepelna 59%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_kgj_06', technologie: 'kogenerace', nazev_polozky: 'KGJ servisni naklady', mj: 'hod', cena_nakup: 1.20, marze_pct: 25, cena_prodej: 1.50, poznamka: 'Kc/provozni hodinu', platnost_od: '2026-01-01' },

  // ====== INTELIGENTNI RIZENI ======
  { cenikId: 'cen_ir_01', technologie: 'inteligentni', nazev_polozky: 'IR Zakladni (termostat + casovac)', mj: 'kpl', cena_nakup: 12000, marze_pct: 25, cena_prodej: 15000, poznamka: 'Uspora ~8%, instalace +8 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ir_02', technologie: 'inteligentni', nazev_polozky: 'IR Pokrocily (EMS)', mj: 'kpl', cena_nakup: 45600, marze_pct: 25, cena_prodej: 57000, poznamka: 'HW 45k + SW 12k, uspora ~15%, instalace +25 000 Kc', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ir_03', technologie: 'inteligentni', nazev_polozky: 'IR Kompletni (HEMS + smart grid)', mj: 'kpl', cena_nakup: 88000, marze_pct: 25, cena_prodej: 110000, poznamka: 'HW 85k + SW 25k, uspora ~22%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ir_04', technologie: 'inteligentni', nazev_polozky: 'IR Prumyslovy (SCADA/EMS)', mj: 'kpl', cena_nakup: 264000, marze_pct: 25, cena_prodej: 330000, poznamka: 'HW 250k + SW 80k, uspora ~18%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ir_05', technologie: 'inteligentni', nazev_polozky: 'Dispecerske rizeni - zakladni', mj: 'rok', cena_nakup: 9600, marze_pct: 25, cena_prodej: 12000, poznamka: 'Povinne pro FVE >100 kWp', platnost_od: '2026-01-01' },
  { cenikId: 'cen_ir_06', technologie: 'inteligentni', nazev_polozky: 'Dispecerske rizeni - plne', mj: 'rok', cena_nakup: 28800, marze_pct: 25, cena_prodej: 36000, poznamka: '', platnost_od: '2026-01-01' },

  // ====== VODA ======
  { cenikId: 'cen_voda_01', technologie: 'voda', nazev_polozky: 'Sprchovy vymenik tepla (DWHR)', mj: 'ks', cena_nakup: 20000, marze_pct: 25, cena_prodej: 25000, poznamka: 'Ucinnost 30%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_02', technologie: 'voda', nazev_polozky: 'Centralni vymenik tepla', mj: 'ks', cena_nakup: 68000, marze_pct: 25, cena_prodej: 85000, poznamka: 'Ucinnost 45%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_03', technologie: 'voda', nazev_polozky: 'TC na odpadni vode', mj: 'ks', cena_nakup: 200000, marze_pct: 25, cena_prodej: 250000, poznamka: 'Ucinnost 60%', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_04', technologie: 'voda', nazev_polozky: 'Destova voda - zachyt', mj: 'kpl', cena_nakup: 36000, marze_pct: 25, cena_prodej: 45000, poznamka: 'Uspora 15% spotreby', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_05', technologie: 'voda', nazev_polozky: 'Recyklace sede vody', mj: 'kpl', cena_nakup: 144000, marze_pct: 25, cena_prodej: 180000, poznamka: 'Uspora 25% spotreby', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_06', technologie: 'voda', nazev_polozky: 'Kompletni recyklace (COV)', mj: 'kpl', cena_nakup: 280000, marze_pct: 25, cena_prodej: 350000, poznamka: 'Uspora 40% spotreby', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_07', technologie: 'voda', nazev_polozky: 'Usporne sprchove hlavice', mj: 'ks', cena_nakup: 960, marze_pct: 25, cena_prodej: 1200, poznamka: 'Uspora 30% vody', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_08', technologie: 'voda', nazev_polozky: 'Perlator na baterie', mj: 'ks', cena_nakup: 280, marze_pct: 25, cena_prodej: 350, poznamka: 'Uspora 20% vody', platnost_od: '2026-01-01' },
  { cenikId: 'cen_voda_09', technologie: 'voda', nazev_polozky: 'Dvoutlackovy WC splachovac', mj: 'ks', cena_nakup: 2000, marze_pct: 25, cena_prodej: 2500, poznamka: 'Uspora 25%', platnost_od: '2026-01-01' },

  // ====== DISTRIBUCE / OPTIMALIZACE ======
  { cenikId: 'cen_dist_01', technologie: 'distribuce', nazev_polozky: 'Optimalizace sazby (analyza)', mj: 'kpl', cena_nakup: 4000, marze_pct: 25, cena_prodej: 5000, poznamka: 'Na jedno odberne misto', platnost_od: '2026-01-01' },
  { cenikId: 'cen_dist_02', technologie: 'distribuce', nazev_polozky: 'Slouceni odbernych mist', mj: 'kpl', cena_nakup: 12000, marze_pct: 25, cena_prodej: 15000, poznamka: 'Dle slozitosti + admin naklady', platnost_od: '2026-01-01' },

  // ====== PROJEKTOVA DOKUMENTACE ======
  { cenikId: 'cen_pd_01', technologie: 'dokumentace', nazev_polozky: 'Projektova dokumentace FVE', mj: 'kpl', cena_nakup: 20000, marze_pct: 25, cena_prodej: 25000, poznamka: 'Dle velikosti systemu', platnost_od: '2026-01-01' },
  { cenikId: 'cen_pd_02', technologie: 'dokumentace', nazev_polozky: 'Energeticky audit', mj: 'kpl', cena_nakup: 40000, marze_pct: 25, cena_prodej: 50000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_pd_03', technologie: 'dokumentace', nazev_polozky: 'Inzenyring a konzultace', mj: 'kpl', cena_nakup: 24000, marze_pct: 25, cena_prodej: 30000, poznamka: '', platnost_od: '2026-01-01' },
  { cenikId: 'cen_pd_04', technologie: 'dokumentace', nazev_polozky: 'Administrativa dotace', mj: 'kpl', cena_nakup: 16000, marze_pct: 25, cena_prodej: 20000, poznamka: 'Priprava a podani zadosti', platnost_od: '2026-01-01' }
];

// ── Nazvy zalozek pro prava ──
const ADMIN_TABS = [
  { key: 'ceniky',    label: 'Ceníky' },
  { key: 'rozpocty',  label: 'Rozpočty' },
  { key: 'pd',        label: 'Projektová dokumentace' },
  { key: 'naklady',   label: 'Náklady' },
  { key: 'provize',   label: 'Provize a Body' },
  { key: 'dodavatele', label: 'Dodavatelé' },
  { key: 'poradci',   label: 'Poradci' },
  { key: 'svr_zb',    label: 'SVR & Zelený bonus' },
  { key: 'nastaveni', label: 'Nastavení' }
];

// Role per zalozka: 'admin' | 'editor' | 'viewer' | 'ne'
function defaultPrava(role) {
  const p = {};
  ADMIN_TABS.forEach(t => { p[t.key] = role === 'admin' ? 'admin' : 'ne'; });
  return p;
}

// ── Vychozi uzivatele ──
const DEFAULT_ADMIN_USERS = [
  {
    jmeno: 'Administrator', email: 'opsp.energy@gmail.com', heslo: 'oees_admin_2026', aktivni: 'ano',
    prava: { ceniky: 'admin', rozpocty: 'admin', pd: 'admin', naklady: 'admin', provize: 'admin', dodavatele: 'admin', poradci: 'admin', nastaveni: 'admin' }
  }
];

const ADMIN_SESSION_KEY = 'oees_admin_session';

// ── Auth ──
function adminLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const heslo = document.getElementById('login-heslo').value;
  const zapamatovat = document.getElementById('login-zapamatovat').checked;
  const errEl = document.getElementById('login-error');

  if (!email) { errEl.textContent = 'Zadejte email.'; return; }
  if (!heslo) { errEl.textContent = 'Zadejte heslo.'; return; }

  errEl.textContent = 'Ověřuji...';

  // Nejdriv zkusime API
  adminApiPost('admin_auth', { email, heslo })
    .then(res => {
      if (res.success && res.user) {
        prihlasUzivatele(res.user, zapamatovat);
      } else {
        // Fallback na lokalni uzivatele
        lokalniPrihlaseni(email, heslo, zapamatovat, errEl);
      }
    })
    .catch(() => {
      lokalniPrihlaseni(email, heslo, zapamatovat, errEl);
    });
}

function lokalniPrihlaseni(email, heslo, zapamatovat, errEl) {
  // Hledej v ulozenych uzivatelich nebo vychozich
  const uzivatele = ADMIN_STATE.adminUsers && ADMIN_STATE.adminUsers.length
    ? ADMIN_STATE.adminUsers
    : DEFAULT_ADMIN_USERS;

  const user = uzivatele.find(u =>
    u.email.toLowerCase() === email && u.heslo === heslo && u.aktivni === 'ano'
  );

  if (user) {
    prihlasUzivatele(user, zapamatovat);
  } else {
    errEl.textContent = 'Nesprávný email nebo heslo.';
  }
}

function prihlasUzivatele(user, zapamatovat) {
  ADMIN_STATE.authenticated = true;
  ADMIN_STATE.currentUser = user;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  document.getElementById('login-error').textContent = '';

  // Zobraz jmeno v headeru
  const statusEl = document.getElementById('admin-status');
  if (statusEl) statusEl.textContent = user.jmeno || user.email;

  // Zapamatovani prihlaseni
  if (zapamatovat) {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
      email: user.email, heslo: user.heslo, jmeno: user.jmeno, prava: user.prava
    }));
  }

  nacistVsechnaData();

  // Aplikuj prava na zalozky
  aplikujPrava(user);
}

function aplikujPrava(user) {
  const prava = user.prava || defaultPrava('admin');

  ADMIN_TABS.forEach(tab => {
    const pravo = prava[tab.key] || 'ne';
    const tabBtn = document.querySelector(`.tab[data-tab="${tab.key}"]`);
    const tabPanel = document.getElementById(`tab-${tab.key}`);

    if (pravo === 'ne') {
      // Skryj zalozku uplne
      if (tabBtn) tabBtn.style.display = 'none';
      if (tabPanel) tabPanel.style.display = 'none';
    } else {
      // Zobraz zalozku
      if (tabBtn) tabBtn.style.display = '';
      if (tabPanel) tabPanel.style.removeProperty('display');

      if (pravo === 'viewer') {
        // Jen cteni – skryj tlacitka pro pridani a ukladani, zamkni inputy
        if (tabPanel) {
          tabPanel.querySelectorAll('.btn-primary, .btn-delete, .panel-actions .btn').forEach(btn => {
            btn.style.display = 'none';
          });
          tabPanel.querySelectorAll('input, select, textarea').forEach(el => {
            el.disabled = true;
          });
        }
      }
    }
  });

  // Prvni viditelna zalozka = aktivni
  const prvniViditelna = ADMIN_TABS.find(t => (prava[t.key] || 'ne') !== 'ne');
  if (prvniViditelna) switchTab(prvniViditelna.key);
}

function adminLogout() {
  ADMIN_STATE.authenticated = false;
  ADMIN_STATE.currentUser = null;
  localStorage.removeItem(ADMIN_SESSION_KEY);
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-screen').style.display = '';
  document.getElementById('login-email').value = '';
  document.getElementById('login-heslo').value = '';
  document.getElementById('login-error').textContent = '';
}

// ── Automaticke prihlaseni ze zapamatovane session ──
function zkusAutoLogin() {
  const json = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!json) return;
  try {
    const session = JSON.parse(json);
    if (session.email && session.heslo) {
      // Predvyplnime a prihlasime
      document.getElementById('login-email').value = session.email;
      document.getElementById('login-heslo').value = session.heslo;
      prihlasUzivatele(session, true);
    }
  } catch (e) { /* ignoruj */ }
}

// Spustit auto-login pri nacteni stranky
document.addEventListener('DOMContentLoaded', zkusAutoLogin);

// ── Sprava uzivatelu v Nastaveni ──
function renderNastaveniUzivatele() {
  const tbody = document.getElementById('nastaveni-uzivatele-tbody');
  if (!tbody) return;

  const users = ADMIN_STATE.adminUsers && ADMIN_STATE.adminUsers.length
    ? ADMIN_STATE.adminUsers
    : DEFAULT_ADMIN_USERS;

  // Uloz do stavu pokud jeste neni
  if (!ADMIN_STATE.adminUsers || !ADMIN_STATE.adminUsers.length) {
    ADMIN_STATE.adminUsers = JSON.parse(JSON.stringify(users));
  }

  tbody.innerHTML = ADMIN_STATE.adminUsers.map((u, i) => {
    const prava = u.prava || defaultPrava('ne');
    let pravaHtml = '';
    ADMIN_TABS.forEach(t => {
      const val = prava[t.key] || 'ne';
      pravaHtml += `<td>
        <select name="pravo_${t.key}" style="font-size:0.75rem;padding:3px 4px;width:85px">
          <option value="admin"${val === 'admin' ? ' selected' : ''}>Admin</option>
          <option value="editor"${val === 'editor' ? ' selected' : ''}>Editor</option>
          <option value="viewer"${val === 'viewer' ? ' selected' : ''}>Prohlížeč</option>
          <option value="ne"${val === 'ne' ? ' selected' : ''}>Ne</option>
        </select>
      </td>`;
    });

    return `<tr data-index="${i}">
      <td><input type="text" name="jmeno" value="${esc(u.jmeno)}" style="min-width:100px"></td>
      <td><input type="email" name="email" value="${esc(u.email)}" style="min-width:150px"></td>
      <td><input type="text" name="heslo" value="${esc(u.heslo)}" style="min-width:100px"></td>
      <td>
        <select name="aktivni" style="font-size:0.75rem;padding:3px 4px">
          <option value="ano"${u.aktivni !== 'ne' ? ' selected' : ''}>Ano</option>
          <option value="ne"${u.aktivni === 'ne' ? ' selected' : ''}>Ne</option>
        </select>
      </td>
      ${pravaHtml}
      <td class="actions"><button class="btn-delete" onclick="nastaveniSmazatUzivatele(${i})" title="Smazat">&#10005;</button></td>
    </tr>`;
  }).join('');

  // Aktualni uzivatel info
  const infoEl = document.getElementById('nastaveni-aktualni-uzivatel');
  if (infoEl && ADMIN_STATE.currentUser) {
    infoEl.textContent = ADMIN_STATE.currentUser.jmeno + ' (' + ADMIN_STATE.currentUser.email + ') – role: ' + (ADMIN_STATE.currentUser.role || 'admin');
  }
}

function nastaveniPridatUzivatele() {
  if (!ADMIN_STATE.adminUsers) ADMIN_STATE.adminUsers = [];
  ADMIN_STATE.adminUsers.push({
    jmeno: '', email: '', heslo: '', aktivni: 'ano',
    prava: defaultPrava('ne')
  });
  renderNastaveniUzivatele();
}

function nastaveniSmazatUzivatele(index) {
  // Nesmaze sebe sama
  if (ADMIN_STATE.currentUser &&
      ADMIN_STATE.adminUsers[index].email === ADMIN_STATE.currentUser.email) {
    alert('Nemůžete smazat svého vlastního uživatele.');
    return;
  }
  ADMIN_STATE.adminUsers.splice(index, 1);
  renderNastaveniUzivatele();
}

function nastaveniCollectData() {
  const rows = document.querySelectorAll('#nastaveni-uzivatele-tbody tr');
  rows.forEach((tr, i) => {
    const u = ADMIN_STATE.adminUsers[i];
    if (!u) return;
    u.jmeno   = tr.querySelector('[name="jmeno"]').value;
    u.email   = tr.querySelector('[name="email"]').value.trim().toLowerCase();
    u.heslo   = tr.querySelector('[name="heslo"]').value;
    u.aktivni = tr.querySelector('[name="aktivni"]').value;
    u.prava   = u.prava || {};
    ADMIN_TABS.forEach(t => {
      const sel = tr.querySelector(`[name="pravo_${t.key}"]`);
      if (sel) u.prava[t.key] = sel.value;
    });
  });
}

async function nastaveniUlozit() {
  nastaveniCollectData();
  const ok = await adminSave('AdminUsers', ADMIN_STATE.adminUsers);
  showStatus('nastaveni-status', ok);
}

// ── Tab Switching ──
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  // Lazy init pro SVR & ZB
  if (tabName === 'svr_zb' && typeof renderSvrZbAdmin === 'function') {
    renderSvrZbAdmin('svr-zb-admin-container');
  }
}

// ── API ──
async function adminApiGet(action, params = {}) {
  const url = new URL(ADMIN_CONFIG.apiUrl);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url.toString(), { redirect: 'follow' });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function adminApiPost(action, data = {}) {
  const payload = { action, ...data };
  // Pokus 1: normalni POST s CORS
  try {
    const response = await fetch(ADMIN_CONFIG.apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const text = await response.text();
      try { return JSON.parse(text); } catch (_) { /* GAS vratil HTML, ne JSON */ }
    }
  } catch (_) { /* CORS / sit chyba */ }
  // Pokus 2: no-cors fallback (data se odeslou, odpoved neprectem)
  try {
    await fetch(ADMIN_CONFIG.apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });
  } catch (_) { /* ignorujeme */ }
  return { success: true, fallback: true };
}

// ── Data Loading ──
async function nacistVsechnaData() {
  try {
    const res = await adminApiGet('admin_load_all');
    if (res && res.success) {
      if (res.ceniky)          ADMIN_STATE.ceniky = res.ceniky;
      if (res.rozpocty)        ADMIN_STATE.rozpocty = res.rozpocty;
      if (res.pd)              ADMIN_STATE.pd = res.pd;
      if (res.naklady)         ADMIN_STATE.naklady = res.naklady;
      if (res.provizniTabulka) ADMIN_STATE.provizniTabulka = res.provizniTabulka;
      if (res.provizniEtapy)   ADMIN_STATE.provizniEtapy = res.provizniEtapy;
      if (res.poradci)         ADMIN_STATE.poradci = res.poradci;
      if (res.dodavatele)      ADMIN_STATE.dodavatele = res.dodavatele;
      if (res.adminUsers)      ADMIN_STATE.adminUsers = res.adminUsers;
      if (res.technologie)     ADMIN_STATE.technologie = res.technologie;
      if (res.settings)        ADMIN_STATE.settings = res.settings;
    }
  } catch (e) {
    console.log('Admin DB not connected yet, using defaults.');
  }

  // Pokud data nejsou nactena, pouzijeme vychozi
  if (!ADMIN_STATE.provizniTabulka.length) {
    ADMIN_STATE.provizniTabulka = JSON.parse(JSON.stringify(DEFAULT_SCALING_TABLE));
  }
  if (!ADMIN_STATE.provizniEtapy.length) {
    ADMIN_STATE.provizniEtapy = JSON.parse(JSON.stringify(DEFAULT_ETAPY));
  }
  if (!ADMIN_STATE.rozpocty.length) {
    ADMIN_STATE.rozpocty = JSON.parse(JSON.stringify(DEFAULT_ROZPOCTY));
  }
  if (!ADMIN_STATE.ceniky.length) {
    ADMIN_STATE.ceniky = JSON.parse(JSON.stringify(DEFAULT_CENIKY));
  }

  // Nacteni admin uzivatelu
  if (!ADMIN_STATE.adminUsers || !ADMIN_STATE.adminUsers.length) {
    ADMIN_STATE.adminUsers = JSON.parse(JSON.stringify(DEFAULT_ADMIN_USERS));
  }

  // Nacteni dodavatelu
  if (!ADMIN_STATE.dodavatele) ADMIN_STATE.dodavatele = [];

  // Nacteni technologii
  if (!ADMIN_STATE.technologie || !ADMIN_STATE.technologie.length) {
    ADMIN_STATE.technologie = JSON.parse(JSON.stringify(DEFAULT_TECHNOLOGIE));
  }

  // Aktualizuj HTML filtry technologii
  aktualizujTechFiltre();

  // Renderuj vsechny tabulky
  renderDodavatele();
  aktualizujDodavateleDatalist();
  renderCeniky();
  renderRozpocty();
  renderPD();
  renderNaklady();
  renderProvize();
  renderPoradci();
  renderNastaveniUzivatele();
  renderNastaveniTechnologie();
}

// ── Save helpers ──
async function adminSave(sheet, data) {
  try {
    const res = await adminApiPost('admin_save', { sheet, data });
    return res && res.success;
  } catch (e) {
    console.log('Save failed (offline mode):', sheet);
    return false;
  }
}

function showStatus(elId, success, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg || (success ? 'Uloženo!' : 'Chyba při ukládání.');
  el.className = 'save-status' + (success ? '' : ' error');
  setTimeout(() => { el.textContent = ''; }, 3000);
}

// ── Helpers ──
function formatKc(val) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('cs-CZ') + ' Kč';
}

function techSelectHtml(selected, name) {
  const list = getTechnologieList();
  let html = `<select name="${name}">`;
  list.forEach(t => {
    html += `<option value="${t.value}"${t.value === selected ? ' selected' : ''}>${t.label}</option>`;
  });
  html += '</select>';
  return html;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ══════════════════════════════════════════════════════════════
// Číselník technologií – dynamická správa
// ══════════════════════════════════════════════════════════════

function aktualizujTechFiltre() {
  const list = getTechnologieList();
  const selectors = [
    'ceniky-tech-filter', 'rozpocty-tech-filter',
    'pd-tech-filter', 'naklady-tech-filter'
  ];
  selectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Všechny technologie</option>' +
      list.map(t => `<option value="${t.value}"${t.value === current ? ' selected' : ''}>${t.label}</option>`).join('');
  });
}

function renderNastaveniTechnologie() {
  const tbody = document.getElementById('nastaveni-tech-tbody');
  if (!tbody) return;
  const list = getTechnologieList();
  tbody.innerHTML = list.map((t, i) => `
    <tr data-index="${i}"${t._novy ? ' class="radek-ceka"' : ''}>
      <td style="width:40px;text-align:center">${i + 1}</td>
      <td><input type="text" name="tech_value" value="${esc(t.value)}" style="width:120px" placeholder="napr. fve"></td>
      <td><input type="text" name="tech_label" value="${esc(t.label)}" class="input-wide" placeholder="Název technologie"></td>
      <td><input type="text" name="tech_vzorec" value="${esc(t.cenovy_vzorec || '')}" style="width:150px" placeholder="{{NazevCena}}"></td>
      <td><input type="text" name="tech_rozpocet" value="${esc(t.nazev_rozpocet || '')}" class="input-wide" placeholder="Název v celkovém rozpočtu"></td>
      <td class="actions"><div class="radek-akce">
        <button class="btn-row-del" onclick="technologieSmazat(${i})" title="Smazat řádek">&#10005;</button>
      </div></td>
    </tr>
  `).join('');
}

function technologiePridat() {
  const list = getTechnologieList();
  ADMIN_STATE.technologie = [...list];
  ADMIN_STATE.technologie.unshift({
    value: '', label: '', cenovy_vzorec: '', nazev_rozpocet: '', _novy: true
  });
  renderNastaveniTechnologie();
}

function technologieSmazat(index) {
  const list = getTechnologieList();
  ADMIN_STATE.technologie = [...list];
  ADMIN_STATE.technologie.splice(index, 1);
  renderNastaveniTechnologie();
}

function technologieCollectData() {
  const rows = document.querySelectorAll('#nastaveni-tech-tbody tr');
  const result = [];
  rows.forEach(tr => {
    const value = tr.querySelector('[name="tech_value"]')?.value.trim();
    const label = tr.querySelector('[name="tech_label"]')?.value.trim();
    if (!value || !label) return;
    result.push({
      value,
      label,
      cenovy_vzorec: tr.querySelector('[name="tech_vzorec"]')?.value.trim() || '',
      nazev_rozpocet: tr.querySelector('[name="tech_rozpocet"]')?.value.trim() || label
    });
  });
  ADMIN_STATE.technologie = result;
}

async function technologieUlozit() {
  technologieCollectData();
  ADMIN_STATE.technologie.forEach(t => delete t._novy);

  // Automaticky vytvor chybejici radky v celkovem rozpoctu
  synchronizujRozpocetSTechnologiemi();

  // Aktualizuj filtry a selecty
  aktualizujTechFiltre();

  const ok = await adminSave('Technologie', ADMIN_STATE.technologie);
  showStatus('nastaveni-tech-status', ok);
  renderNastaveniTechnologie();

  // Prerendruj rozpocty aby se ukazaly nove technologie
  if (typeof renderRozpocty === 'function') renderRozpocty();
}

function synchronizujRozpocetSTechnologiemi() {
  const list = getTechnologieList();
  const existujici = ADMIN_STATE.rozpocty
    .filter(r => r.typ_rozpoctu === 'celkovy')
    .map(r => r.technologie);

  const maxPoradi = ADMIN_STATE.rozpocty
    .filter(r => r.typ_rozpoctu === 'celkovy')
    .reduce((m, r) => Math.max(m, r.poradi || 0), 0);

  let poradi = maxPoradi;
  list.forEach(tech => {
    if (!existujici.includes(tech.value)) {
      poradi++;
      ADMIN_STATE.rozpocty.push({
        rozpocetId: generateId(),
        technologie: tech.value,
        typ_rozpoctu: 'celkovy',
        nazev_polozky: tech.nazev_rozpocet || tech.label,
        mj: 'kpl',
        podil_pct: null,
        poradi: poradi,
        mnozstvi_vzorec: '',
        cena_ref_cenikId: '',
        cena_vzorec: tech.cenovy_vzorec || '',
        poznamka: 'Automaticky přidáno z číselníku technologií'
      });
    }
  });
}
