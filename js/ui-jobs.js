/**
 * ui-jobs.js — Preventivator
 * Rendering e gestione della lista lavorazioni nel tab Lavoro.
 */

import { getJobs, saveJobs, newJob, getMachines, getMaterials, UNIT_LABELS } from './models.js';
import { escapeHtml } from './utils.js';

// ── Card HTML ─────────────────────────────────────────────────────────────────
function buildJobCard(job, index, machines, materials) {
  const is3d         = job.type === '3d';
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
    <div class="job-card type-${job.type}" data-job-id="${job.id}">
      <div class="job-card-head">
        <span class="job-card-num">Lavorazione ${index + 1}</span>
        ${badge}
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
          <input type="text" data-field="extraMaterialLabel" data-id="${job.id}" value="${escapeHtml(job.extraMaterialLabel || '')}" placeholder="Es. Meccanismo orologio, Vite M3, Magnete..." />
        </div>
        <div class="field">
          <label>Costo componente extra (€ tot.)</label>
          <input type="number" min="0" step="0.01" data-field="extraMaterialCost" data-id="${job.id}" value="${job.extraMaterialCost || 0}" placeholder="0.00" />
        </div>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderJobs() {
  const jobs      = getJobs();
  const machines  = getMachines();
  const materials = getMaterials();
  const container = document.getElementById('jobsList');

  if (!jobs.length) {
    container.innerHTML = '<div class="jobs-empty">Nessuna lavorazione aggiunta. Usa i pulsanti qui sotto per aggiungerne una.</div>';
    return;
  }
  container.innerHTML = jobs.map((j, i) => buildJobCard(j, i, machines, materials)).join('');
}

// ── Field change handler ──────────────────────────────────────────────────────
function handleJobFieldChange(e) {
  const el    = e.target;
  const id    = el.dataset.id;
  const field = el.dataset.field;
  if (!id || !field) return;

  const jobs = getJobs();
  const job  = jobs.find(j => j.id === id);
  if (!job) return;

  if (el.type === 'number')   job[field] = Number(el.value) || 0;
  else if (el.type === 'checkbox') job[field] = el.checked;
  else                        job[field] = el.value;

  saveJobs(jobs);
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initJobsHandlers() {
  const container = document.getElementById('jobsList');

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const id   = btn.dataset.remove;
    const jobs = getJobs().filter(j => j.id !== id);
    saveJobs(jobs);
    renderJobs();
  });

  container.addEventListener('input',  handleJobFieldChange);
  container.addEventListener('change', handleJobFieldChange);

  document.getElementById('addJob3d').addEventListener('click', () => {
    const jobs = getJobs();
    jobs.push(newJob('3d'));
    saveJobs(jobs);
    renderJobs();
  });

  document.getElementById('addJobLaser').addEventListener('click', () => {
    const jobs = getJobs();
    jobs.push(newJob('laser'));
    saveJobs(jobs);
    renderJobs();
  });
}
