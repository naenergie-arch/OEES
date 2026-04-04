/* ================================================================
   OEES Admin – Nakupni ceny od dodavatelu (CRUD)
   ================================================================ */

function renderNaklady() {
  const tbody = document.getElementById('naklady-tbody');
  const filter = document.getElementById('naklady-tech-filter').value;
  let data = filter
    ? ADMIN_STATE.naklady.filter(r => r.technologie === filter)
    : ADMIN_STATE.naklady;

  if (typeof aktualizujDodavateleDatalist === 'function') aktualizujDodavateleDatalist();

  data = nakladySeradSCekajicimi(data);

  tbody.innerHTML = data.map(r => `
    <tr data-id="${r.nakladId}"${(r._novy || r._ceka) ? ' class="radek-ceka"' : ''}>
      <td><input type="text" name="dodavatel" value="${esc(r.dodavatel || '')}" list="datalist-dodavatele" placeholder="Zacnete psat..." style="min-width:130px"></td>
      <td>${techSelectHtml(r.technologie, 'technologie')}</td>
      <td><input type="text" class="input-wide" name="nazev_polozky" value="${esc(r.nazev_polozky)}"></td>
      <td class="num"><input type="number" name="cena_nakup" value="${r.cena_nakup || 0}" step="1"></td>
      <td><input type="date" name="datum" value="${r.datum || ''}" style="width:120px"></td>
      <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}"></td>
      <td class="actions"><div class="radek-akce">
        <button class="btn-row-save" onclick="nakladyUlozitRadek('${r.nakladId}')" title="Potvrdit a zařadit na místo">&#10003;</button>
        <button class="btn-row-del" onclick="nakladySmazatRadek('${r.nakladId}')" title="Smazat řádek">&#10005;</button>
        <button class="btn-row-wait${r._ceka ? ' ceka' : ''}" onclick="nakladyPockatRadek('${r.nakladId}')" title="Přesunout nahoru – čeká na změnu">&#9202;</button>
      </div></td>
    </tr>
  `).join('');
}

function nakladySeradSCekajicimi(data) {
  const nahore = data.filter(r => r._novy || r._ceka);
  const zbytek = data.filter(r => !r._novy && !r._ceka);
  return [...nahore, ...zbytek];
}

function nakladyPridatRadek() {
  const filter = document.getElementById('naklady-tech-filter').value;
  ADMIN_STATE.naklady.unshift({
    nakladId: generateId(),
    dodavatel: '',
    technologie: filter || 'fve',
    nazev_polozky: '',
    cena_nakup: 0,
    datum: new Date().toISOString().slice(0, 10),
    poznamka: '',
    _novy: true
  });
  renderNaklady();
}

function nakladyUlozitRadek(id) {
  nakladyCollectData();
  const item = ADMIN_STATE.naklady.find(r => r.nakladId === id);
  if (item) { delete item._novy; delete item._ceka; }
  ADMIN_STATE.naklady.sort((a, b) => (a.technologie || '').localeCompare(b.technologie || '', 'cs'));
  renderNaklady();
}

function nakladyPockatRadek(id) {
  nakladyCollectData();
  const item = ADMIN_STATE.naklady.find(r => r.nakladId === id);
  if (item) item._ceka = true;
  renderNaklady();
}

function nakladySmazatRadek(id) {
  ADMIN_STATE.naklady = ADMIN_STATE.naklady.filter(r => r.nakladId !== id);
  renderNaklady();
}

function nakladyFilterChanged() {
  renderNaklady();
}

function nakladyCollectData() {
  const rows = document.querySelectorAll('#naklady-tbody tr');
  rows.forEach(tr => {
    const id = tr.dataset.id;
    const item = ADMIN_STATE.naklady.find(r => r.nakladId === id);
    if (!item) return;
    item.dodavatel     = tr.querySelector('[name="dodavatel"]').value;
    item.technologie   = tr.querySelector('[name="technologie"]').value;
    item.nazev_polozky = tr.querySelector('[name="nazev_polozky"]').value;
    item.cena_nakup    = parseFloat(tr.querySelector('[name="cena_nakup"]').value) || 0;
    item.datum         = tr.querySelector('[name="datum"]').value;
    item.poznamka      = tr.querySelector('[name="poznamka"]').value;
  });
}

async function nakladyUlozit() {
  nakladyCollectData();
  ADMIN_STATE.naklady.sort((a, b) => (a.technologie || '').localeCompare(b.technologie || '', 'cs'));
  ADMIN_STATE.naklady.forEach(r => { delete r._novy; delete r._ceka; });
  const ok = await adminSave('NakladyCeniky', ADMIN_STATE.naklady);
  showStatus('naklady-status', ok);
  renderNaklady();
}
