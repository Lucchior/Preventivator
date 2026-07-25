/**
 * ui-3mf.js — Preventivator
 * Estrazione automatica di grammi/ore (e miniatura, se presente) da file .3mf
 * già sezionati (esportati da Bambu Studio, OrcaSlicer o slicer compatibili).
 *
 * Dipende da JSZip (vendorizzata in vendor/jszip.min.js) per aprire l'archivio.
 * Se il file non contiene dati di slicing riconoscibili, ritorna un avviso
 * chiaro invece di inventare numeri: l'utente compila comunque a mano.
 */

// ── Pattern di ricerca in un G-code testuale (multi-slicer) ──────────────────
// L'ordine conta: proviamo prima i pattern più specifici/affidabili.
const GRAMS_PATTERNS = [
  /total\s+filament\s+weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,          // Bambu/Orca
  /filament\s+used\s*\[g\]\s*[:=]\s*([\d.]+)/i,                     // PrusaSlicer/Slic3r
  /;\s*Filament\s+used\s*:\s*([\d.]+)\s*g/i,                        // Cura (varianti)
  /filament\s+weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,
];
const TIME_PATTERNS = [
  /model\s+printing\s+time[^:=]*[:=]\s*([^\n;]+)/i,                 // Bambu/Orca
  /estimated\s+printing\s+time[^=]*=\s*([^\n;]+)/i,                 // PrusaSlicer/Slic3r
  /;\s*TIME\s*:\s*(\d+)/i,                                          // Cura (secondi)
];

function parseDurationToHours(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (/^\d+$/.test(text)) return Number(text) / 3600; // solo secondi (Cura)
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

  // Miniatura incorporata nel gcode (formato standard Bambu/Orca/PrusaSlicer)
  let thumbnail = null;
  const blocks = [...text.matchAll(/;\s*thumbnail(?:_QOI)?\s+begin\s+(\d+)x(\d+)\s+\d+([\s\S]*?);\s*thumbnail(?:_QOI)?\s+end/gi)];
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
 * Analizza un file .3mf già sezionato.
 * @param {File} file
 * @returns {Promise<{grams:number|null, hours:number|null, thumbnail:string|null, warning:string|null}>}
 */
export async function parse3mfFile(file) {
  if (typeof window.JSZip === 'undefined') {
    return { grams: null, hours: null, thumbnail: null,
      warning: 'Libreria di lettura .3mf non disponibile (verifica che vendor/jszip.min.js sia presente nel sito).' };
  }

  let zip;
  try {
    zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return { grams: null, hours: null, thumbnail: null, warning: 'Il file non sembra un archivio .3mf valido.' };
  }

  const names = Object.keys(zip.files);
  let grams = null, hours = null, thumbnail = null;

  // 1) G-code incorporato (Bambu Studio / OrcaSlicer: massima affidabilità)
  const gcodeEntry = names.find(n => /\.gcode$/i.test(n));
  if (gcodeEntry) {
    const text = await zip.files[gcodeEntry].async('text');
    const found = extractFromGcodeText(text);
    grams = found.grams; hours = found.hours; thumbnail = found.thumbnail;
  }

  // 2) Fallback: metadati di slicing specifici Bambu/Orca (slice_info.config)
  if (grams === null || hours === null) {
    const configEntry = names.find(n => /slice_info\.config$/i.test(n));
    if (configEntry) {
      const cfg = await zip.files[configEntry].async('text');
      if (grams === null) { const m = cfg.match(/weight="([\d.]+)"/i); if (m) grams = Number(m[1]); }
      if (hours === null) { const m = cfg.match(/prediction="([\d.]+)"/i); if (m) hours = Number(m[1]) / 3600; }
    }
  }

  // 3) Miniatura di riserva se non trovata nel gcode (immagine piatto nel progetto)
  if (!thumbnail) {
    const imgEntry = names.find(n => /(plate_1|thumbnail|top_1)\.(png|jpe?g)$/i.test(n))
      || names.find(n => /\.(png|jpe?g)$/i.test(n));
    if (imgEntry) {
      const b64 = await zip.files[imgEntry].async('base64');
      const ext = imgEntry.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      thumbnail = `data:image/${ext};base64,${b64}`;
    }
  }

  let warning = null;
  if (grams === null && hours === null) {
    warning = 'Non ho trovato dati di slicing in questo file (grammi/ore). Probabile causa: il file non è stato sezionato con Bambu Studio/OrcaSlicer, o è un modello grezzo non ancora sezionato. Inserisci i valori manualmente.';
  } else if (grams === null || hours === null) {
    warning = 'Ho trovato solo uno dei due dati (grammi o ore): completa manualmente il campo mancante.';
  }

  return { grams, hours, thumbnail, warning };
}
