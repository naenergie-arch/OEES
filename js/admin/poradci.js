/* ================================================================
   OEES Admin – Sprava poradcu (CRUD)
   ================================================================ */

function renderPoradci() {
  const tbody = document.getElementById('poradci-tbody');
  let data = [...ADMIN_STATE.poradci];

  data = poradciSeradSCekajicimi(data);

  tbody.innerHTML = data.map(r => `
    <tr data-id="${r.poradceId}"${(r._novy || r._ceka) ? ' class="radek-ceka"' : ''}>
      <td><input type="text" name="poradceId" value="${esc(r.poradceId)}" style="width:80px" readonly></td>
      <td><input type="text" name="jmeno" value="${esc(r.jmeno)}" class="input-wide"></td>
      <td><input type="tel" name="telefon" value="${esc(r.telefon || '')}" style="width:140px"></td>
      <td><input type="email" name="email" value="${esc(r.email || '')}" style="width:180px"></td>
      <td>
        <select name="role">
          <option value="ESO3"${r.role === 'ESO3' ? ' selected' : ''}>ESO3</option>
          <option value="EP"${r.role === 'EP' ? ' selected' : ''}>EP</option>
          <option value="KOOD"${r.role === 'KOOD' ? ' selected' : ''}>KOOD</option>
        </select>
      </td>
      <td>
        <select name="aktivni">
          <option value="ano"${r.aktivni !== 'ne' ? ' selected' : ''}>Ano</option>
          <option value="ne"${r.aktivni === 'ne' ? ' selected' : ''}>Ne</option>
        </select>
      </td>
      <td class="actions"><div class="radek-akce">
        <button class="btn-row-save" onclick="poradciUlozitRadek('${r.poradceId}')" title="Potvrdit a zařadit na místo">&#10003;</button>
        <button class="btn-row-del" onclick="poradciSmazatRadek('${r.poradceId}')" title="Smazat řádek">&#10005;</button>
        <button class="btn-row-wait${r._ceka ? ' ceka' : ''}" onclick="poradciPockatRadek('${r.poradceId}')" title="Přesunout nahoru – čeká na změnu">&#9202;</button>
      </div></td>
    </tr>
  `).join('');
}

function poradciSeradSCekajicimi(data) {
  const nahore = data.filter(r => r._novy || r._ceka);
  const zbytek = data.filter(r => !r._novy && !r._ceka);
  return [...nahore, ...zbytek];
}

function poradciPridatRadek() {
  const newId = 'P' + String(ADMIN_STATE.poradci.length + 1).padStart(3, '0');
  ADMIN_STATE.poradci.unshift({
    poradceId: newId,
    jmeno: '',
    telefon: '',
    email: '',
    role: 'EP',
    aktivni: 'ano',
    _novy: true
  });
  renderPoradci();
}

function poradciUlozitRadek(id) {
  poradciCollectData();
  const item = ADMIN_STATE.poradci.find(r => r.poradceId === id);
  if (item) { delete item._novy; delete item._ceka; }
  ADMIN_STATE.poradci.sort((a, b) => (a.jmeno || '').localeCompare(b.jmeno || '', 'cs'));
  renderPoradci();
}

function poradciPockatRadek(id) {
  poradciCollectData();
  const item = ADMIN_STATE.poradci.find(r => r.poradceId === id);
  if (item) item._ceka = true;
  renderPoradci();
}

function poradciSmazatRadek(id) {
  ADMIN_STATE.poradci = ADMIN_STATE.poradci.filter(r => r.poradceId !== id);
  renderPoradci();
}

function poradciCollectData() {
  const rows = document.querySelectorAll('#poradci-tbody tr');
  rows.forEach(tr => {
    const id = tr.dataset.id;
    const item = ADMIN_STATE.poradci.find(r => r.poradceId === id);
    if (!item) return;
    item.jmeno   = tr.querySelector('[name="jmeno"]').value;
    item.telefon = tr.querySelector('[name="telefon"]').value;
    item.email   = tr.querySelector('[name="email"]').value;
    item.role    = tr.querySelector('[name="role"]').value;
    item.aktivni = tr.querySelector('[name="aktivni"]').value;
  });
}

async function poradciUlozit() {
  poradciCollectData();
  ADMIN_STATE.poradci.sort((a, b) => (a.jmeno || '').localeCompare(b.jmeno || '', 'cs'));
  ADMIN_STATE.poradci.forEach(r => { delete r._novy; delete r._ceka; });
  const ok = await adminSave('Poradci', ADMIN_STATE.poradci);
  showStatus('poradci-status', ok);
  renderPoradci();
}
