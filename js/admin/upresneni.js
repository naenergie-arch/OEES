/* ================================================================
   OEES Admin – Upresneni finalni studie
   Workflow: Predbezna studie → Upresneni → Finalni studie

   - Nacte polozky rozpoctu z predbezne studie (cena_predbezna)
   - Umozni manualni upravu cen (cena_upresnena)
   - Export pro finalni studii (bere upresnene nebo puvodni ceny)
   ================================================================ */

let UPRESNENI_CURRENT_CASE = null;

// ── Render ──

function renderUpresneni() {
  // Naplnit seznam pripadu
  upresneniRefreshCases();
}

function upresneniRefreshCases() {
  const sel = document.getElementById('upresneni-case-select');
  if (!sel) return;

  // Ziskej unikatni caseId z upresneni dat
  const caseIds = [...new Set(
    ADMIN_STATE.upresneni
      .filter(r => r.caseId)
      .map(r => r.caseId)
  )];

  let html = '<option value="">-- Vyberte pripad --</option>';
  html += '<option value="__new__">+ Novy pripad (z sablon)</option>';
  caseIds.forEach(id => {
    html += `<option value="${id}"${id === UPRESNENI_CURRENT_CASE ? ' selected' : ''}>${id}</option>`;
  });
  sel.innerHTML = html;
}

function upresneniLoadCase(caseId) {
  if (!caseId) {
    document.getElementById('upresneni-info').style.display = '';
    document.getElementById('upresneni-content').style.display = 'none';
    document.getElementById('upresneni-footer').style.display = 'none';
    UPRESNENI_CURRENT_CASE = null;
    return;
  }

  if (caseId === '__new__') {
    // Vytvorit novy pripad z sablon
    const newCaseId = 'CASE-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + generateId().slice(0, 5);
    upresneniGenerateFromTemplates(newCaseId);
    UPRESNENI_CURRENT_CASE = newCaseId;

    // Pridat do selectu
    const sel = document.getElementById('upresneni-case-select');
    const opt = document.createElement('option');
    opt.value = newCaseId;
    opt.textContent = newCaseId;
    opt.selected = true;
    sel.appendChild(opt);
  } else {
    UPRESNENI_CURRENT_CASE = caseId;
  }

  // Nacist data pro tento pripad
  const caseData = ADMIN_STATE.upresneni.filter(r => r.caseId === UPRESNENI_CURRENT_CASE);
  renderUpresneniTable(caseData);

  document.getElementById('upresneni-info').style.display = 'none';
  document.getElementById('upresneni-content').style.display = '';
  document.getElementById('upresneni-footer').style.display = '';
}

// ── Generate from Templates ──

function upresneniGenerateFromTemplates(caseId) {
  // Vychazime z rozpoctu sablon (celkove + dilci)
  const templates = ADMIN_STATE.rozpocty.length
    ? ADMIN_STATE.rozpocty
    : DEFAULT_ROZPOCTY;

  const newRecords = templates.map(tpl => ({
    upresneniId: generateId(),
    caseId: caseId,
    rozpocetId: tpl.rozpocetId,
    technologie: tpl.technologie,
    typ_rozpoctu: tpl.typ_rozpoctu,
    nazev_polozky: tpl.nazev_polozky,
    cena_predbezna: 0,         // Vyplni se pri generovani predbezne studie
    cena_upresnena: '',        // Uzivatel doplni
    upresneno: false,
    upresneno_kym: '',
    upresneno_kdy: '',
    poznamka: tpl.poznamka || ''
  }));

  // Pridat do ADMIN_STATE
  ADMIN_STATE.upresneni.push(...newRecords);
}

// ── Render Table ──

