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
