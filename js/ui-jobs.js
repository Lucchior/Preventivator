/**
 * ui-jobs.js — Preventivator
 * Rendering e gestione della lista lavorazioni (async).
 */

import { getJobs, saveJobs, newJob, getMachines, getMaterials, UNIT_LABELS } from './models.js';
import { escapeHtml, showUndoToast } from './utils.js';
import { loadData, saveData, STORAGE_KEYS } from './storage.js';

// ── Template lavorazione ──────────────────────────────────────────────────────
async function getTemplates() {
  return loadData(STORAGE_KEYS.templates, []);
}
async function saveTemplates(list) {
  return saveData(STORAGE_KEYS.templates, list);
}

/** Estrae dal job i soli campi "riutilizzabili" (esclude quantità/ripetizioni). */
function extractTemplateFields(job) {
  const { id, unitCount, ...reusable } = job;
  return reusable;
}

function buildJobCard(job, index, machines, materials) {
  const is3d          = job.type === '3d';
  const typeMachines  = machines.filter(m => m.type === job.type);
  const typeMaterials = materials.filter(m => m.type === job.type);
  const machineOptions = typeMachines.map(m =>
    `<option value="${m.id}" ${m.id === job.machineId ? 'selected' : ''}>${escapeHtml(m.name)}</option>`
  ).join('');
  const materialOptions = typeMaterials.map(m =>
    `<option value="${m.id}" ${m.id === job.materialId ? 'selected' : ''}>${escapeHtml(m.name)}${m.type === 'laser' ? ' (' + (UNIT_LABELS[m.unit] || m.unit) + ')' : ''}</option>`
  ).join('');
  const unitLabel = is3d ? 'piatto' : 'lavorazione';
  const badge     = is3d
    ? '<span class="badge blue">Stampa 3D</span>'
    : '<span class="badge amber">Laser</span>';

  return `
    <div class="job-card type-${job.type}" data-job-id="${job.id}" draggable="true">
      <div class="job-card-head">
        <span class="job-drag-handle" title="Trascina per riordinare">⠿</span>
        <span class="job-card-num">Lavorazione ${index + 1}</span>
        ${badge}
        <button class="job-card-remove" type="button" data-save-template="${job.id}" title="Salva come template riutilizzabile" style="color:var(--accent);">💾 Template</button>
        <button class="job-card-remove" type="button" data-remove="${job.id}" title="Rimuovi">✕ Rimuovi</button>
      </div>
      <div class="form-grid">
        <div class="field">
          <label>Descrizione (opzionale)</label>
          <input type="text" data-field="label" data-id="${job.id}" value="${escapeHtml(job.label || '')}" placeholder="Es. Piatti PLA neri, Lastre MDF..." />
        </div>
        <div class="field"></div>
        <div class="field">
          <label>Macchina ${is3d ? '3D' : 'laser'}</label>
          <select data-field="machineId" data-id="${job.id}">
            <option value="">— Seleziona —</option>${machineOptions}
          </select>
        </div>
        <div class="field">
          <label>Materiale ${is3d ? '3D' : 'laser'}</label>
          <select data-field="materialId" data-id="${job.id}">
            <option value="">— Seleziona —</option>${materialOptions}
          </select>
        </div>
        <div class="field">
          <label>Pezzi per ${unitLabel}</label>
          <input type="number" min="1" step="1" data-field="piecesPerUnit" data-id="${job.id}" value="${job.piecesPerUnit || 1}" />
        </div>
        <div class="field">
          <label>Numero ${unitLabel === 'piatto' ? 'piatti' : 'lavorazioni'} (ripetizioni)</label>
          <input type="number" min="1" step="1" data-field="unitCount" data-id="${job.id}" value="${job.unitCount || 1}" />
        </div>
        ${is3d ? `
        <div class="field">
          <label>Materiale per piatto (g)</label>
          <input type="number" min="0" step="0.01" data-field="gramsPerUnit" data-id="${job.id}" value="${job.gramsPerUnit || 0}" placeholder="0.00" />
        </div>` : `
        <div class="field">
          <label>Quantità materiale per lavorazione</label>
          <input type="number" min="0" step="0.01" data-field="materialQtyPerUnit" data-id="${job.id}" value="${job.materialQtyPerUnit || 0}" placeholder="0.00" />
        </div>`}
        <div class="field full">
          <label>Durata per ${unitLabel}</label>
          <div class="inline-fields">
            <input type="number" min="0" step="1" style="width:60px;" data-field="days"    data-id="${job.id}" value="${job.days    || 0}" />
            <span class="inline-label">g</span>
            <input type="number" min="0" max="23" step="1" style="width:60px;" data-field="hours"   data-id="${job.id}" value="${job.hours   || 0}" />
            <span class="inline-label">h</span>
            <input type="number" min="0" max="59" step="1" style="width:60px;" data-field="minutes" data-id="${job.id}" value="${job.minutes || 0}" />
            <span class="inline-label">min</span>
          </div>
        </div>
        <div class="field">
          <label>Materiale/componente extra (opzionale)</label>
          <input type="text" data-field="extraMaterialLabel" data-id="${job.id}" value="${escapeHtml(job.extraMaterialLabel || '')}" placeholder="Es. Meccanismo orologio, Vite M3..." />
        </div>
        <div class="field">
          <label>Costo componente extra (€ tot.)</label>
          <input type="number" min="0" step="0.01" data-field="extraMaterialCost" data-id="${job.id}" value="${job.extraMaterialCost || 0}" placeholder="0.00" />
        </div>
      </div>
    </div>`;
}

