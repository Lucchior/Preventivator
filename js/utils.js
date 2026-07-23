/**
 * utils.js — Preventivator
 * Utility pure e helper per il DOM, senza dipendenze da altri moduli.
 */

// ── Formattatori ──────────────────────────────────────────────────────────────
export const currency = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
export const num      = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Stringhe ──────────────────────────────────────────────────────────────────
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatHours(h) {
  if (!h || h <= 0) return '0 min';
  const totalMin = Math.round(h * 60);
  const d  = Math.floor(totalMin / 1440);
  const hh = Math.floor((totalMin % 1440) / 60);
  const mm = totalMin % 60;
  const parts = [];
  if (d  > 0) parts.push(`${d}g`);
  if (hh > 0) parts.push(`${hh}h`);
  if (mm > 0) parts.push(`${mm}min`);
  return parts.join(' ') || '0 min';
}

export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayIso() {
  return todayString(); // stesso formato per i nomi file JSON
}

// ── DOM ───────────────────────────────────────────────────────────────────────
/** Mostra il messaggio di conferma (.ok) per 2.5 secondi */
export function showSaved(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2500);
}

/** Mostra un messaggio di esito nell'area import/export */
export function showIoResult(id, msg, isOk) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'io-result ' + (isOk ? 'ok' : 'err');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

/** Scarica un oggetto come file JSON */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Toast / Undo ──────────────────────────────────────────────────────────────

let _toastContainer = null;
function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById('toastContainer');
  }
  return _toastContainer;
}

/**
 * Mostra un toast con pulsante "Annulla" che scompare dopo `duration` ms.
 * Restituisce una Promise che risolve true se confermato, false se annullato.
 */
/**
 * Mostra un toast "azione eseguita" con pulsante Annulla.
 * L'azione (es. cancellazione) va eseguita SUBITO dal chiamante, PRIMA di
 * invocare questa funzione (pattern ottimistico, come "Annulla invio" di Gmail).
 * Se l'utente clicca "Annulla" entro `duration` ms, viene eseguito `onUndo()`
 * per ripristinare lo stato precedente.
 *
 * @param {string}   message  - Testo mostrato (usa il passato prossimo, es. "Eliminato")
 * @param {Function} onUndo   - Callback chiamata se l'utente clicca Annulla (può essere async)
 * @param {number}   duration - Millisecondi prima che il toast scompaia definitivamente
 */
export function showUndoToast(message, onUndo, duration = 5000) {
  const container = getToastContainer();
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  let timer;

  const dismiss = () => { clearTimeout(timer); toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); };
  const undo    = async () => { dismiss(); if (onUndo) await onUndo(); };

  toast.innerHTML = `
    <div class="undo-toast-row">
      <span class="undo-msg">${escapeHtml(message)}</span>
      <button class="undo-btn" type="button">Annulla</button>
    </div>
    <div class="undo-progress-track"><div class="undo-progress-bar"></div></div>
  `;
  toast.querySelector('.undo-btn').addEventListener('click', undo);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
    const bar = toast.querySelector('.undo-progress-bar');
    // Avvia la barra a piena larghezza e la fa scorrere a zero in `duration` ms
    bar.style.transitionDuration = duration + 'ms';
    requestAnimationFrame(() => { bar.style.width = '0%'; });
  });
  timer = setTimeout(dismiss, duration);
}

/** Mostra un messaggio di errore inline su un elemento specifico. */
export function showInlineError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => el.classList.add('hidden'), 6000);
}

/** Nasconde un messaggio di errore inline. */
export function hideInlineError(elementId) {
  document.getElementById(elementId)?.classList.add('hidden');
}

// ── CSV ───────────────────────────────────────────────────────────────────────
/** Converte un array di oggetti in stringa CSV (con intestazione). */
export function toCsv(rows, headers) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map(h => esc(h.label)).join(',')];
  rows.forEach(row => {
    lines.push(headers.map(h => esc(row[h.key])).join(','));
  });
  return lines.join('\r\n');
}

/** Parsa una stringa CSV semplice (con supporto per campi tra virgolette). */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).filter(r => r.some(c => c.trim() !== '')).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (r[i] ?? '').trim(); });
    return obj;
  });
}

/** Scarica una stringa di testo come file. */
export function downloadText(text, filename, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF' + text], { type: mime }); // BOM per Excel/UTF-8
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
