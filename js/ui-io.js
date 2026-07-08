/**
 * ui-io.js — Preventivator
 * Import/export dati con IndexedDB (async).
 */

import { loadData, saveData, STORAGE_KEYS } from './storage.js';
import { getMachines, getMaterials, getJobs, saveJobs } from './models.js';
import { todayIso, downloadJson, showIoResult }         from './utils.js';

export function initIoHandlers({ renderMachines, renderMaterials, restoreProfile, renderJobs, restoreCurrentJob, activateTab }) {

  document.getElementById('exportBaseBtn').addEventListener('click', async () => {
    const [profile, machines, materials] = await Promise.all([
      loadData(STORAGE_KEYS.profile,   {}),
      getMachines(),
      getMaterials(),
    ]);
    downloadJson({ _type: 'preventivi3d-base', _version: 1, _exported: new Date().toISOString(), profile, machines, materials },
      `dati-base-${todayIso()}.json`);
  });

  document.getElementById('importBaseFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data._type !== 'preventivi3d-base') throw new Error('File non valido: non è un file di dati base.');
      await Promise.all([
        data.profile   ? saveData(STORAGE_KEYS.profile,   data.profile)   : null,
        data.machines  ? saveData(STORAGE_KEYS.machines,  data.machines)  : null,
        data.materials ? saveData(STORAGE_KEYS.materials, data.materials) : null,
      ]);
      await Promise.all([renderMachines(), renderMaterials(), restoreProfile()]);
      showIoResult('importBaseResult', `✅ Importati: ${(data.machines || []).length} macchine, ${(data.materials || []).length} materiali.`, true);
    } catch (err) {
      showIoResult('importBaseResult', '❌ Errore: ' + err.message, false);
    }
    e.target.value = '';
  });

  document.getElementById('exportJobBtn').addEventListener('click', async () => {
    const [currentJob, jobs, machines, materials] = await Promise.all([
      loadData(STORAGE_KEYS.currentJob, null),
      getJobs(), getMachines(), getMaterials(),
    ]);
    if (!jobs.length && !currentJob) { alert('Nessuna lavorazione da esportare.'); return; }
    const jobName = (currentJob?.jobName || 'senza-nome').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadJson({ _type: 'preventivi3d-job', _version: 1, _exported: new Date().toISOString(),
      currentJob, jobs, machinesSnapshot: machines, materialsSnapshot: materials },
      `lavorazione-${jobName}-${todayIso()}.json`);
  });

  document.getElementById('importJobFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data._type !== 'preventivi3d-job') throw new Error('File non valido: non è un file di lavorazione.');
      if (data.jobs)       await saveJobs(data.jobs);
      if (data.currentJob) { await saveData(STORAGE_KEYS.currentJob, data.currentJob); await restoreCurrentJob(); }
      await renderJobs();
      activateTab('tab-lavoro');
      showIoResult('importJobResult', `✅ Lavorazione "${data.currentJob?.jobName || 'senza nome'}" importata con ${(data.jobs || []).length} lavorazione/i.`, true);
    } catch (err) {
      showIoResult('importJobResult', '❌ Errore: ' + err.message, false);
    }
    e.target.value = '';
  });
}
