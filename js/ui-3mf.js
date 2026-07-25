/**
 * ui-3mf.js — Preventivator
 * Estrazione automatica di grammi/ore (e miniatura, se presente) da un file
 * .gcode esportato dallo slicer dopo il sezionamento.
 *
 * Il G-code è l'unico formato supportato: è quello che quasi ogni slicer
 * (Bambu Studio, OrcaSlicer, Anycubic Slicer Next, PrusaSlicer, Cura...)
 * scrive sempre con peso e tempo stimato nei commenti di intestazione/coda.
 * Il formato .3mf è stato abbandonato: verificato che né Bambu Studio né
 * Anycubic Slicer Next incorporano in modo affidabile questi dati lì dentro.
 */

// ── Pattern di ricerca in un G-code testuale (multi-slicer) ──────────────────
// L'ordine conta: proviamo prima i pattern più specifici/affidabili.
const GRAMS_PATTERNS = [
  /total\s+filament\s+used\s*\[g\]\s*[:=]\s*([\d.]+)/i,             // Bambu/Orca/Anycubic — riga "totale"
  /total\s+filament\s+weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,           // varianti alternative
  /;\s*Filament\s+used\s*:\s*([\d.]+)\s*g/i,                        // Cura (varianti)
  /filament\s+weight\s*\[g\]\s*[:=]\s*([\d.]+)/i,
  /filament\s+used\s*\[g\]\s*[:=]\s*([\d.]+)/i,                     // fallback generico (usato solo se nessuna riga "totale" è presente)
];
const TIME_PATTERNS = [
  /model\s+printing\s+time[^:=]*[:=]\s*([^\n;]+)/i,                 // Bambu/Orca
  /estimated\s+printing\s+time[^=]*=\s*([^\n;]+)/i,                 // PrusaSlicer/Slic3r/Anycubic
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

  // Miniatura incorporata nel gcode (formato standard Bambu/Orca/Anycubic/PrusaSlicer)
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
 * Analizza un file .gcode esportato dallo slicer.
 * @param {File} file
 * @returns {Promise<{grams:number|null, hours:number|null, thumbnail:string|null, warning:string|null}>}
 */
export async function parse3mfFile(file) {
  const text = await file.text();
  const found = extractFromGcodeText(text);
  let warning = null;
  if (found.grams === null && found.hours === null) {
    warning = 'Non ho trovato dati di slicing nei commenti di questo G-code. Verifica che sia il file esportato direttamente dallo slicer (non modificato).';
  } else if (found.grams === null || found.hours === null) {
    warning = 'Ho trovato solo uno dei due dati (grammi o ore): completa manualmente il campo mancante.';
  }
  return { ...found, warning };
}
