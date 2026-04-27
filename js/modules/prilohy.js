/**
 * OEES Modul: Přílohy ke studiím
 * Max 15 příloh (ID: Příloha C – Příloha Q)
 * Každá příloha: číslo, název, URL, zahrnutí do předběžné/finální studie
 */

'use strict';

function inicializujModulPrilohy(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!OEES_STATE.case.prilohy || OEES_STATE.case.prilohy.length !== 15) {
    OEES_STATE.case.prilohy = Array.from({ length: 15 }, (_, i) => ({
      idx:      i,
      pismeno:  String.fromCharCode(67 + i), // C=67 → C,D,E,...,Q
      nazev:    '',
      url:      '',
      predbezna: false,
      finalni:  false
    }));
  }

  renderModulPrilohy(containerId);
}

function renderModulPrilohy(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const prilohy = OEES_STATE.case.prilohy;
  const pocetP = prilohy.filter(p => p.predbezna && p.nazev).length;
  const pocetF = prilohy.filter(p => p.finalni  && p.nazev).length;

  const radky = prilohy.map((p, i) => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06)">
      <td style="padding:8px 10px;text-align:center;color:#888;font-size:0.82rem;white-space:nowrap">
        <strong>${i + 1}</strong><br>
        <span style="font-size:0.72rem;color:#666">Příl.${p.pismeno}</span>
      </td>
      <td style="padding:6px 8px">
        <input type="text" id="pril_nazev_${i}"
          value="${p.nazev || ''}"
          placeholder="Název přílohy..."
          oninput="aktualizujPrilohu(${i})"
          style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);
                 border-radius:4px;padding:6px 9px;color:inherit;font-family:inherit;font-size:0.87rem">
      </td>
      <td style="padding:6px 8px">
        <input type="url" id="pril_url_${i}"
          value="${p.url || ''}"
          placeholder="https://drive.google.com/..."
          oninput="aktualizujPrilohu(${i})"
          style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);
                 border-radius:4px;padding:6px 9px;color:inherit;font-family:inherit;font-size:0.82rem">
      </td>
      <td style="padding:6px 10px;text-align:center">
        <label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:0.75rem">
          <input type="checkbox" id="pril_pre_${i}"
            ${p.predbezna ? 'checked' : ''}
            onchange="aktualizujPrilohu(${i})">
          <span style="opacity:0.7">Předběžná</span>
        </label>
      </td>
      <td style="padding:6px 10px;text-align:center">
        <label style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:0.75rem">
          <input type="checkbox" id="pril_fin_${i}"
            ${p.finalni ? 'checked' : ''}
            onchange="aktualizujPrilohu(${i})">
          <span style="opacity:0.7">Finální</span>
        </label>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-title"><span class="icon">📎</span> Přílohy ke studiím</div>

      <p style="font-size:0.84rem;opacity:0.7;margin-bottom:20px;line-height:1.5">
        Ke každé studii můžete přiložit až 15 příloh (Příloha C až Q). Vložte název,
        URL odkaz (Google Drive, OneDrive, web…) a zaškrtněte, do které studie příloha patří.
        Přílohy se zobrazí jako klikatelné odkazy na konci studie.
      </p>

      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div class="result-box" style="flex:1;text-align:center">
          <div class="val" id="pril_pocet_pre">${pocetP}</div>
          <div class="lbl">Předběžná studie (max 15)</div>
        </div>
        <div class="result-box" style="flex:1;text-align:center">
          <div class="val" id="pril_pocet_fin">${pocetF}</div>
          <div class="lbl">Finální studie (max 15)</div>
        </div>
      </div>

      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
        <table style="width:100%;border-collapse:collapse;min-width:580px">
          <thead>
            <tr style="background:rgba(255,255,255,0.07);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.04em">
              <th style="padding:10px;text-align:center;width:56px">č./ID</th>
              <th style="padding:10px;text-align:left">Název přílohy</th>
              <th style="padding:10px;text-align:left">URL adresa (odkaz)</th>
              <th style="padding:10px;text-align:center;width:90px">📄 Předběžná</th>
              <th style="padding:10px;text-align:center;width:90px">📋 Finální</th>
            </tr>
          </thead>
          <tbody>${radky}</tbody>
        </table>
      </div>

      <div class="doporuceni" style="margin-top:20px;font-size:0.82rem;opacity:0.85">
        <strong>💡 Tipy:</strong>
        Ukládejte přílohy do Google Drive nebo OneDrive a sdílejte odkaz.
        Pro PDF studie: nahrajte soubory veřejně přístupné.
        Přílohy se vloží do studie jako číslovaný seznam s klikatelným odkazem.
      </div>
    </div>
  `;
}

function aktualizujPrilohu(i) {
  if (!OEES_STATE.case.prilohy || i < 0 || i >= 15) return;

  OEES_STATE.case.prilohy[i] = {
    ...OEES_STATE.case.prilohy[i],
    nazev:    document.getElementById(`pril_nazev_${i}`)?.value || '',
    url:      document.getElementById(`pril_url_${i}`)?.value  || '',
    predbezna: document.getElementById(`pril_pre_${i}`)?.checked || false,
    finalni:  document.getElementById(`pril_fin_${i}`)?.checked || false
  };

  // Aktualizuj počty
  const prilohy = OEES_STATE.case.prilohy;
  const pocetP = prilohy.filter(p => p.predbezna && p.nazev).length;
  const pocetF = prilohy.filter(p => p.finalni  && p.nazev).length;

  const elP = document.getElementById('pril_pocet_pre');
  const elF = document.getElementById('pril_pocet_fin');
  if (elP) elP.textContent = pocetP;
  if (elF) elF.textContent = pocetF;
}
