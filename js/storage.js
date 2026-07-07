/**
 * storage.js — Preventivator
 * Gestione del localStorage con versioning e migrazione automatica.
 */

// ── Versioning ────────────────────────────────────────────────────────────────
// Incrementare DATA_VERSION ogni volta che cambia la struttura dei dati salvati.
// Aggiungere la funzione corrispondente in MIGRATIONS.
export const DATA_VERSION = 1;

export const MIGRATIONS = {
  // Esempio di migrazione futura:
  // 2: (data) => ({ ...data, nuovoCampo: valoreDefault }),
};

export function migrateData(data, fromVersion) {
  let current = fromVersion;
  let migrated = { ...data };
  while (current < DATA_VERSION) {
    const next = current + 1;
    if (MIGRATIONS[next]) {
      migrated = MIGRATIONS[next](migrated);
      console.info(`[Preventivator] Migrazione dati v${current} → v${next}`);
    }
    current = next;
  }
  return migrated;
}

// ── Storage Keys ──────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  machines:   'preventivi3d_machines',
  materials:  'preventivi3d_materials',
  currentJob: 'preventivi3d_current_job',
  jobs:       'preventivi3d_jobs',
  profile:    'preventivi3d_profile',
};

// ── Primitive I/O ─────────────────────────────────────────────────────────────
export function loadData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    // Migrazione automatica se i dati hanno versione obsoleta
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed._v) {
      if (parsed._v < DATA_VERSION) {
        const migrated = migrateData(parsed, parsed._v);
        migrated._v = DATA_VERSION;
        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated.data ?? fallback;
      }
      return parsed.data ?? fallback;
    }
    return parsed;
  } catch (e) {
    console.warn(`[Preventivator] Errore lettura dati (${key}):`, e);
    return fallback;
  }
}

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[Preventivator] Errore salvataggio dati (${key}):`, e);
  }
}
