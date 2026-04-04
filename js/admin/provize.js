/* ================================================================
   OEES Admin – Provizni system & Bodove hodnoty
   Implementace dle V15 Excel (sheet Marze)
   ================================================================ */

function renderProvize() {
  renderScalingTable();
  renderEtapy();
  loadProvizeSettings();
}

// ── Skalovaci tabulka ──
function renderScalingTable() {
  const tbody = document.getElementById('provize-scaling-tbody');
  tbody.innerHTML = ADMIN_STATE.provizniTabulka.map(r => `
    <tr data-id="${r.pasmoId}">
      <td>${formatPasmo(r)}</td>
      <td class="num"><input type="number" name="dolni_kc" value="${r.dolni_kc}" step="100000"></td>
      <td class="num"><input type="number" name="horni_kc" value="${r.horni_kc}" step="100000"></td>
      <td class="num"><input type="number" name="dolni_marze" value="${r.dolni_marze}" step="0.1" style="width:80px"></td>
      <td class="num"><input type="number" name="horni_marze" value="${r.horni_marze}" step="0.1" style="width:80px"></td>
    </tr>
  `).join('');
}

function formatPasmo(r) {
  if (r.dolni_kc === 0) return '0 – 1 mil Kc';
  if (r.horni_kc > 50000000) return 'nad ' + (r.dolni_kc / 1000000) + ' mil Kc';
  return (r.dolni_kc / 1000000) + ' – ' + (r.horni_kc / 1000000) + ' mil Kc';
}

// ── Etapy ──
function renderEtapy() {
  const tbody = document.getElementById('provize-etapy-tbody');
  tbody.innerHTML = ADMIN_STATE.provizniEtapy.map(r => `
    <tr data-id="${r.etapaId}">
      <td class="num"><input type="number" name="podil_pct" value="${r.podil_pct}" step="1" style="width:60px"></td>
      <td><input type="text" name="cinnost" value="${esc(r.cinnost)}" class="input-wide"></td>
      <td class="num"><input type="number" name="za_obchod_pct" value="${r.za_obchod_pct}" step="1" style="width:60px"></td>
      <td class="num"><input type="number" name="za_odbornost_pct" value="${r.za_odbornost_pct}" step="1" style="width:60px"></td>
    </tr>
  `).join('');
}

function loadProvizeSettings() {
  const s = ADMIN_STATE.settings;
  if (s.es_podil) document.getElementById('provize-es-podil').value = s.es_podil;
  if (s.oe_podil) document.getElementById('provize-oe-podil').value = s.oe_podil;
  if (s.bod_delic) document.getElementById('provize-bod-delic').value = s.bod_delic;
  if (s.voda_marze_pct) document.getElementById('provize-voda-marze').value = s.voda_marze_pct;
}

// ── Provizni vypocet (V15 algoritmus) ──
// Fixni slozka: 1 mil * 20% = 200 000 Kc (vzdy)
// Variabilni: (cena - 1mil) * interpolovana marze dle pasma
function vypocetMarze(celkovaCena, tabulka) {
  if (!tabulka) tabulka = ADMIN_STATE.provizniTabulka;

  const FIXNI_HRANICE = 1000000;
  const FIXNI_PCT = 20;

  // Cena do 1 mil = cela cena * 20%
  if (celkovaCena <= FIXNI_HRANICE) {
    const marze = celkovaCena * (FIXNI_PCT / 100);
    return { fixni: marze, variabilni: 0, celkem: marze, procento: FIXNI_PCT };
  }

  // Fixni cast
  const fixniMarze = FIXNI_HRANICE * (FIXNI_PCT / 100); // 200 000

  // Najdi pasmo pro variabilni cast
  const variabilniCena = celkovaCena - FIXNI_HRANICE;
  let variabilniMarze = 0;
  let realneProcento = 0;

  for (const pasmo of tabulka) {
    if (celkovaCena > pasmo.dolni_kc && pasmo.dolni_kc >= FIXNI_HRANICE) {
      // Interpolace uvnitr pasma
      const pasmoSirka = pasmo.horni_kc - pasmo.dolni_kc;
      const poziceVPasmu = Math.min(celkovaCena, pasmo.horni_kc) - pasmo.dolni_kc;
      const delta = pasmoSirka > 0 ? poziceVPasmu / pasmoSirka : 0;
      realneProcento = pasmo.dolni_marze + (pasmo.horni_marze - pasmo.dolni_marze) * delta;

      if (celkovaCena <= pasmo.horni_kc) {
        // Cena konci v tomto pasmu
        variabilniMarze = variabilniCena * (realneProcento / 100);
        break;
      }
    }
  }

  // Pokud cena presahuje vsechna pasma, pouzij posledni
  if (variabilniMarze === 0 && variabilniCena > 0) {
    const posledni = tabulka[tabulka.length - 1];
    realneProcento = posledni.horni_marze;
    variabilniMarze = variabilniCena * (realneProcento / 100);
  }

  const celkem = fixniMarze + variabilniMarze;
  const celkoveProcento = celkovaCena > 0 ? (celkem / celkovaCena) * 100 : 0;

  return {
    fixni: fixniMarze,
    variabilni: variabilniMarze,
    celkem: celkem,
    procento: celkoveProcento,
    variabilni_pct: realneProcento
  };
}

