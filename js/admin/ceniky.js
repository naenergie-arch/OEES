/* ================================================================
   OEES Admin – Ceniky technologii (CRUD)
   ================================================================ */

function renderCeniky() {
  const tbody = document.getElementById('ceniky-tbody');
  const filter = document.getElementById('ceniky-tech-filter').value;
  let data = filter
    ? ADMIN_STATE.ceniky.filter(r => r.technologie === filter)
    : ADMIN_STATE.ceniky;

  if (typeof aktualizujDodavateleDatalist === 'function') aktualizujDodavateleDatalist();

  // Cekajici a nove nahoru
  data = cenikSeradSCekajicimi(data);

  tbody.innerHTML = data.map((r, i) => `
    <tr data-id="${r.cenikId}"${(r._novy || r._ceka) ? ' class="radek-ceka"' : ''}>
      <td>${techSelectHtml(r.technologie, 'technologie')}</td>
      <td><input type="text" class="input-wide" name="nazev_polozky" value="${esc(r.nazev_polozky)}"></td>
      <td><input type="text" class="input-narrow" name="mj" value="${esc(r.mj || 'ks')}"></td>
      <td><input type="text" name="dodavatel" value="${esc(r.dodavatel || '')}" list="datalist-dodavatele" placeholder="Zacnete psat..." style="min-width:130px"></td>
      <td class="num"><input type="number" name="cena_nakup" value="${r.cena_nakup || 0}" step="1"></td>
      <td class="num"><input type="number" name="marze_pct" value="${r.marze_pct || 0}" step="0.1" style="width:70px"></td>
      <td class="num"><input type="number" name="cena_prodej" value="${r.cena_prodej || 0}" step="1"></td>
      <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}"></td>
      <td><input type="date" name="platnost_od" value="${r.platnost_od || ''}" style="width:120px"></td>
      <td class="actions"><div class="radek-akce">
        <button class="btn-row-save" onclick="cenikUlozitRadek('${r.cenikId}')" title="Potvrdit a zařadit na místo">&#10003;</button>
        <button class="btn-row-del" onclick="cenikSmazatRadek('${r.cenikId}')" title="Smazat řádek">&#10005;</button>
        <button class="btn-row-wait${r._ceka ? ' ceka' : ''}" onclick="cenikPockatRadek('${r.cenikId}')" title="Přesunout nahoru – čeká na změnu">&#9202;</button>
      </div></td>
    </tr>
  `).join('');

  // Auto-calc prodejni ceny
  tbody.querySelectorAll('tr').forEach(tr => {
    const nakup = tr.querySelector('[name="cena_nakup"]');
    const marze = tr.querySelector('[name="marze_pct"]');
    const prodej = tr.querySelector('[name="cena_prodej"]');
    const calc = () => {
      const n = parseFloat(nakup.value) || 0;
      const m = parseFloat(marze.value) || 0;
      prodej.value = Math.round(n * (1 + m / 100));
    };
    nakup.addEventListener('input', calc);
    marze.addEventListener('input', calc);
  });
}

function cenikSeradSCekajicimi(data) {
  const nahore = data.filter(r => r._novy || r._ceka);
  const zbytek = data.filter(r => !r._novy && !r._ceka);
  return [...nahore, ...zbytek];
}

function cenikPridatRadek() {
  const filter = document.getElementById('ceniky-tech-filter').value;
  ADMIN_STATE.ceniky.unshift({
    cenikId: generateId(),
    technologie: filter || 'fve',
    nazev_polozky: '',
    mj: 'ks',
    dodavatel: '',
    cena_nakup: 0,
    marze_pct: 0,
    cena_prodej: 0,
    poznamka: '',
    platnost_od: new Date().toISOString().slice(0, 10),
    _novy: true
  });
  renderCeniky();
}

function cenikUlozitRadek(id) {
  cenikCollectData();
  const item = ADMIN_STATE.ceniky.find(r => r.cenikId === id);
  if (item) { delete item._novy; delete item._ceka; }
  ADMIN_STATE.ceniky.sort((a, b) => (a.technologie || '').localeCompare(b.technologie || '', 'cs'));
  renderCeniky();
}

function cenikPockatRadek(id) {
  cenikCollectData();
  const item = ADMIN_STATE.ceniky.find(r => r.cenikId === id);
  if (item) item._ceka = true;
  renderCeniky();
}

function cenikSmazatRadek(id) {
  ADMIN_STATE.ceniky = ADMIN_STATE.ceniky.filter(r => r.cenikId !== id);
  renderCeniky();
}

function cenikFilterChanged() {
  renderCeniky();
}

function cenikCollectData() {
  const rows = document.querySelectorAll('#ceniky-tbody tr');
  rows.forEach(tr => {
    const id = tr.dataset.id;
    const item = ADMIN_STATE.ceniky.find(r => r.cenikId === id);
    if (!item) return;
    item.technologie    = tr.querySelector('[name="technologie"]').value;
    item.nazev_polozky  = tr.querySelector('[name="nazev_polozky"]').value;
    item.mj             = tr.querySelector('[name="mj"]').value;
    item.dodavatel      = tr.querySelector('[name="dodavatel"]').value;
    item.cena_nakup     = parseFloat(tr.querySelector('[name="cena_nakup"]').value) || 0;
    item.marze_pct      = parseFloat(tr.querySelector('[name="marze_pct"]').value) || 0;
    item.cena_prodej    = parseFloat(tr.querySelector('[name="cena_prodej"]').value) || 0;
    item.poznamka       = tr.querySelector('[name="poznamka"]').value;
    item.platnost_od    = tr.querySelector('[name="platnost_od"]').value;
  });
}

async function cenikUlozit() {
  cenikCollectData();
  ADMIN_STATE.ceniky.sort((a, b) => (a.technologie || '').localeCompare(b.technologie || '', 'cs'));
  ADMIN_STATE.ceniky.forEach(r => { delete r._novy; delete r._ceka; });
  const ok = await adminSave('Ceniky', ADMIN_STATE.ceniky);
  showStatus('ceniky-status', ok);
  renderCeniky();
}

function cenikNacistVychozi() {
  if (!confirm('Opravdu načíst výchozí ceník? Stávající data budou nahrazena.')) return;
  ADMIN_STATE.ceniky = JSON.parse(JSON.stringify(DEFAULT_CENIKY));
  renderCeniky();
  showStatus('ceniky-status', true, 'Výchozí ceník načten (nezapomeňte uložit).');
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