function renderUpresneniTable(data) {
  const tbody = document.getElementById('upresneni-tbody');
  if (!tbody) return;

  // Rozdelit na celkove a dilci, seradit
  const celkove = data.filter(r => r.typ_rozpoctu === 'celkovy').sort((a, b) => {
    const ai = ADMIN_STATE.rozpocty.find(t => t.rozpocetId === a.rozpocetId);
    const bi = ADMIN_STATE.rozpocty.find(t => t.rozpocetId === b.rozpocetId);
    return ((ai && ai.poradi) || 0) - ((bi && bi.poradi) || 0);
  });

  const dilci = data.filter(r => r.typ_rozpoctu === 'dilci');

  // Seskupit dilci dle technologie
  const dilciGroups = {};
  dilci.forEach(r => {
    if (!dilciGroups[r.technologie]) dilciGroups[r.technologie] = [];
    dilciGroups[r.technologie].push(r);
  });

  let html = '';

  // ── Celkovy rozpocet ──
  html += '<tr class="rozpocet-group-header"><td colspan="7"><strong>CELKOVY POLOZKOVY ROZPOCET</strong></td></tr>';

  let totalPredbezna = 0;
  let totalUpresnena = 0;

  celkove.forEach(r => {
    const predb = parseFloat(r.cena_predbezna) || 0;
    const uprVal = r.cena_upresnena !== '' && r.cena_upresnena != null ? parseFloat(r.cena_upresnena) : null;
    const efektivni = uprVal !== null ? uprVal : predb;
    const rozdil = efektivni - predb;
    const isChanged = uprVal !== null && uprVal !== predb;
    totalPredbezna += predb;
    totalUpresnena += efektivni;

    const techLabel = TECHNOLOGIE_LIST.find(t => t.value === r.technologie)?.label || r.technologie;

    html += `<tr data-id="${r.upresneniId}" class="${isChanged ? 'row-upresneno' : ''}">
      <td>${techLabel}</td>
      <td>${esc(r.nazev_polozky)}</td>
      <td class="num">${formatKc(predb)}</td>
      <td class="num"><input type="number" name="cena_upresnena" value="${uprVal !== null ? uprVal : ''}" placeholder="${predb}" step="1" style="width:130px"></td>
      <td class="num" style="color:${rozdil > 0 ? '#e74c3c' : rozdil < 0 ? '#27ae60' : '#888'}">${rozdil !== 0 ? formatKc(rozdil) : '-'}</td>
      <td style="text-align:center"><input type="checkbox" name="upresneno" ${r.upresneno ? 'checked' : ''}></td>
      <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}" style="width:120px"></td>
    </tr>`;
  });

  // Soucet celkovy
  html += `<tr style="font-weight:bold;background:#f0f4f8">
    <td colspan="2">CELKEM</td>
    <td class="num">${formatKc(totalPredbezna)}</td>
    <td class="num">${formatKc(totalUpresnena)}</td>
    <td class="num" style="color:${totalUpresnena - totalPredbezna > 0 ? '#e74c3c' : '#27ae60'}">${formatKc(totalUpresnena - totalPredbezna)}</td>
    <td colspan="2"></td>
  </tr>`;

  // ── Dilci rozpocty ──
  for (const [tech, items] of Object.entries(dilciGroups)) {
    const techLabel = TECHNOLOGIE_LIST.find(t => t.value === tech)?.label || tech;
    let grpPredb = 0, grpUpr = 0;

    html += `<tr class="rozpocet-group-header"><td colspan="7"><strong>Dilci rozpocet: ${techLabel}</strong></td></tr>`;

    items.forEach(r => {
      const predb = parseFloat(r.cena_predbezna) || 0;
      const uprVal = r.cena_upresnena !== '' && r.cena_upresnena != null ? parseFloat(r.cena_upresnena) : null;
      const efektivni = uprVal !== null ? uprVal : predb;
      const rozdil = efektivni - predb;
      const isChanged = uprVal !== null && uprVal !== predb;
      grpPredb += predb;
      grpUpr += efektivni;

      html += `<tr data-id="${r.upresneniId}" class="${isChanged ? 'row-upresneno' : ''}">
        <td style="padding-left:24px">${techLabel}</td>
        <td>${esc(r.nazev_polozky)}</td>
        <td class="num">${formatKc(predb)}</td>
        <td class="num"><input type="number" name="cena_upresnena" value="${uprVal !== null ? uprVal : ''}" placeholder="${predb}" step="1" style="width:130px"></td>
        <td class="num" style="color:${rozdil > 0 ? '#e74c3c' : rozdil < 0 ? '#27ae60' : '#888'}">${rozdil !== 0 ? formatKc(rozdil) : '-'}</td>
        <td style="text-align:center"><input type="checkbox" name="upresneno" ${r.upresneno ? 'checked' : ''}></td>
        <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}" style="width:120px"></td>
      </tr>`;
    });

    // Mezisoučet skupiny
    html += `<tr style="font-weight:600;background:#f8fafb">
      <td style="padding-left:24px">${techLabel} celkem</td>
      <td></td>
      <td class="num">${formatKc(grpPredb)}</td>
      <td class="num">${formatKc(grpUpr)}</td>
      <td class="num">${formatKc(grpUpr - grpPredb)}</td>
      <td colspan="2"></td>
    </tr>`;
  }

  tbody.innerHTML = html;

  // Auto-check upresneno kdyz se zmeni cena
  tbody.querySelectorAll('input[name="cena_upresnena"]').forEach(inp => {
    inp.addEventListener('input', function () {
      const tr = this.closest('tr');
      const cb = tr.querySelector('input[name="upresneno"]');
      if (cb && this.value !== '') cb.checked = true;
    });
  });
}

