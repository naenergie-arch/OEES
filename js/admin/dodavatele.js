/* ================================================================
   OEES Admin – Číselník dodavatelů (CRUD)
   ================================================================ */

// Generuje checkboxy technologii pro dodavatele (vice technologii najednou)
function dodavateleTechSelectHtml(techStr) {
  const selected = (techStr || '').split(',').map(s => s.trim().toLowerCase());
  const techList = typeof getTechnologieList === 'function' ? getTechnologieList() : (typeof TECHNOLOGIE_LIST !== 'undefined' ? TECHNOLOGIE_LIST : []);
  return `<div class="tech-checkboxes" style="display:flex;flex-wrap:wrap;gap:2px 8px;min-width:140px">` +
    techList.filter(t => t.value !== 'dokumentace' && t.value !== 'distribuce').map(t =>
      `<label style="font-size:0.7rem;white-space:nowrap;cursor:pointer">
        <input type="checkbox" name="tech_cb" value="${t.value}"${selected.includes(t.value) ? ' checked' : ''}> ${t.label}
      </label>`
    ).join('') + `</div>`;
}

function renderDodavatele() {
  const tbody = document.getElementById('dodavatele-tbody');
  if (!tbody) return;

  if (!ADMIN_STATE.dodavatele || !ADMIN_STATE.dodavatele.length) {
    ADMIN_STATE.dodavatele = [];
  }

  // Cekajici a nove nahoru
  const nahore = ADMIN_STATE.dodavatele.filter(r => r._novy || r._ceka);
  const zbytek = ADMIN_STATE.dodavatele.filter(r => !r._novy && !r._ceka);
  const data = [...nahore, ...zbytek];

  tbody.innerHTML = data.map((r, i) => {
    const origIdx = ADMIN_STATE.dodavatele.indexOf(r);
    return `
    <tr data-index="${origIdx}"${(r._novy || r._ceka) ? ' class="radek-ceka"' : ''}>
      <td><input type="text" name="nazev" value="${esc(r.nazev)}" class="input-wide" placeholder="Název firmy"></td>
      <td><input type="text" name="ico" value="${esc(r.ico || '')}" style="width:90px" maxlength="8"></td>
      <td><input type="text" name="kontakt" value="${esc(r.kontakt || '')}" style="min-width:120px"></td>
      <td><input type="tel" name="telefon" value="${esc(r.telefon || '')}" style="width:130px"></td>
      <td><input type="email" name="email" value="${esc(r.email || '')}" style="min-width:160px"></td>
      <td>${dodavateleTechSelectHtml(r.technologie || '')}</td>
      <td><input type="text" name="poznamka" value="${esc(r.poznamka || '')}"></td>
      <td>
        <select name="aktivni">
          <option value="ano"${r.aktivni !== 'ne' ? ' selected' : ''}>Ano</option>
          <option value="ne"${r.aktivni === 'ne' ? ' selected' : ''}>Ne</option>
        </select>
      </td>
      <td class="actions"><div class="radek-akce">
        <button class="btn-row-save" onclick="dodavateleUlozitRadek(${origIdx})" title="Potvrdit a zařadit na místo">&#10003;</button>
        <button class="btn-row-del" onclick="dodavateleSmazatRadek(${origIdx})" title="Smazat řádek">&#10005;</button>
        <button class="btn-row-wait${r._ceka ? ' ceka' : ''}" onclick="dodavatelePockatRadek(${origIdx})" title="Přesunout nahoru – čeká na změnu">&#9202;</button>
      </div></td>
    </tr>`;
  }).join('');
}

function dodavatelePridatRadek() {
  if (!ADMIN_STATE.dodavatele) ADMIN_STATE.dodavatele = [];
  ADMIN_STATE.dodavatele.unshift({
    nazev: '', ico: '', kontakt: '', telefon: '', email: '',
    technologie: '', poznamka: '', aktivni: 'ano', _novy: true
  });
  renderDodavatele();
}

function dodavateleUlozitRadek(index) {
  dodavateleCollectData();
  const item = ADMIN_STATE.dodavatele[index];
  if (item) { delete item._novy; delete item._ceka; }
  ADMIN_STATE.dodavatele.sort((a, b) => (a.nazev || '').localeCompare(b.nazev || '', 'cs'));
  renderDodavatele();
}

function dodavatelePockatRadek(index) {
  dodavateleCollectData();
  const item = ADMIN_STATE.dodavatele[index];
  if (item) item._ceka = true;
  renderDodavatele();
}

function dodavateleSmazatRadek(index) {
  ADMIN_STATE.dodavatele.splice(index, 1);
  renderDodavatele();
}

function dodavateleCollectData() {
  const rows = document.querySelectorAll('#dodavatele-tbody tr');
  rows.forEach(tr => {
    const idx = parseInt(tr.dataset.index);
    const d = ADMIN_STATE.dodavatele[idx];
    if (!d) return;
    d.nazev      = tr.querySelector('[name="nazev"]').value;
    d.ico        = tr.querySelector('[name="ico"]').value;
    d.kontakt    = tr.querySelector('[name="kontakt"]').value;
    d.telefon    = tr.querySelector('[name="telefon"]').value;
    d.email      = tr.querySelector('[name="email"]').value;
    d.technologie = [...tr.querySelectorAll('[name="tech_cb"]:checked')].map(cb => cb.value).join(', ');
    d.poznamka   = tr.querySelector('[name="poznamka"]').value;
    d.aktivni    = tr.querySelector('[name="aktivni"]').value;
  });
}

async function dodavateleUlozit() {
  dodavateleCollectData();
  ADMIN_STATE.dodavatele.sort((a, b) => (a.nazev || '').localeCompare(b.nazev || '', 'cs'));
  ADMIN_STATE.dodavatele.forEach(r => { delete r._novy; delete r._ceka; });
  const ok = await adminSave('Dodavatele', ADMIN_STATE.dodavatele);
  showStatus('dodavatele-status', ok);
  renderDodavatele();
}

// ── Helper: seznam aktivnich dodavatelu pro dropdown/datalist ──
function getDodavateleList() {
  if (!ADMIN_STATE.dodavatele) return [];
  return ADMIN_STATE.dodavatele
    .filter(d => d.aktivni !== 'ne' && d.nazev)
    .map(d => d.nazev)
    .sort((a, b) => a.localeCompare(b, 'cs'));
}

function aktualizujDodavateleDatalist() {
  let dl = document.getElementById('datalist-dodavatele');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'datalist-dodavatele';
    document.body.appendChild(dl);
  }
  dl.innerHTML = getDodavateleList()
    .map(n => `<option value="${esc(n)}">`)
    .join('');
}
