/**
 * models.js — Preventivator
 * Modelli dati, normalizzatori e accessor asincroni dello storage.
 */

import { loadData, saveData, keyExists, STORAGE_KEYS } from './storage.js';

// ── Costanti ──────────────────────────────────────────────────────────────────
export const UNIT_LABELS = {
  kg:     'kg',
  pezzo:  'pezzo',
  foglio: 'foglio',
  lastra: 'lastra',
  metro:  'metro',
};

export const defaults = {
  machines: [],
  materials: [],
};

// ── Normalizzatori (puri, sincroni) ───────────────────────────────────────────
export function normalizeMachine(m) {
  return {
    id:              m.id || crypto.randomUUID(),
    type:            m.type || '3d',
    name:            m.name || 'Macchina',
    machineCost:     Number(m.machineCost    ?? m.printerCost    ?? 0),
    lifetimeHours:   Number(m.lifetimeHours  ?? 0),
    energyCost:      Number(m.energyCost     ?? 0),
    powerKwh:        Number(m.powerKwh       ?? m.powerConsumption ?? 0),
    powerEveryH:     Number(m.powerEveryH    ?? 1),
    maintenanceCost: Number(m.maintenanceCost ?? 0),
  };
}

export function normalizeMaterial(m) {
  const type = m.type || '3d';
  return {
    id:       m.id || crypto.randomUUID(),
    type,
    unit:     m.unit || (type === '3d' ? 'kg' : 'pezzo'),
    name:     m.name || 'Materiale',
    unitCost: Number(m.unitCost ?? m.costPerKg ?? 0),
  };
}

export function newJob(type) {
  return {
    id:                 crypto.randomUUID(),
    type,
    machineId:          '',
    materialId:         '',
    label:              '',
    piecesPerUnit:      1,
    unitCount:          1,
    gramsPerUnit:       0,
    materialQtyPerUnit: 0,
    days:               0,
    hours:              0,
    minutes:            0,
    extraMaterialLabel: '',
    extraMaterialCost:  0,
  };
}

// ── Accessor asincroni ────────────────────────────────────────────────────────

/**
 * Popola macchine e materiali con i valori di esempio SOLO alla primissima
 * apertura in assoluto dell'app (chiave mai scritta prima). Se l'utente in
 * seguito elimina tutte le sue macchine/materiali, la lista resta vuota:
 * non vengono più reintrodotti automaticamente i dati di esempio.
 */
export async function seedDefaultsIfFirstRun() {
  if (!(await keyExists(STORAGE_KEYS.machines))) {
    const legacy = await loadData('preventivi3d_printers', []);
    const seed = (legacy.length ? legacy : defaults.machines).map(normalizeMachine);
    await saveData(STORAGE_KEYS.machines, seed);
  }
  if (!(await keyExists(STORAGE_KEYS.materials))) {
    await saveData(STORAGE_KEYS.materials, defaults.materials.map(normalizeMaterial));
  }
}

export async function getMachines() {
  const base = await loadData(STORAGE_KEYS.machines, []);
  return (Array.isArray(base) ? base : []).map(normalizeMachine);
}

export async function getMaterials() {
  const base = await loadData(STORAGE_KEYS.materials, []);
  return (Array.isArray(base) ? base : []).map(normalizeMaterial);
}

export async function getJobs() {
  return loadData(STORAGE_KEYS.jobs, []);
}

export async function saveJobs(jobs) {
  return saveData(STORAGE_KEYS.jobs, jobs);
}

export async function getProfile() {
  return loadData(STORAGE_KEYS.profile, { type: 'privato' });
}
