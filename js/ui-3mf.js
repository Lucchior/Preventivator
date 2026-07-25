/**
 * ui-3mf.js — Preventivator
 * Estrazione automatica di grammi/ore (e miniatura) da:
 *  - un file .gcode esportato dallo slicer dopo il sezionamento (formato
 *    universale, funziona con quasi ogni slicer)
 *  - un file .3mf esportato con l'opzione "Esporta tutti i piatti elaborati"
 *    di Anycubic Slicer Next / OrcaSlicer (NON il "salva progetto" standard,
 *    che non contiene questi dati). Questo formato "pacchetto multi-piatto"
 *    include un G-code per piatto, miniature PNG separate per piatto, e un
 *    riepilogo XML (slice_info.config) con peso/tempo già pronti per ognuno.
 *
 * Il .3mf richiede JSZip (vendorizzata in vendor/jszip.min.js) per aprire
 * l'archivio. Il .gcode invece è testo puro, nessuna libreria necessaria.
 */

// ── Pattern di ricerca in un G-code testuale (multi-slicer) ──────────────────
const GRAMS_PATTERNS = [
  /total\s+filament\s+used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
  /total\s+filament\s+weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,
  /;\s*Filament\s+used\s*:\s*([\d.]+)\s*g/i,
  /filament\s+weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,
  /filament\s+used\s*\[g\]\s*[:=]\s*([\d.]+)/i,
];
const TIME_PATTERNS = [
  /model\s+printing\s+time[^:=]*[:=]\s*([^\n;]+)/i,
  /estimated\s+printing\s+time[^=]*=\s*([^\n;]+)/i,
  /;\s*TIME\s*:\s*(\d+)/i,
];

function parseDurationToHours(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (/^\d+$/.test(text)) return Number(text) / 3600;
  let totalSeconds = 0;
  const d = text.match(/(\d+(?:\.\d+)?)\s*d/i);
  const h = text.match(/(\d+(?:\.\d+)?)\s*h/i);
  const m = text.match(/(\d+(?:\.\d+)?)\s*m(?!s)/i);
  const s = text.match(/(\d+(?:\.\d+)?)\s*s/i);
  if (d) totalSeconds += Number(d[1]) * 86400;
  if (h) totalSeconds += Number(h[1]) * 3600;
  if (m) totalSeconds += Number(m[1]) * 60;
  if (s) totalSeconds += Number(s[1]);
  if (totalSeconds === 0) {
    const num = text.match(/[\d.]+/);
    return num ? Number(num[0]) : null;
  }
  return totalSeconds / 3600;
}

function extractFromGcodeText(text) {
  let grams = null, hours = null;
  for (const p of GRAMS_PATTERNS) { const m = text.match(p); if (m) { grams = Number(m[1]); break; } }
  for (const p of TIME_PATTERNS)  { const m = text.match(p); if (m) { hours = parseDurationToHours(m[1]); if (hours !== null) break; } }

  let thumbnail = null;
  const blocks = [...text.matchAll(/;\s*thumbnail(?:_QOI)?\s+begin\s+(\d+)x(\d+)\s+\d+[^\n]*\n([\s\S]*?);\s*thumbnail(?:_QOI)?\s+end/gi)];
  if (blocks.length) {
    let best = null, bestArea = 0;
    for (const b of blocks) {
      const area = Number(b[1]) * Number(b[2]);
      const b64 = b[3].replace(/;/g, '').replace(/\s+/g, '');
      if (area > bestArea && b64.length > 50) { bestArea = area; best = b64; }
    }
    if (best) thumbnail = `data:image/png;base64,${best}`;
  }
  return { grams, hours, thumbnail };
}

/**
 * Analizza un file .gcode singolo.
 * @returns {Promise<{mode:'single', grams, hours, thumbnail, warning}>}
 */
async function parseGcodeFile(file) {
  const text = await file.text();
  const found = extractFromGcodeText(text);
  let warning = null;
  if (found.grams === null && found.hours === null) {
    warning = 'Non ho trovato dati di slicing nei commenti di questo G-code. Verifica che sia il file esportato direttamente dallo slicer (non modificato).';
  } else if (found.grams === null || found.hours === null) {
    warning = 'Ho trovato solo uno dei due dati (grammi o ore): completa manualmente il campo mancante.';
  }
  return { mode: 'single', ...found, warning };
}

/**
 * Analizza un file .3mf "pacchetto multi-piatto" (slice_info.config con più
 * blocchi <plate>). Restituisce l'elenco dei piatti trovati, ognuno con peso,
 * ore e miniatura — l'utente sceglierà quale importare nella card corrente.
 * @returns {Promise<{mode:'plates', plates:Array, warning:string|null}>}
 */
async function parse3mfPackage(file) {
  if (typeof window.JSZip === 'undefined') {
    return { mode: 'plates', plates: [],
      warning: 'Libreria di lettura .3mf non disponibile (verifica che vendor/jszip.min.js sia presente nel sito).' };
  }

  let zip;
  try {
    zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return { mode: 'plates', plates: [], warning: 'Il file non sembra un archivio .3mf valido.' };
  }

  const names = Object.keys(zip.files);
  const infoEntry = names.find(n => /slice_info\.config$/i.test(n));
  if (!infoEntry) {
    return { mode: 'plates', plates: [],
      warning: 'Questo .3mf non contiene un riepilogo piatti riconoscibile. Usa l\'opzione "Esporta tutti i piatti elaborati" dello slicer (non il "salva progetto" standard), oppure carica direttamente il file .gcode.' };
  }

  const xml = await zip.files[infoEntry].async('text');
  const plateBlocks = [...xml.matchAll(/<plate>([\s\S]*?)<\/plate>/gi)];
  if (!plateBlocks.length) {
    return { mode: 'plates', plates: [],
      warning: 'Nessun dato di peso/tempo trovato in questo .3mf. Usa l\'opzione "Esporta tutti i piatti elaborati" dello slicer, oppure carica il file .gcode.' };
  }

  const plates = [];
  for (const [, block] of plateBlocks) {
    const idxM = block.match(/key="index"\s+value="(\d+)"/i);
    const wM   = block.match(/key="weight"\s+value="([\d.]+)"/i);
    const pM   = block.match(/key="prediction"\s+value="([\d.]+)"/i);
    if (!idxM) continue;
    const index  = Number(idxM[1]);
    const grams  = wM ? Number(wM[1]) : null;
    const hours  = pM ? Number(pM[1]) / 3600 : null;

    // Miniatura: preferiamo il file piccolo (più leggero, sufficiente come anteprima)
    let thumbnail = null;
    const thumbName = names.find(n => new RegExp(`plate_${index}_small\\.png$`, 'i').test(n))
      || names.find(n => new RegExp(`plate_${index}\\.png$`, 'i').test(n));
    if (thumbName) {
      const b64 = await zip.files[thumbName].async('base64');
      thumbnail = `data:image/png;base64,${b64}`;
    }

    plates.push({ index, grams, hours, thumbnail });
  }

  plates.sort((a, b) => a.index - b.index);
  return { mode: 'plates', plates, warning: plates.length ? null : 'Nessun piatto valido trovato in questo file.' };
}

/**
 * Punto di ingresso: instrada in base all'estensione del file.
 * @param {File} file
 * @returns {Promise<{mode:'single'|'plates', ...}>}
 */
export async function parse3mfFile(file) {
  const isGcode = /\.(gcode|gco|g)$/i.test(file.name);
  return isGcode ? parseGcodeFile(file) : parse3mfPackage(file);
}
