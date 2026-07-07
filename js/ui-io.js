/**
 * ui-io.js — Preventivator
 * Gestione dell'import/export dei dati (tab Dati & Backup).
 */

import { loadData, saveData, STORAGE_KEYS } from './storage.js';
import { getMachines, getMaterials, getJobs, saveJobs } from './models.js';
import { todayIso, downloadJson, showIoResult } from './utils.js';

export function initIoHandlers({ renderMachines, renderMaterials, restoreProfile, renderJobs, restoreCurrentJob, activateTab }) {

  // ── Esporta dati base ────────────────────────────────────────────
  document.getElementById('exportBaseBtn').addEventListener('click', () => {
    const data = {
      _type:     'preventivi3d-base',
      _version:  1,
      _exported: new Date().toISOString(),
      profile:   loadData(STORAGE_KEYS.profile, {}),
      machines:  getMachines(),
      materials: getMaterials(),
    };
    downloadJson(data, `dati-base-${todayIso()}.json`);
  });

  // ── Importa dati base ────────────────────────────────────────────
  document.getElementById('importBaseFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._type !== 'preventivi3d-base') throw new Error('File non valido: non è un file di dati base.');
      if (data.profile)   saveData(STORAGE_KEYS.profile,   data.profile);
      if (data.machines)  saveData(STORAGE_KEYS.machines,  data.machines);
      if (data.materials) saveData(STORAGE_KEYS.materials, data.materials);
      renderMachines();
      renderMaterials();
      restoreProfile();
      showIoResult('importBaseResult', `✅ Importati: ${(data.machines || []).length} macchine, ${(data.materials || []).length} materiali.`, true);
    } catch (err) {
      showIoResult('importBaseResult', '❌ Errore: ' + err.message, false);
    }
    e.target.value = '';
  });

  // ── Esporta lavorazione ──────────────────────────────────────────
  document.getElementById('exportJobBtn').addEventListener('click', () => {
    const currentJob = loadData(STORAGE_KEYS.currentJob, null);
    const jobs       = getJobs();
    if (!jobs.length && !currentJob) {
      alert('Nessuna lavorazione da esportare. Compila il tab Lavoro prima.');
      return;
    }
    const jobName = (currentJob && currentJob.jobName)
      ? currentJob.jobName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      : 'senza-nome';
    const data = {
      _type:             'preventivi3d-job',
      _version:          1,
      _exported:         new Date().toISOString(),
      currentJob,
      jobs,
      machinesSnapshot:  getMachines(),
      materialsSnapshot: getMaterials(),
    };
    downloadJson(data, `lavorazione-${jobName}-${todayIso()}.json`);
  });

  // ── Importa lavorazione ──────────────────────────────────────────
  document.getElementById('importJobFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data._type !== 'preventivi3d-job') throw new Error('File non valido: non è un file di lavorazione.');
      if (data.jobs)       saveJobs(data.jobs);
      if (data.currentJob) {
        saveData(STORAGE_KEYS.currentJob, data.currentJob);
        restoreCurrentJob();
      }
      renderJobs();
      activateTab('tab-lavoro');
      const jname = data.currentJob?.jobName || 'senza nome';
      showIoResult('importJobResult', `✅ Lavorazione "${jname}" importata con ${(data.jobs || []).length} lavorazione/i.`, true);
    } catch (err) {
      showIoResult('importJobResult', '❌ Errore: ' + err.message, false);
    }
    e.target.value = '';
  });
}
