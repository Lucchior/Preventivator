/**
 * ui-machines.js — Preventivator
 * Rendering e gestione del form macchine (async).
 */

import { saveData, STORAGE_KEYS }            from './storage.js';
import { getMachines, normalizeMachine }      from './models.js';
import { currency, num, escapeHtml, showSaved, showUndoToast } from './utils.js';
import { renderJobs }                         from './ui-jobs.js';

export async function renderMachines() {
  const machines    = await getMachines();
  const machineList = document.getElementById('machineList');

  machineList.innerHTML = machines.length
    ? machines.map(m => {
        const amortH  = Number(m.lifetimeHours) > 0 ? Number(m.machineCost || 0) / Number(m.lifetimeHours) : 0;
        const energyH = (Number(m.powerKwh || 0) / Math.max(Number(m.powerEveryH || 1), 0.001)) * Number(m.energyCost || 0);
        return `<div class="item">
          <div class="item-head">
            <div>
              <div class="item-name">${escapeHtml(m.name)} <span class="badge ${m.type === '3d' ? 'blue' : 'amber'}">${m.type === '3d' ? 'Stampa 3D' : 'Laser'}</span></div>
              <div class="muted">Costo macchina: ${currency.format(Number(m.machineCost || 0))} — vita utile: ${num.format(Number(m.lifetimeHours || 0))} h</div>
            </div>
            <button class="danger" type="button" data-machine-remove="${m.id}">Elimina</button>
          </div>
          <div class="stats">
            <div class="stat"><div class="k">Ammortamento/h</div><div class="v">${currency.format(amortH)}</div></div>
            <div class="stat"><div class="k">Consumo</div><div class="v">${num.format(Number(m.powerKwh || 0))} kWh ogni ${num.format(Number(m.powerEveryH || 1))} h</div></div>
            <div class="stat"><div class="k">Costo energia/h</div><div class="v">${currency.format(energyH)}</div></div>
            <div class="stat"><div class="k">Manut. 1000h</div><div class="v">${currency.format(Number(m.maintenanceCost || 0))}</div></div>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty">Nessuna macchina salvata.</div>';

  await renderJobs();
}


export function initMachinesHandlers() {
  const machineList = document.getElementById('machineList');
  const machineForm = document.getElementById('machineForm');

  machineList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-machine-remove]');
    if (!btn) return;
    const machines  = await getMachines();
    const target    = machines.find(m => m.id === btn.dataset.machineRemove);
    if (!target) return;
    const confirmed = await showUndoToast(`Macchina "${target.name}" eliminata.`);
    if (confirmed) {
      await saveData(STORAGE_KEYS.machines, machines.filter(m => m.id !== target.id));
      await renderMachines();
    }
  });

  machineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const machines = await getMachines();
    machines.push(normalizeMachine({
      id:              crypto.randomUUID(),
      type:            document.getElementById('machineType').value,
      name:            document.getElementById('machineName').value.trim(),
      machineCost:     Number(document.getElementById('machineCost').value),
      lifetimeHours:   Number(document.getElementById('lifetimeHours').value),
      energyCost:      Number(document.getElementById('energyCost').value),
      powerKwh:        Number(document.getElementById('powerKwh').value),
      powerEveryH:     Number(document.getElementById('powerEveryH').value) || 1,
      maintenanceCost: Number(document.getElementById('maintenanceCost').value),
    }));
    await saveData(STORAGE_KEYS.machines, machines);
    machineForm.reset();
    document.getElementById('machineType').value = '3d';
    await renderMachines();
    showSaved('machineSaved');
  });

  document.getElementById('resetMachines').addEventListener('click', async () => {
    const confirmed = await showUndoToast('Tutte le macchine eliminate.');
    if (confirmed) { await saveData(STORAGE_KEYS.machines, []); await renderMachines(); }
  });
}