export async function renderJobs() {
  const [jobs, machines, materials] = await Promise.all([
    getJobs(), getMachines(), getMaterials(),
  ]);
  console.log('[DEBUG] renderJobs() popola i menu con:', machines.map(m => `${m.name} (${m.id})`));
  const container = document.getElementById('jobsList');
  if (!jobs.length) {
    container.innerHTML = '<div class="jobs-empty">Nessuna lavorazione aggiunta. Usa i pulsanti qui sotto per aggiungerne una.</div>';
  } else {
    container.innerHTML = jobs.map((j, i) => buildJobCard(j, i, machines, materials)).join('');
  }
  await renderTemplateSelect();
}

async function renderTemplateSelect() {
  const select = document.getElementById('templateSelect');
  if (!select) return;
  const templates = await getTemplates();
  select.innerHTML = '<option value="">📋 Da template salvato…</option>' + templates.map(t =>
    `<option value="${t.id}">${t.type === '3d' ? '🖨️' : '🔦'} ${escapeHtml(t.name)}</option>`
  ).join('');
}

async function handleJobFieldChange(e) {
  const el    = e.target;
  const id    = el.dataset.id;
  const field = el.dataset.field;
  if (!id || !field) return;
  const jobs = await getJobs();
  const job  = jobs.find(j => j.id === id);
  if (!job) return;
  if (el.type === 'number')        job[field] = Number(el.value) || 0;
  else if (el.type === 'checkbox') job[field] = el.checked;
  else                             job[field] = el.value;
  await saveJobs(jobs);
}

// ── Drag & drop riordino ──────────────────────────────────────────────────────
let dragSourceId = null;

function initDragAndDrop(container) {
  container.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.job-card');
    if (!card) return;
    dragSourceId = card.dataset.jobId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragend', (e) => {
    e.target.closest('.job-card')?.classList.remove('dragging');
    dragSourceId = null;
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const card = e.target.closest('.job-card');
    if (!card || card.dataset.jobId === dragSourceId) return;
    card.classList.add('drag-over');
  });

  container.addEventListener('dragleave', (e) => {
    e.target.closest('.job-card')?.classList.remove('drag-over');
  });

  container.addEventListener('drop', async (e) => {
    e.preventDefault();
    const targetCard = e.target.closest('.job-card');
    container.querySelectorAll('.job-card').forEach(c => c.classList.remove('drag-over'));
    if (!targetCard || !dragSourceId || targetCard.dataset.jobId === dragSourceId) return;

    const jobs = await getJobs();
    const fromIdx = jobs.findIndex(j => j.id === dragSourceId);
    const toIdx   = jobs.findIndex(j => j.id === targetCard.dataset.jobId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = jobs.splice(fromIdx, 1);
    jobs.splice(toIdx, 0, moved);
    await saveJobs(jobs);
    await renderJobs();
  });
}

export function initJobsHandlers() {
  const container = document.getElementById('jobsList');

  container.addEventListener('click', async (e) => {
    // ── Salva come template ──
    const tplBtn = e.target.closest('[data-save-template]');
    if (tplBtn) {
      const jobs = await getJobs();
      const job  = jobs.find(j => j.id === tplBtn.dataset.saveTemplate);
      if (!job) return;
      const name = prompt('Nome del template (es. "PLA nero standard"):', job.label || '');
      if (!name || !name.trim()) return;
      const templates = await getTemplates();
      templates.push({ id: crypto.randomUUID(), name: name.trim(), type: job.type, fields: extractTemplateFields(job) });
      await saveTemplates(templates);
      await renderTemplateSelect();
      alert(`Template "${name.trim()}" salvato. Lo trovi nel menu "📋 Da template salvato…".`);
      return;
    }

    // ── Rimuovi lavorazione ──
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const id   = btn.dataset.remove;
    const jobs = await getJobs();
    const target = jobs.find(j => j.id === id);
    const idx    = jobs.findIndex(j => j.id === id);
    const label  = target?.label || `Lavorazione ${idx + 1}`;
    await saveJobs(jobs.filter(j => j.id !== id));
    await renderJobs();
    showUndoToast(`"${label}" eliminata.`, async () => {
      const current = await getJobs();
      current.splice(idx, 0, target);
      await saveJobs(current);
      await renderJobs();
    });
  });

  container.addEventListener('input',  handleJobFieldChange);
  container.addEventListener('change', handleJobFieldChange);
  initDragAndDrop(container);

  document.getElementById('addJob3d').addEventListener('click', async () => {
    const jobs = await getJobs();
    jobs.push(newJob('3d'));
    await saveJobs(jobs);
    await renderJobs();
  });

  document.getElementById('addJobLaser').addEventListener('click', async () => {
    const jobs = await getJobs();
    jobs.push(newJob('laser'));
    await saveJobs(jobs);
    await renderJobs();
  });

  document.getElementById('templateSelect').addEventListener('change', async (e) => {
    const tplId = e.target.value;
    if (!tplId) return;
    const templates = await getTemplates();
    const tpl = templates.find(t => t.id === tplId);
    e.target.value = '';
    if (!tpl) return;
    const jobs = await getJobs();
    const job  = { ...newJob(tpl.type), ...tpl.fields };
    jobs.push(job);
    await saveJobs(jobs);
    await renderJobs();
  });
}
