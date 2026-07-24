/**
 * ui-materials.js — Preventivator
 * Rendering e gestione del form materiali (async), con supporto modifica.
 */

import { saveData, STORAGE_KEYS }                       from './storage.js';
import { getMaterials, normalizeMaterial, UNIT_LABELS } from './models.js';
import { currency, escapeHtml, showSaved, showUndoToast } from './utils.js';
import { renderJobs }                                   from './ui-jobs.js';

let editingMaterialId = null;

export async function renderMaterials() {
  const materials    = await getMaterials();
  const materialList = document.getElementById('materialList');

  materialList.innerHTML = materials.length
    ? materials.map(m => `<div class="item">
        <div class="item-head">
          <div>
            <div class="item-name">${escapeHtml(m.name)} <span class="badge ${m.type === '3d' ? 'blue' : 'amber'}">${m.type === '3d' ? '3D' : 'Laser'}</span></div>
            <div class="muted">${currency.format(Number(m.unitCost || 0))} / ${UNIT_LABELS[m.unit] || m.unit}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="secondary" type="button" data-material-edit="${m.id}" style="padding:6px 12px;font-size:12.5px;">✏️ Modifica</button>
            <button class="danger" type="button" data-material-remove="${m.id}">Elimina</button>
          </div>
        </div>
      </div>`).join('')
    : '<div class="empty">Nessun materiale salvato.</div>';

  await renderJobs();
}

export function updateMaterialFormUI() {
  const materialType      = document.getElementById('materialType');
  const materialUnit      = document.getElementById('materialUnit');
  const materialCostLabel = document.getElementById('materialCostLabel');
  const type              = materialType.value;
  if (type === '3d') {
    materialUnit.value    = 'kg';
    materialUnit.disabled = true;
    materialCostLabel.textContent = 'Costo per kg (€)';
  } else {
    materialUnit.disabled = false;
    materialCostLabel.textContent = `Costo per ${UNIT_LABELS[materialUnit.value] || materialUnit.value} (€)`;
  }
}

function fillMaterialForm(m) {
  document.getElementById('materialType').value = m.type;
  updateMaterialFormUI();
  document.getElementById('materialUnit').value = m.unit;
  document.getElementById('materialUnit').disabled = m.type === '3d';
  document.getElementById('materialName').value = m.name;
  document.getElementById('materialCost').value = m.unitCost;
  document.getElementById('materialCostLabel').textContent = `Costo per ${UNIT_LABELS[m.unit] || m.unit} (€)`;
}

function enterEditMode(m) {
  editingMaterialId = m.id;
  fillMaterialForm(m);
  document.getElementById('materialFormTitle').textContent = `Modifica "${m.name}"`;
  document.getElementById('materialSubmitBtn').textContent = 'Salva modifiche';
  document.getElementById('cancelMaterialEdit').style.display = 'inline-flex';
  document.getElementById('materialForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exitEditMode() {
  editingMaterialId = null;
  document.getElementById('materialForm').reset();
  document.getElementById('materialType').value = '3d';
  updateMaterialFormUI();
  document.getElementById('materialFormTitle').textContent = 'Aggiungi materiale';
  document.getElementById('materialSubmitBtn').textContent = 'Salva materiale';
  document.getElementById('cancelMaterialEdit').style.display = 'none';
}

export function initMaterialsHandlers() {
  const materialList = document.getElementById('materialList');
  const materialForm = document.getElementById('materialForm');

  materialList.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-material-edit]');
    if (editBtn) {
      const materials = await getMaterials();
      const m = materials.find(x => x.id === editBtn.dataset.materialEdit);
      if (m) enterEditMode(m);
      return;
    }

    const btn = e.target.closest('[data-material-remove]');
    if (!btn) return;
    const materials = await getMaterials();
    const target    = materials.find(m => m.id === btn.dataset.materialRemove);
    if (!target) return;
    if (editingMaterialId === target.id) exitEditMode();
    await saveData(STORAGE_KEYS.materials, materials.filter(m => m.id !== target.id));
    await renderMaterials();
    showUndoToast(`Materiale "${target.name}" eliminato.`, async () => {
      const current = await getMaterials();
      await saveData(STORAGE_KEYS.materials, [...current, target]);
      await renderMaterials();
    });
  });

  document.getElementById('cancelMaterialEdit').addEventListener('click', exitEditMode);

  materialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const materials = await getMaterials();
    const values = {
      type:     document.getElementById('materialType').value,
      unit:     document.getElementById('materialUnit').value,
      name:     document.getElementById('materialName').value.trim(),
      unitCost: Number(document.getElementById('materialCost').value),
    };

    if (editingMaterialId) {
      const idx = materials.findIndex(m => m.id === editingMaterialId);
      if (idx !== -1) materials[idx] = normalizeMaterial({ id: editingMaterialId, ...values });
      await saveData(STORAGE_KEYS.materials, materials);
      exitEditMode();
      await renderMaterials();
      showSaved('materialSaved');
      return;
    }

    materials.push(normalizeMaterial({ id: crypto.randomUUID(), ...values }));
    await saveData(STORAGE_KEYS.materials, materials);
    materialForm.reset();
    document.getElementById('materialType').value = '3d';
    updateMaterialFormUI();
    await renderMaterials();
    showSaved('materialSaved');
  });

  document.getElementById('resetMaterials').addEventListener('click', async () => {
    const backup = await getMaterials();
    exitEditMode();
    await saveData(STORAGE_KEYS.materials, []);
    await renderMaterials();
    showUndoToast('Tutti i materiali eliminati.', async () => {
      await saveData(STORAGE_KEYS.materials, backup);
      await renderMaterials();
    });
  });

  document.getElementById('materialType').addEventListener('change', updateMaterialFormUI);
  document.getElementById('materialUnit').addEventListener('change', updateMaterialFormUI);
}
