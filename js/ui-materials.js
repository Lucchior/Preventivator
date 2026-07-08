/**
 * ui-materials.js — Preventivator
 * Rendering e gestione del form materiali (async).
 */

import { saveData, STORAGE_KEYS }                       from './storage.js';
import { getMaterials, normalizeMaterial, UNIT_LABELS } from './models.js';
import { currency, escapeHtml, showSaved }              from './utils.js';
import { renderJobs }                                   from './ui-jobs.js';

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
          <button class="danger" type="button" data-material-remove="${m.id}">Elimina</button>
        </div>
      </div>`).join('')
    : '<div class="empty">Nessun materiale salvato.</div>';

  await renderJobs();
}

async function removeMaterial(id) {
  const materials = await getMaterials();
  await saveData(STORAGE_KEYS.materials, materials.filter(m => m.id !== id));
  await renderMaterials();
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

export function initMaterialsHandlers() {
  const materialList = document.getElementById('materialList');
  const materialForm = document.getElementById('materialForm');

  materialList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-material-remove]');
    if (!btn) return;
    await removeMaterial(btn.dataset.materialRemove);
  });

  materialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const materials = await getMaterials();
    materials.push(normalizeMaterial({
      id:       crypto.randomUUID(),
      type:     document.getElementById('materialType').value,
      unit:     document.getElementById('materialUnit').value,
      name:     document.getElementById('materialName').value.trim(),
      unitCost: Number(document.getElementById('materialCost').value),
    }));
    await saveData(STORAGE_KEYS.materials, materials);
    materialForm.reset();
    document.getElementById('materialType').value = '3d';
    updateMaterialFormUI();
    await renderMaterials();
    showSaved('materialSaved');
  });

  document.getElementById('resetMaterials').addEventListener('click', async () => {
    if (!confirm('Vuoi cancellare tutti i materiali salvati?')) return;
    await saveData(STORAGE_KEYS.materials, []);
    await renderMaterials();
  });

  document.getElementById('materialType').addEventListener('change', updateMaterialFormUI);
  document.getElementById('materialUnit').addEventListener('change', updateMaterialFormUI);
}