// ── Per-technology provize ──
// provize_tech = (celkova_marze - marze_voda) / (cena_celkem - cena_doku) * cena_tech
function vypocetProvizePerTech(celkovaMarze, cenaTech, cenaCelkem, cenaDoku, marzeVoda) {
  const zaklad = cenaCelkem - cenaDoku;
  if (zaklad <= 0) return 0;
  return ((celkovaMarze - marzeVoda) / zaklad) * cenaTech;
}

// ── ES/OE split + body ──
function vypocetRozdeleni(celkovaMarze) {
  const esPodil = parseFloat(document.getElementById('provize-es-podil').value) || 50;
  const oePodil = parseFloat(document.getElementById('provize-oe-podil').value) || 50;
  const bodDelic = parseFloat(document.getElementById('provize-bod-delic').value) || 222.22;

  const marze_es = celkovaMarze * (esPodil / 100);
  const marze_oe = celkovaMarze * (oePodil / 100);
  const body_es = marze_es / bodDelic;
  const body_oe = marze_oe / bodDelic;

  return { marze_es, marze_oe, body_es, body_oe };
}

// ── Etapove body ──
function vypocetEtapoveBod(celkoveBody, etapy) {
  if (!etapy) etapy = ADMIN_STATE.provizniEtapy;
  return etapy.map(e => ({
    ...e,
    body_za_obchod: celkoveBody * (e.za_obchod_pct / 100),
    body_za_odbornost: celkoveBody * (e.za_odbornost_pct / 100),
    body_celkem: celkoveBody * (e.podil_pct / 100)
  }));
}

// ── Testovaci vypocet ──
function provizeTestCalc() {
  collectScalingData();
  const cena = parseFloat(document.getElementById('provize-test-cena').value) || 0;
  const marze = vypocetMarze(cena, ADMIN_STATE.provizniTabulka);
  const split = vypocetRozdeleni(marze.celkem);

  const resultEl = document.getElementById('provize-test-result');
  resultEl.innerHTML = `
    <strong>Cena zakazky:</strong> ${formatKc(cena)}<br>
    <strong>Fixni marze (1mil × 20%):</strong> ${formatKc(marze.fixni)}<br>
    <strong>Variabilni marze (${marze.variabilni_pct ? marze.variabilni_pct.toFixed(1) : 0}%):</strong> ${formatKc(marze.variabilni)}<br>
    <strong>Celkova marze:</strong> ${formatKc(marze.celkem)} (${marze.procento.toFixed(1)}%)<br>
    <hr style="margin:8px 0;border-color:var(--border)">
    <strong>Marze ES:</strong> ${formatKc(split.marze_es)} | <strong>Body ES:</strong> ${split.body_es.toFixed(1)}<br>
    <strong>Marze OE:</strong> ${formatKc(split.marze_oe)} | <strong>Body OE:</strong> ${split.body_oe.toFixed(1)}<br>
    <strong>Celkem body:</strong> ${(split.body_es + split.body_oe).toFixed(1)}
  `;
}

// ── Collect & Save ──
function collectScalingData() {
  const rows = document.querySelectorAll('#provize-scaling-tbody tr');
  rows.forEach(tr => {
    const id = parseInt(tr.dataset.id);
    const item = ADMIN_STATE.provizniTabulka.find(r => r.pasmoId === id);
    if (!item) return;
    item.dolni_kc    = parseFloat(tr.querySelector('[name="dolni_kc"]').value) || 0;
    item.horni_kc    = parseFloat(tr.querySelector('[name="horni_kc"]').value) || 0;
    item.dolni_marze = parseFloat(tr.querySelector('[name="dolni_marze"]').value) || 0;
    item.horni_marze = parseFloat(tr.querySelector('[name="horni_marze"]').value) || 0;
  });
}

function collectEtapyData() {
  const rows = document.querySelectorAll('#provize-etapy-tbody tr');
  rows.forEach(tr => {
    const id = parseInt(tr.dataset.id);
    const item = ADMIN_STATE.provizniEtapy.find(r => r.etapaId === id);
    if (!item) return;
    item.podil_pct        = parseFloat(tr.querySelector('[name="podil_pct"]').value) || 0;
    item.cinnost          = tr.querySelector('[name="cinnost"]').value;
    item.za_obchod_pct    = parseFloat(tr.querySelector('[name="za_obchod_pct"]').value) || 0;
    item.za_odbornost_pct = parseFloat(tr.querySelector('[name="za_odbornost_pct"]').value) || 0;
  });
}

async function provizeUlozit() {
  collectScalingData();
  collectEtapyData();

  // Uloz settings
  ADMIN_STATE.settings.es_podil = parseFloat(document.getElementById('provize-es-podil').value) || 50;
  ADMIN_STATE.settings.oe_podil = parseFloat(document.getElementById('provize-oe-podil').value) || 50;
  ADMIN_STATE.settings.bod_delic = parseFloat(document.getElementById('provize-bod-delic').value) || 222.22;
  ADMIN_STATE.settings.voda_marze_pct = parseFloat(document.getElementById('provize-voda-marze').value) || 20;

  const ok1 = await adminSave('ProvizniTabulka', ADMIN_STATE.provizniTabulka);
  const ok2 = await adminSave('ProvizniEtapy', ADMIN_STATE.provizniEtapy);
  const ok3 = await adminSave('Settings', ADMIN_STATE.settings);
  showStatus('provize-status', ok1 && ok2 && ok3);
}
