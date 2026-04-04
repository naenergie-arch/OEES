/* ================================================================
   OEES Admin – Sablony rozpoctu (dvouurobnova struktura)
   - Celkovy polozkov rozpocet (souhrn po technologiich)
   - Dilci polozkov rozpocty (detail po technologiich)
   ================================================================ */

function renderRozpocty() {
  const techFilter = document.getElementById('rozpocty-tech-filter').value;
  const typFilter = document.getElementById('rozpocty-typ-filter') ?
    document.getElementById('rozpocty-typ-filter').value : '';

  renderRozpoctyCelkove(techFilter, typFilter);
  renderRozpoctyDilci(techFilter, typFilter);

  const celkCard = document.getElementById('rozpocty-celkovy-card');
  const dilcCard = document.getElementById('rozpocty-dilci-card');
  if (celkCard) celkCard.style.display = (typFilter === 'dilci') ? 'none' : '';
  if (dilcCard) dilcCard.style.display = (typFilter === 'celkovy') ? 'none' : '';
}

function rozpoctyAkceTd(r) {
  return `<td class="actions"><div class="radek-akce">
    <button class="btn-row-save" onclick="rozpocetUlozitRadek('${r.rozpocetId}')" title="Potvrdit a zařadit na místo">&#10003;</button>
    <button class="btn-row-del" onclick="rozpocetSmazatRadek('${r.rozpocetId}')" title="Smazat řádek">&#10005;</button>
    <button class="btn-row-wait${r._ceka ? ' ceka' : ''}" onclick="rozpocetPockatRadek('${r.rozpocetId}')" title="Přesunout nahoru – čeká na změnu">&#9202;</button>
  </div></td>`;
}

function rozpoctySeradSCekajicimi(data) {
  const nahore = data.filter(r => r._novy || r._ceka);
  const zbytek = data.filter(r => !r._novy && !r._ceka);
  return [...nahore, ...zbytek];
}

// ── Celkovy rozpocet (souhrn) ──
function renderRozpoctyCelkove(techFilter, typFilter) {
  const tbody = document.getElementById('rozpocty-celkovy-tbody');
  if (!tbody) return;

  let data = ADMIN_STATE.rozpocty.filter(r => r.typ_rozpoctu === 'celkovy');
  if (techFilter) data = data.filter(r => r.technologie === techFilter);
  data = rozpoctySeradSCekajicimi(data);

  tbody.innerHTML = data.map(r => `
    <tr data-id="${r.rozpocetId}"${(r._novy || r._ceka) ? ' class="radek-ceka"' : ''}>
      <td><input type="number" name="poradi" value="${r.poradi || 0}" style="width:50px"></td>
      <td>${techSelectHtml(r.technologie, 'technologie')}</td>
      <td><input type="text" class="input-wide" name="nazev_polozky" value="${esc(r.nazev_polozky)}"></td>
      <td><input type="text" name="cena_vzorec" value="${esc(r.cena_vzorec || '')}" placeholder="napr. {{FVECena}}" style="width:160px"></td>
      <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}"></td>
      ${rozpoctyAkceTd(r)}
    </tr>
  `).join('');
}