// ── Collect & Save ──

function upresneniCollectData() {
  document.querySelectorAll('#upresneni-tbody tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    const item = ADMIN_STATE.upresneni.find(r => r.upresneniId === id);
    if (!item) return;

    const uprInput = tr.querySelector('input[name="cena_upresnena"]');
    const cbInput = tr.querySelector('input[name="upresneno"]');
    const pozInput = tr.querySelector('input[name="poznamka"]');

    if (uprInput) {
      item.cena_upresnena = uprInput.value !== '' ? parseFloat(uprInput.value) : '';
    }
    if (cbInput) {
      item.upresneno = cbInput.checked;
      if (cbInput.checked) {
        item.upresneno_kdy = new Date().toISOString().slice(0, 10);
      }
    }
    if (pozInput) {
      item.poznamka = pozInput.value;
    }
  });
}

async function upresneniUlozit() {
  upresneniCollectData();
  const ok = await adminSave('Upresneni', ADMIN_STATE.upresneni);
  showStatus('upresneni-status', ok);
}

// ── Export Finalni ──

function upresneniExportFinalni() {
  if (!UPRESNENI_CURRENT_CASE) {
    alert('Neni vybran zadny pripad.');
    return;
  }

  upresneniCollectData();
  const caseData = ADMIN_STATE.upresneni.filter(r => r.caseId === UPRESNENI_CURRENT_CASE);

  // Pro kazdou polozku: pokud upresneno → pouzij cena_upresnena, jinak cena_predbezna
  const finalniRozpocet = caseData.map(r => ({
    technologie: r.technologie,
    typ_rozpoctu: r.typ_rozpoctu,
    nazev_polozky: r.nazev_polozky,
    cena_finalni: r.upresneno && r.cena_upresnena !== '' ? parseFloat(r.cena_upresnena) : (parseFloat(r.cena_predbezna) || 0),
    cena_predbezna: parseFloat(r.cena_predbezna) || 0,
    upresneno: r.upresneno || false
  }));

  // Zobrazit souhrn
  const celkove = finalniRozpocet.filter(r => r.typ_rozpoctu === 'celkovy');
  const total = celkove.reduce((s, r) => s + r.cena_finalni, 0);

  let msg = 'FINALNI ROZPOCET pro ' + UPRESNENI_CURRENT_CASE + '\n\n';
  celkove.forEach(r => {
    const techLabel = TECHNOLOGIE_LIST.find(t => t.value === r.technologie)?.label || r.technologie;
    msg += `${techLabel}: ${r.cena_finalni.toLocaleString('cs-CZ')} Kc`;
    if (r.upresneno) msg += ' (upresneno)';
    msg += '\n';
  });
  msg += '\nCELKEM: ' + total.toLocaleString('cs-CZ') + ' Kc';
  msg += '\n\nData jsou pripravena pro generovani finalni studie.';

  alert(msg);

  // Ulozit finalni data do konzole pro dalsi zpracovani
  console.log('Finalni rozpocet:', finalniRozpocet);

  return finalniRozpocet;
}
