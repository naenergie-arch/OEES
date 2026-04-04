/* ================================================================
   OEES Admin – Projektova dokumentace (CRUD)
   ================================================================ */

function renderPD() {
  const tbody = document.getElementById('pd-tbody');
  const filter = document.getElementById('pd-tech-filter').value;
  let data = filter
    ? ADMIN_STATE.pd.filter(r => r.technologie === filter)
    : ADMIN_STATE.pd;

  data = pdSeradSCekajicimi(data);

  tbody.innerHTML = data.map(r => `
    <tr data-id="${r.pdId}"${(r._novy || r._ceka) ? ' class="radek-ceka"' : ''}>
      <td>${techSelectHtml(r.technologie, 'technologie')}</td>
      <td><input type="text" class="input-wide" name="nazev_polozky" value="${esc(r.nazev_polozky)}"></td>
      <td><input type="text" name="popis" value="${esc(r.popis || '')}"></td>
      <td class="num"><input type="number" name="cena_bd" value="${r.cena_bd || 0}" step="1"></td>
      <td class="num"><input type="number" name="cena_firmy" value="${r.cena_firmy || 0}" step="1"></td>
      <td class="num"><input type="number" name="cena_mesta" value="${r.cena_mesta || 0}" step="1"></td>
      <td>
        <select name="zahrnuto_v_base">
          <option value="ano"${r.zahrnuto_v_base === 'ano' ? ' selected' : ''}>Ano</option>
          <option value="ne"${r.zahrnuto_v_base === 'ne' ? ' selected' : ''}>Ne</option>
        </select>
      </td>
      <td class="actions"><div class="radek-akce">
        <button class="btn-row-save" onclick="pdUlozitRadek('${r.pdId}')" title="Potvrdit a zařadit na místo">&#10003;</button>
        <button class="btn-row-del" onclick="pdSmazatRadek('${r.pdId}')" title="Smazat řádek">&#10005;</button>
        <button class="btn-row-wait${r._ceka ? ' ceka' : ''}" onclick="pdPockatRadek('${r.pdId}')" title="Přesunout nahoru – čeká na změnu">&#9202;</button>
      </div></td>
    </tr>
  `).join('');
}

function pdSeradSCekajicimi(data) {
  const nahore = data.filter(r => r._novy || r._ceka);
  const zbytek = data.filter(r => !r._novy && !r._ceka);
  return [...nahore, ...zbytek];
}

function pdPridatRadek() {
  const filter = document.getElementById('pd-tech-filter').value;
  ADMIN_STATE.pd.unshift({
    pdId: generateId(),
    technologie: filter || 'fve',
    nazev_polozky: '',
    popis: '',
    cena_bd: 0,
    cena_firmy: 0,
    cena_mesta: 0,
    zahrnuto_v_base: 'ano',
    _novy: true
  });
  renderPD();
}

function pdUlozitRadek(id) {
  pdCollectData();
  const item = ADMIN_STATE.pd.find(r => r.pdId === id);
  if (item) { delete item._novy; delete item._ceka; }
  ADMIN_STATE.pd.sort((a, b) => (a.technologie || '').localeCompare(b.technologie || '', 'cs'));
  renderPD();
}

function pdPockatRadek(id) {
  pdCollectData();
  const item = ADMIN_STATE.pd.find(r => r.pdId === id);
  if (item) item._ceka = true;
  renderPD();
}

function pdSmazatRadek(id) {
  ADMIN_STATE.pd = ADMIN_STATE.pd.filter(r => r.pdId !== id);
  renderPD();
}

function pdFilterChanged() {
  renderPD();
}

function pdCollectData() {
  const rows = document.querySelectorAll('#pd-tbody tr');
  rows.forEach(tr => {
    const id = tr.dataset.id;
    const item = ADMIN_STATE.pd.find(r => r.pdId === id);
    if (!item) return;
    item.technologie     = tr.querySelector('[name="technologie"]').value;
    item.nazev_polozky   = tr.querySelector('[name="nazev_polozky"]').value;
    item.popis           = tr.querySelector('[name="popis"]').value;
    item.cena_bd         = parseFloat(tr.querySelector('[name="cena_bd"]').value) || 0;
    item.cena_firmy      = parseFloat(tr.querySelector('[name="cena_firmy"]').value) || 0;
    item.cena_mesta      = parseFloat(tr.querySelector('[name="cena_mesta"]').value) || 0;
    item.zahrnuto_v_base = tr.querySelector('[name="zahrnuto_v_base"]').value;
  });
}

async function pdUlozit() {
  pdCollectData();
  ADMIN_STATE.pd.sort((a, b) => (a.technologie || '').localeCompare(b.technologie || '', 'cs'));
  ADMIN_STATE.pd.forEach(r => { delete r._novy; delete r._ceka; });
  const ok = await adminSave('ProjektovaDokumentace', ADMIN_STATE.pd);
  showStatus('pd-status', ok);
  renderPD();
}
