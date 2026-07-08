/**
 * storage.js — Preventivator
 * Storage layer basato su IndexedDB (via libreria idb).
 * Più robusto di localStorage: limite 50MB+, non cancellato da Safari,
 * scritture atomiche, resistente a errori di quota.
 *
 * Al primo avvio migra automaticamente i dati da localStorage a IndexedDB.
 */

import { openDB } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

// ── Costanti ──────────────────────────────────────────────────────────────────
const DB_NAME    = 'preventivator';
const DB_VERSION = 1;
const STORE      = 'keyval';

export const DATA_VERSION = 1;

export const MIGRATIONS = {
  // Esempio di migrazione futura:
  // 2: (data) => ({ ...data, nuovoCampo: valoreDefault }),
};

export const STORAGE_KEYS = {
  machines:   'preventivi3d_machines',
  materials:  'preventivi3d_materials',
  currentJob: 'preventivi3d_current_job',
  jobs:       'preventivi3d_jobs',
  profile:    'preventivi3d_profile',
};

// ── DB singleton ──────────────────────────────────────────────────────────────
let _db = null;

async function getDb() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
    blocked()  { console.warn('[Storage] DB bloccato da una versione precedente aperta.'); },
    blocking() { _db?.close(); _db = null; },
  });
  return _db;
}

// ── API pubblica ──────────────────────────────────────────────────────────────

/**
 * Legge un valore dall'IndexedDB.
 * @param {string} key
 * @param {*}      fallback - Valore restituito se la chiave non esiste
 */
export async function loadData(key, fallback = []) {
  try {
    const db  = await getDb();
    const val = await db.get(STORE, key);
    if (val === undefined) return fallback;

    // Migrazione automatica se i dati hanno version schema obsoleto
    if (val && typeof val === 'object' && !Array.isArray(val) && val._v && val._v < DATA_VERSION) {
      const migrated = migrateData(val, val._v);
      migrated._v    = DATA_VERSION;
      await saveData(key, migrated);
      return migrated.data ?? fallback;
    }

    return val;
  } catch (e) {
    console.warn(`[Storage] Errore lettura (${key}):`, e);
    return fallback;
  }
}

/**
 * Scrive un valore nell'IndexedDB.
 * @param {string} key
 * @param {*}      data
 */
export async function saveData(key, data) {
  try {
    const db = await getDb();
    await db.put(STORE, data, key);
  } catch (e) {
    console.error(`[Storage] Errore scrittura (${key}):`, e);
  }
}

/**
 * Elimina una chiave dall'IndexedDB.
 */
export async function deleteData(key) {
  try {
    const db = await getDb();
    await db.delete(STORE, key);
  } catch (e) {
    console.error(`[Storage] Errore eliminazione (${key}):`, e);
  }
}

// ── Migrazione schema dati ────────────────────────────────────────────────────
export function migrateData(data, fromVersion) {
  let current  = fromVersion;
  let migrated = { ...data };
  while (current < DATA_VERSION) {
    const next = current + 1;
    if (MIGRATIONS[next]) {
      migrated = MIGRATIONS[next](migrated);
      console.info(`[Preventivator] Migrazione schema v${current} → v${next}`);
    }
    current = next;
  }
  return migrated;
}

// ── Migrazione da localStorage ────────────────────────────────────────────────
/**
 * Eseguito una sola volta al primo avvio dopo l'aggiornamento.
 * Copia tutti i dati presenti nel vecchio localStorage in IndexedDB,
 * poi li rimuove dal localStorage.
 */
export async function migrateFromLocalStorage() {
  const alreadyMigrated = await loadData('__ls_migrated', false);
  if (alreadyMigrated) return;

  let migrated = 0;
  const allKeys = [
    ...Object.values(STORAGE_KEYS),
    // Vecchie chiavi di versioni precedenti dell'app
    'preventivi3d_printers',
  ];

  for (const key of allKeys) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      const parsed = JSON.parse(raw);
      await saveData(key, parsed);
      localStorage.removeItem(key);
      migrated++;
    } catch (e) {
      console.warn(`[Migration] Impossibile migrare chiave "${key}":`, e);
    }
  }

  await saveData('__ls_migrated', true);
  if (migrated > 0) {
    console.info(`[Preventivator] Migrazione completata: ${migrated} chiavi spostate da localStorage a IndexedDB.`);
  }
}

/**
 * Inizializza lo storage: apre il DB e migra i dati da localStorage se necessario.
 * Va chiamato una sola volta all'avvio, prima di qualsiasi altra operazione.
 */
export async function initStorage() {
  await getDb();               // assicura che il DB sia aperto
  await migrateFromLocalStorage(); // migra da localStorage se necessario
}
