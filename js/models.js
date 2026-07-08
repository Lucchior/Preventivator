/**
 * models.js — Preventivator
 * Modelli dati, normalizzatori e accessor asincroni dello storage.
 */

import { loadData, saveData, STORAGE_KEYS } from './storage.js';

// ── Costanti ──────────────────────────────────────────────────────────────────
export const UNIT_LABELS = {
  kg:     'kg',
  pezzo:  'pezzo',
  foglio: 'foglio',
  lastra: 'lastra',
  metro:  'metro',
};

export const defaults = {
  machines: [
    { id: crypto.randomUUID(), type: '3d',    name: 'Stampante esempio',  machineCost: 1200, lifetimeHours: 8000,  energyCost: 0.28, powerKwh: 1, powerEveryH: 3, maintenanceCost: 120 },
    { id: crypto.randomUUID(), type: 'laser', name: 'Laser CO2 esempio',  machineCost: 2200, lifetimeHours: 10000, energyCost: 0.32, powerKwh: 1, powerEveryH: 1, maintenanceCost: 180 },
  ],
  materials: [
    { id: crypto.randomUUID(), type: '3d',    unit: 'kg',     name: 'PLA',             unitCost: 22  },
    { id: crypto.randomUUID(), type: 'laser', unit: 'foglio', name: 'Compensato 3 mm', unitCost: 5.5 },
  ],
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

export async function getMachines() {
  const base = await loadData(STORAGE_KEYS.machines, []);
  if (Array.isArray(base) && base.length) return base.map(normalizeMachine);
  // Compatibilità con vecchio storage key
  const legacy = await loadData('preventivi3d_printers', []);
  if (legacy.length) return legacy.map(normalizeMachine);
  return defaults.machines.map(normalizeMachine);
}

export async function getMaterials() {
  const base = await loadData(STORAGE_KEYS.materials, []);
  if (Array.isArray(base) && base.length) return base.map(normalizeMaterial);
  return defaults.materials.map(normalizeMaterial);
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
