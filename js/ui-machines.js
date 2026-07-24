/**
 * ui-machines.js — Preventivator
 * Rendering e gestione del form macchine (async), con supporto modifica.
 */

import { saveData, STORAGE_KEYS }            from './storage.js';
import { getMachines, normalizeMachine }      from './models.js';
import { currency, num, escapeHtml, showSaved, showUndoToast } from './utils.js';
import { renderJobs }                         from './ui-jobs.js';

let editingMachineId = null;

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
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <button class="secondary" type="button" data-machine-edit="${m.id}" style="padding:6px 12px;font-size:12.5px;">✏️ Modifica</button>
              <button class="danger" type="button" data-machine-remove="${m.id}">Elimina</button>
            </div>
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

function fillMachineForm(m) {
  document.getElementById('machineType').value        = m.type;
  document.getElementById('machineName').value         = m.name;
  document.getElementById('machineCost').value         = m.machineCost;
  document.getElementById('lifetimeHours').value       = m.lifetimeHours;
  document.getElementById('energyCost').value           = m.energyCost;
  document.getElementById('powerKwh').value             = m.powerKwh;
  document.getElementById('powerEveryH').value          = m.powerEveryH;
  document.getElementById('maintenanceCost').value      = m.maintenanceCost;
}

function enterEditMode(m) {
  editingMachineId = m.id;
  fillMachineForm(m);
  document.getElementById('machineFormTitle').textContent = `Modifica "${m.name}"`;
  document.getElementById('machineSubmitBtn').textContent = 'Salva modifiche';
  document.getElementById('cancelMachineEdit').style.display = 'inline-flex';
  document.getElementById('machineForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitEditMode() {
  editingMachineId = null;
  document.getElementById('machineForm').reset();
  document.getElementById('machineType').value = '3d';
  document.getElementById('machineFormTitle').textContent = 'Aggiungi macchina';
  document.getElementById('machineSubmitBtn').textContent = 'Salva macchina';
  document.getElementById('cancelMachineEdit').style.display = 'none';
}

export function initMachinesHandlers() {
  const machineList = document.getElementById('machineList');
  const machineForm = document.getElementById('machineForm');

  machineList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-machine-edit]');
    if (editBtn) {
      const machines = await getMachines();
      const m = machines.find(x => x.id === editBtn.dataset.machineEdit);
      if (m) enterEditMode(m);
      return;
    }

    const btn = e.target.closest('[data-machine-remove]');
    if (!btn) return;
    const machines  = await getMachines();
    const target    = machines.find(m => m.id === btn.dataset.machineRemove);
    if (!target) return;
    if (editingMachineId === target.id) exitEditMode();
    await saveData(STORAGE_KEYS.machines, machines.filter(m => m.id !== target.id));
    await renderMachines();
    showUndoToast(`Macchina "${target.name}" eliminata.`, async () => {
      const current = await getMachines();
      await saveData(STORAGE_KEYS.machines, [...current, target]);
      await renderMachines();
    });
  });

  document.getElementById('cancelMachineEdit').addEventListener('click', exitEditMode);

  machineForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const machines = await getMachines();
    const values = {
      type:            document.getElementById('machineType').value,
      name:            document.getElementById('machineName').value.trim(),
      machineCost:     Number(document.getElementById('machineCost').value),
      lifetimeHours:   Number(document.getElementById('lifetimeHours').value),
      energyCost:      Number(document.getElementById('energyCost').value),
      powerKwh:        Number(document.getElementById('powerKwh').value),
      powerEveryH:     Number(document.getElementById('powerEveryH').value) || 1,
      maintenanceCost: Number(document.getElementById('maintenanceCost').value),
    };

    if (editingMachineId) {
      const idx = machines.findIndex(m => m.id === editingMachineId);
      if (idx !== -1) machines[idx] = normalizeMachine({ id: editingMachineId, ...values });
      await saveData(STORAGE_KEYS.machines, machines);
      exitEditMode();
      await renderMachines();
      showSaved('machineSaved');
      return;
    }

    machines.push(normalizeMachine({ id: crypto.randomUUID(), ...values }));
    await saveData(STORAGE_KEYS.machines, machines);
    machineForm.reset();
    document.getElementById('machineType').value = '3d';
    await renderMachines();
    showSaved('machineSaved');
  });

  document.getElementById('resetMachines').addEventListener('click', async () => {
    const backup = await getMachines();
    exitEditMode();
    await saveData(STORAGE_KEYS.machines, []);
    await renderMachines();
    showUndoToast('Tutte le macchine eliminate.', async () => {
      await saveData(STORAGE_KEYS.machines, backup);
      await renderMachines();
    });
  });
}
