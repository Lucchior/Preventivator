/**
 * storage.js — Preventivator
 * Storage layer basato su IndexedDB (via libreria idb).
 * Più robusto di localStorage: limite 50MB+, non cancellato da Safari,
 * scritture atomiche, resistente a errori di quota.
 *
 * Al primo avvio migra automaticamente i dati da localStorage a IndexedDB.
 */

/**
 * Mini-wrapper IndexedDB nativo, senza dipendenze esterne.
 * Sostituisce la libreria idb (CDN) con l'equivalente minimo che serve qui:
 * apertura DB, get/put/delete su un unico object store "keyval".
 */
function openDB(name, version, { upgrade }) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => resolve(wrapDb(req.result));
    req.onerror   = () => reject(req.error);
    req.onblocked = () => console.warn('[Storage] Apertura DB bloccata da un\'altra tab.');
  });
}

function wrapDb(db) {
  function tx(store, mode) {
    return db.transaction(store, mode).objectStore(store);
  }
  return {
    get(store, key) {
      return new Promise((resolve, reject) => {
        const r = tx(store, 'readonly').get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror   = () => reject(r.error);
      });
    },
    put(store, value, key) {
      return new Promise((resolve, reject) => {
        const r = tx(store, 'readwrite').put(value, key);
        r.onsuccess = () => resolve(r.result);
        r.onerror   = () => reject(r.error);
      });
    },
    delete(store, key) {
      return new Promise((resolve, reject) => {
        const r = tx(store, 'readwrite').delete(key);
        r.onsuccess = () => resolve();
        r.onerror   = () => reject(r.error);
      });
    },
    close() { db.close(); },
  };
}

// ── Costanti ──────────────────────────────────────────────────────────────────
const DB_NAME    = 'preventivator';
const DB_VERSION = 1;
const STORE      = 'keyval';

export const STORAGE_KEYS = {
  machines:   'preventivi3d_machines',
  materials:  'preventivi3d_materials',
  currentJob: 'preventivi3d_current_job',
  jobs:       'preventivi3d_jobs',
  profile:    'preventivi3d_profile',
  archive:    'preventivi3d_archive',
  templates:  'preventivi3d_templates',
  scenarioA:  'preventivi3d_scenario_a',
  scenarioB:  'preventivi3d_scenario_b',
  quoteCounter: 'preventivi3d_quote_counter',
  laborEntries: 'preventivi3d_labor_entries',
  desktopHintDismissed: 'preventivi3d_desktop_hint_dismissed',
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
    return val;
  } catch (e) {
    console.warn(`[Storage] Errore lettura (${key}):`, e);
    return fallback;
  }
}

/**
 * Verifica se una chiave è MAI stata scritta in precedenza (anche con array vuoto).
 * Serve per distinguere "prima apertura in assoluto" da "l'utente ha svuotato la lista":
 * un array vuoto SALVATO deve restare vuoto, non essere confuso con "dato mai inizializzato".
 */
export async function keyExists(key) {
  try {
    const db  = await getDb();
    const val = await db.get(STORE, key);
    return val !== undefined;
  } catch {
    return false;
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