// ── Dilci rozpocty (detail) ──
function renderRozpoctyDilci(techFilter, typFilter) {
  const tbody = document.getElementById('rozpocty-dilci-tbody');
  if (!tbody) return;

  let data = ADMIN_STATE.rozpocty.filter(r => r.typ_rozpoctu === 'dilci');
  if (techFilter) data = data.filter(r => r.technologie === techFilter);

  // Cekajici nahoru, pak zbytek seskupeny dle technologie
  const nahore = data.filter(r => r._novy || r._ceka);
  const zbytek = data.filter(r => !r._novy && !r._ceka);
  zbytek.sort((a, b) => {
    if (a.technologie !== b.technologie) return a.technologie.localeCompare(b.technologie);
    return (a.poradi || 0) - (b.poradi || 0);
  });

  let html = '';

  // Cekajici radky navrchu
  nahore.forEach(r => {
    html += `<tr data-id="${r.rozpocetId}" class="radek-ceka">
      <td><input type="number" name="poradi" value="${r.poradi || 0}" style="width:50px"></td>
      <td>${techSelectHtml(r.technologie, 'technologie')}</td>
      <td><input type="text" class="input-wide" name="nazev_polozky" value="${esc(r.nazev_polozky)}"></td>
      <td><input type="text" class="input-narrow" name="mj" value="${esc(r.mj || 'kpl')}"></td>
      <td class="num"><input type="number" name="podil_pct" value="${r.podil_pct != null ? r.podil_pct : ''}" step="0.1" style="width:70px" placeholder="-"></td>
      <td><input type="text" name="mnozstvi_vzorec" value="${esc(r.mnozstvi_vzorec || '')}" placeholder="napr. kwp*1.5"></td>
      <td><input type="text" name="cena_ref_cenikId" value="${esc(r.cena_ref_cenikId || '')}" placeholder="ID ceniku"></td>
      <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}"></td>
      ${rozpoctyAkceTd(r)}
    </tr>`;
  });

  // Skupiny dle technologie
  const groups = {};
  zbytek.forEach(r => {
    if (!groups[r.technologie]) groups[r.technologie] = [];
    groups[r.technologie].push(r);
  });

  for (const [tech, items] of Object.entries(groups)) {
    const techLabel = TECHNOLOGIE_LIST.find(t => t.value === tech)?.label || tech;
    const totalPct = items.reduce((s, r) => s + (parseFloat(r.podil_pct) || 0), 0);

    html += `<tr class="rozpocet-group-header">
      <td colspan="9"><strong>${techLabel}</strong>
        <span class="text-muted" style="margin-left:12px">
          ${totalPct > 0 ? 'Celkem podil: ' + totalPct + '%' : ''}
        </span>
      </td>
    </tr>`;

    items.forEach(r => {
      html += `<tr data-id="${r.rozpocetId}">
        <td><input type="number" name="poradi" value="${r.poradi || 0}" style="width:50px"></td>
        <td>${techSelectHtml(r.technologie, 'technologie')}</td>
        <td><input type="text" class="input-wide" name="nazev_polozky" value="${esc(r.nazev_polozky)}"></td>
        <td><input type="text" class="input-narrow" name="mj" value="${esc(r.mj || 'kpl')}"></td>
        <td class="num"><input type="number" name="podil_pct" value="${r.podil_pct != null ? r.podil_pct : ''}" step="0.1" style="width:70px" placeholder="-"></td>
        <td><input type="text" name="mnozstvi_vzorec" value="${esc(r.mnozstvi_vzorec || '')}" placeholder="napr. kwp*1.5"></td>
        <td><input type="text" name="cena_ref_cenikId" value="${esc(r.cena_ref_cenikId || '')}" placeholder="ID ceniku"></td>
        <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}"></td>
        ${rozpoctyAkceTd(r)}
      </tr>`;
    });
  }

  tbody.innerHTML = html;
}

// ── CRUD ──
function rozpocetPridatRadek() {
  const techFilter = document.getElementById('rozpocty-tech-filter').value;
  const typFilter = document.getElementById('rozpocty-typ-filter') ?
    document.getElementById('rozpocty-typ-filter').value : '';
  const typ = typFilter || 'dilci';

  const sameTech = ADMIN_STATE.rozpocty.filter(r =>
    r.technologie === (techFilter || 'fve') && r.typ_rozpoctu === typ
  );
  const maxPoradi = sameTech.reduce((m, r) => Math.max(m, r.poradi || 0), 0);

  ADMIN_STATE.rozpocty.unshift({
    rozpocetId: generateId(),
    technologie: techFilter || 'fve',
    typ_rozpoctu: typ,
    nazev_polozky: '',
    mj: 'kpl',
    podil_pct: null,
    poradi: maxPoradi + 1,
    mnozstvi_vzorec: '',
    cena_ref_cenikId: '',
    cena_vzorec: '',
    poznamka: '',
    _novy: true
  });
  renderRozpocty();
}

