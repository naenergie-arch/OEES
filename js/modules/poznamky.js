/**
 * OEES Modul: Poznamky, Obsah produktu, Kontakt EP
 * Poznamky do studie, dodatek k objednavce, PD pro FVE/TC/vodu,
 * inzenyring, kontakt EP (zobrazeni, jmeno, telefon, email)
 */

'use strict';

// ─── Inicializace modulu ────────────────────────────────────────────────────

function inicializujModulPoznamky(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span class="icon">&#128221;</span> Poznamky a doplnujici informace
      </div>

      <div class="field">
        <label>Poznamky do studie</label>
        <textarea id="pozn_studie" rows="4" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.9rem;resize:vertical"
          placeholder="Specialni pozadavky, omezeni, poznamky k projektu..."></textarea>
      </div>

      <div class="field">
        <label>Dodatek k objednavce</label>
        <textarea id="pozn_dodatek" rows="3" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:0.9rem;resize:vertical"
          placeholder="Specialni smluvni podminky, dodatky..."></textarea>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span class="icon">&#128196;</span> Obsah produktu / sluzeb
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_pd_fve" checked>
          Projektova dokumentace – FVE
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_pd_tc">
          Projektova dokumentace – TC
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_pd_voda">
          Projektova dokumentace – Voda
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_pd_kogenerace">
          Projektova dokumentace – KGJ
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_pd_kotel">
          Projektova dokumentace – Plynovy kotel
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_inzenyring">
          Inzenyring (stavebni povoleni, povoleni ERU, ...)
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_energeticky_audit">
          Energeticky audit / prukaz
        </label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="obs_dotacni_management">
          Dotacni management
        </label>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span class="icon">&#128100;</span> Kontakt EP (energeticky poradce)
      </div>

      <div class="form-grid-2">
        <div class="field">
          <label>Zobrazit kontakt EP ve studii</label>
          <select id="ep_zobrazit">
            <option value="ano">Ano</option>
            <option value="ne">Ne</option>
          </select>
        </div>
        <div class="field">
          <label>Jmeno EP</label>
          <input type="text" id="ep_jmeno" placeholder="Jmeno Prijmeni">
        </div>
        <div class="field">
          <label>Telefon EP</label>
          <input type="tel" id="ep_telefon" placeholder="+420 ...">
        </div>
        <div class="field">
          <label>Email EP</label>
          <input type="email" id="ep_email" placeholder="ep@naenergie.cz">
        </div>
      </div>
    </div>`;

  // Nacti data do stavu pri odchodu z panelu
  container.addEventListener('change', () => uložPoznamky());
}

function uložPoznamky() {
  OEES_STATE.case.poznamky = {
    studie: document.getElementById('pozn_studie')?.value || '',
    dodatek: document.getElementById('pozn_dodatek')?.value || '',
    obsah: {
      pd_fve: document.getElementById('obs_pd_fve')?.checked || false,
      pd_tc: document.getElementById('obs_pd_tc')?.checked || false,
      pd_voda: document.getElementById('obs_pd_voda')?.checked || false,
      pd_kogenerace: document.getElementById('obs_pd_kogenerace')?.checked || false,
      pd_kotel: document.getElementById('obs_pd_kotel')?.checked || false,
      inzenyring: document.getElementById('obs_inzenyring')?.checked || false,
      energeticky_audit: document.getElementById('obs_energeticky_audit')?.checked || false,
      dotacni_management: document.getElementById('obs_dotacni_management')?.checked || false
    },
    ep: {
      zobrazit: document.getElementById('ep_zobrazit')?.value || 'ne',
      jmeno: document.getElementById('ep_jmeno')?.value || '',
      telefon: document.getElementById('ep_telefon')?.value || '',
      email: document.getElementById('ep_email')?.value || ''
    }
  };
}
