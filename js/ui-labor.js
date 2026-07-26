/**
 * ui-labor.js — Preventivator
 * Gestione della lista "voci di manodopera" (preparazione e post-produzione):
 * ogni voce ha un tipo/nota, ore e una propria tariffa oraria.
 */

import { getLaborEntries, saveLaborEntries, newLaborEntry } from './models.js';
import { currency, escapeHtml, showUndoToast }              from './utils.js';

function buildLaborRow(entry, index) {
  return `
    <div class="job-card" data-labor-id="${entry.id}" style="margin-bottom:8px;">
      <div class="job-card-head">
        <span class="job-card-num">Voce ${index + 1}</span>
        <button class="job-card-remove" type="button" data-labor-remove="${entry.id}" title="Rimuovi">✕ Rimuovi</button>
      </div>
      <div class="form-grid">
        <div class="field full">
          <label>Tipo di lavoro / Nota</label>
          <input type="text" data-labor-field="label" data-labor-id="${entry.id}" value="${escapeHtml(entry.label || '')}" placeholder="Es. Modellazione 3D, Verniciatura, Assemblaggio..." />
        </div>
        <div class="field">
          <label>Ore</label>
          <input type="number" min="0" step="0.01" data-labor-field="hours" data-labor-id="${entry.id}" value="${entry.hours || 0}" />
        </div>
        <div class="field">
          <label>Costo orario (€)</label>
          <input type="number" min="0" step="0.01" data-labor-field="rate" data-labor-id="${entry.id}" value="${entry.rate || 0}" />
        </div>
      </div>
      <div class="muted" style="margin-top:4px;">Subtotale: ${currency.format(Number(entry.hours || 0) * Number(entry.rate || 0))}</div>
    </div>`;
}

export async function renderLaborEntries() {
  const entries   = await getLaborEntries();
  const container = document.getElementById('laborEntriesList');
  if (!container) return;
  container.innerHTML = entries.length
    ? entries.map((e, i) => buildLaborRow(e, i)).join('')
    : '<div class="empty">Nessuna voce di manodopera aggiunta. Usa il pulsante qui sotto per aggiungerne una (facoltativo).</div>';
}

export function initLaborHandlers() {
  const container = document.getElementById('laborEntriesList');
  if (!container) return;

  document.getElementById('addLaborEntry')?.addEventListener('click', async () => {
    const entries = await getLaborEntries();
    entries.push(newLaborEntry());
    await saveLaborEntries(entries);
    await renderLaborEntries();
  });

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-labor-remove]');
    if (!btn) return;
    const entries = await getLaborEntries();
    const idx     = entries.findIndex(x => x.id === btn.dataset.laborRemove);
    if (idx === -1) return;
    const target  = entries[idx];
    const label   = target.label || `Voce ${idx + 1}`;
    entries.splice(idx, 1);
    await saveLaborEntries(entries);
    await renderLaborEntries();
    showUndoToast(`"${label}" eliminata.`, async () => {
      const current = await getLaborEntries();
      current.splice(idx, 0, target);
      await saveLaborEntries(current);
      await renderLaborEntries();
    });
  });

  container.addEventListener('input', async (e) => {
    const field = e.target.closest('[data-labor-field]');
    if (!field) return;
    const entries = await getLaborEntries();
    const entry   = entries.find(x => x.id === field.dataset.laborId);
    if (!entry) return;
    const key = field.dataset.laborField;
    entry[key] = field.type === 'number' ? Number(field.value) || 0 : field.value;
    await saveLaborEntries(entries);
    if (key === 'hours' || key === 'rate') {
      const subtotalEl = field.closest('.job-card').querySelector('.muted');
      if (subtotalEl) subtotalEl.textContent = `Subtotale: ${currency.format(Number(entry.hours || 0) * Number(entry.rate || 0))}`;
    }
  });
}