function rozpocetUlozitRadek(id) {
  rozpocetCollectData();
  const item = ADMIN_STATE.rozpocty.find(r => r.rozpocetId === id);
  if (item) { delete item._novy; delete item._ceka; }
  ADMIN_STATE.rozpocty.sort((a, b) =>
    (a.technologie || '').localeCompare(b.technologie || '', 'cs') ||
    (a.typ_rozpoctu || '').localeCompare(b.typ_rozpoctu || '') ||
    (a.poradi || 0) - (b.poradi || 0)
  );
  renderRozpocty();
}

function rozpocetPockatRadek(id) {
  rozpocetCollectData();
  const item = ADMIN_STATE.rozpocty.find(r => r.rozpocetId === id);
  if (item) item._ceka = true;
  renderRozpocty();
}

function rozpocetSmazatRadek(id) {
  ADMIN_STATE.rozpocty = ADMIN_STATE.rozpocty.filter(r => r.rozpocetId !== id);
  renderRozpocty();
}

function rozpocetFilterChanged() {
  renderRozpocty();
}

function rozpocetNacistVychozi() {
  if (!confirm('Opravdu načíst výchozí šablonu? Stávající data budou nahrazena.')) return;
  ADMIN_STATE.rozpocty = JSON.parse(JSON.stringify(DEFAULT_ROZPOCTY));
  renderRozpocty();
  showStatus('rozpocty-status', true, 'Výchozí šablona načtena (nezapomeňte uložit).');
}

// ── Collect & Save ──
function rozpocetCollectData() {
  document.querySelectorAll('#rozpocty-celkovy-tbody tr').forEach(tr => {
    const id = tr.dataset.id;
    const item = ADMIN_STATE.rozpocty.find(r => r.rozpocetId === id);
    if (!item) return;
    item.poradi         = parseInt(tr.querySelector('[name="poradi"]')?.value) || 0;
    item.technologie    = tr.querySelector('[name="technologie"]')?.value || item.technologie;
    item.nazev_polozky  = tr.querySelector('[name="nazev_polozky"]')?.value || '';
    item.cena_vzorec    = tr.querySelector('[name="cena_vzorec"]')?.value || '';
    item.poznamka       = tr.querySelector('[name="poznamka"]')?.value || '';
  });

  document.querySelectorAll('#rozpocty-dilci-tbody tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    const item = ADMIN_STATE.rozpocty.find(r => r.rozpocetId === id);
    if (!item) return;
    item.poradi          = parseInt(tr.querySelector('[name="poradi"]')?.value) || 0;
    item.technologie     = tr.querySelector('[name="technologie"]')?.value || item.technologie;
    item.nazev_polozky   = tr.querySelector('[name="nazev_polozky"]')?.value || '';
    item.mj              = tr.querySelector('[name="mj"]')?.value || 'kpl';
    const pctVal         = tr.querySelector('[name="podil_pct"]')?.value;
    item.podil_pct       = pctVal !== '' && pctVal != null ? parseFloat(pctVal) : null;
    item.mnozstvi_vzorec = tr.querySelector('[name="mnozstvi_vzorec"]')?.value || '';
    item.cena_ref_cenikId = tr.querySelector('[name="cena_ref_cenikId"]')?.value || '';
    item.poznamka        = tr.querySelector('[name="poznamka"]')?.value || '';
  });
}

async function rozpocetUlozit() {
  rozpocetCollectData();
  ADMIN_STATE.rozpocty.sort((a, b) =>
    (a.technologie || '').localeCompare(b.technologie || '', 'cs') ||
    (a.typ_rozpoctu || '').localeCompare(b.typ_rozpoctu || '') ||
    (a.poradi || 0) - (b.poradi || 0)
  );
  ADMIN_STATE.rozpocty.forEach(r => { delete r._novy; delete r._ceka; });
  const ok = await adminSave('Rozpocty', ADMIN_STATE.rozpocty);
  showStatus('rozpocty-status', ok);
  renderRozpocty();
}
