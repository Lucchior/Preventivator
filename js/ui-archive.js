/**
 * ui-archive.js — Preventivator
 * Gestione dello storico preventivi (tab Archivio).
 * Ogni preventivo calcolato viene salvato automaticamente.
 */

import { loadData, saveData, STORAGE_KEYS } from './storage.js';
import { saveJobs }                          from './models.js';
import { currency, escapeHtml, todayIso, showUndoToast } from './utils.js';

// ── Struttura di un record archivio ──────────────────────────────────────────
/**
 * @typedef {Object} ArchiveEntry
 * @property {string} id         - UUID univoco
 * @property {string} savedAt    - ISO timestamp del salvataggio
 * @property {string} jobName    - Nome del preventivo
 * @property {string} clientName - Nome del cliente
 * @property {string} quoteDate  - Data preventivo (YYYY-MM-DD)
 * @property {number} finalPrice - Prezzo finale
 * @property {boolean} includeVat
 * @property {number} jobCount   - N. lavorazioni
 * @property {number} totalPieces- N. pezzi totali
 * @property {Object} fullData   - Copia completa di currentJob (per ripristino)
 */

// ── Accessor ──────────────────────────────────────────────────────────────────
async function getArchive() {
  return loadData(STORAGE_KEYS.archive, []);
}

async function saveArchive(entries) {
  return saveData(STORAGE_KEYS.archive, entries);
}

/**
 * Aggiunge (o aggiorna) un preventivo nell'archivio.
 * Chiamato automaticamente dal jobForm submit in app.js.
 */
export async function archiveSave(currentJobData, result) {
  const archive = await getArchive();

  // Se esiste già un record con lo stesso jobName + quoteDate + clientName → aggiorna
  const existingIdx = archive.findIndex(e =>
    e.jobName    === (currentJobData.jobName    || '') &&
    e.clientName === (currentJobData.clientName || '') &&
    e.quoteDate  === (currentJobData.quoteDate  || '')
  );

  const entry = {
    id:           existingIdx >= 0 ? archive[existingIdx].id : crypto.randomUUID(),
    savedAt:      new Date().toISOString(),
    jobName:      currentJobData.jobName      || 'Senza nome',
    clientName:   currentJobData.clientName   || '',
    quoteDate:    currentJobData.quoteDate    || todayIso(),
    finalPrice:   result.finalRecommendedPrice || 0,
    includeVat:   result.includeVat           || false,
    jobCount:     (result.jobResults          || []).length,
    totalPieces:  result.totalPiecesAll       || 0,
    fullData:     { ...currentJobData, result },
  };

  if (existingIdx >= 0) {
    archive[existingIdx] = entry; // aggiorna esistente
  } else {
    archive.unshift(entry);       // aggiunge in cima (più recente prima)
  }

  await saveArchive(archive);
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function formatDate(isoDate) {
  if (!isoDate) return '—';
  // YYYY-MM-DD → GG/MM/AAAA
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function formatSavedAt(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function buildEntryCard(entry) {
  const vatLabel = entry.includeVat ? '<span class="badge green" style="font-size:10px;">IVA inc.</span>' : '<span class="badge red" style="font-size:10px;">IVA esc.</span>';
  const piecesInfo = entry.totalPieces > 0 ? `· ${entry.totalPieces} pezzi` : '';
  return `
    <div class="archive-card" data-archive-id="${entry.id}">
      <div class="archive-card-main">
        <div class="archive-card-title">${escapeHtml(entry.jobName)}</div>
        <div class="archive-card-meta">
          ${entry.clientName ? `<span>👤 ${escapeHtml(entry.clientName)}</span>` : ''}
          <span>📅 ${formatDate(entry.quoteDate)}</span>
          <span>🔧 ${entry.jobCount} lavorazion${entry.jobCount === 1 ? 'e' : 'i'}${piecesInfo}</span>
          <span class="archive-saved-at">Salvato: ${formatSavedAt(entry.savedAt)}</span>
        </div>
      </div>
      <div class="archive-card-price">
        <div class="archive-price-value">${currency.format(entry.finalPrice)}</div>
        <div>${vatLabel}</div>
      </div>
      <div class="archive-card-actions">
        <button class="secondary" type="button" data-archive-load="${entry.id}" title="Ripristina nel tab Lavoro">📂 Carica</button>
        <button class="secondary" type="button" data-archive-pdf="${entry.id}" title="Esporta PDF">📄 PDF</button>
        <button class="danger"    type="button" data-archive-delete="${entry.id}" title="Elimina">✕</button>
      </div>
    </div>`;
}

export async function renderArchive(filterText = '') {
  const archive    = await getArchive();
  const container  = document.getElementById('archiveList');
  const countEl    = document.getElementById('archiveCount');
  if (!container) return;

  const q = filterText.toLowerCase().trim();
  const filtered = q
    ? archive.filter(e =>
        (e.jobName    || '').toLowerCase().includes(q) ||
        (e.clientName || '').toLowerCase().includes(q) ||
        (e.quoteDate  || '').includes(q)
      )
    : archive;

  if (countEl) countEl.textContent = `${filtered.length} preventiv${filtered.length === 1 ? 'o' : 'i'}${q ? ' trovati' : ' in archivio'}`;

  if (!filtered.length) {
    container.innerHTML = q
      ? '<div class="empty">Nessun preventivo trovato per la ricerca.</div>'
      : '<div class="empty">Nessun preventivo salvato. Ogni volta che calcoli un preventivo viene aggiunto automaticamente qui.</div>';
    return;
  }

  container.innerHTML = filtered.map(buildEntryCard).join('');
}

// ── Handlers ──────────────────────────────────────────────────────────────────
export function initArchiveHandlers({ restoreCurrentJob, renderJobs, activateTab, generatePdf }) {
  const container = document.getElementById('archiveList');
  const searchEl  = document.getElementById('archiveSearch');
  if (!container) return;

  // Ricerca in tempo reale
  searchEl?.addEventListener('input', () => renderArchive(searchEl.value));

  // Delegazione click su tutte le azioni
  container.addEventListener('click', async (e) => {
    // ── Carica ──
    const loadBtn = e.target.closest('[data-archive-load]');
    if (loadBtn) {
      const entry = await findEntry(loadBtn.dataset.archiveLoad);
      if (!entry) return;
      await loadEntry(entry, { restoreCurrentJob, renderJobs, activateTab });
      return;
    }

    // ── PDF ──
    const pdfBtn = e.target.closest('[data-archive-pdf]');
    if (pdfBtn) {
      const entry = await findEntry(pdfBtn.dataset.archivePdf);
      if (!entry?.fullData?.result) { alert('Nessun risultato disponibile per questo preventivo.'); return; }
      window.__lastQuoteResult = entry.fullData.result;
      await generatePdf(entry.fullData.result);
      return;
    }

    // ── Elimina ──
    const delBtn = e.target.closest('[data-archive-delete]');
    if (delBtn) {
      const archive = await getArchive();
      const target  = archive.find(e => e.id === delBtn.dataset.archiveDelete);
      const confirmed = await showUndoToast(`"${target?.jobName || 'Preventivo'}" eliminato dall'archivio.`);
      if (confirmed) {
        await saveArchive(archive.filter(e => e.id !== delBtn.dataset.archiveDelete));
        await renderArchive(searchEl?.value || '');
      }
      return;
    }
  });
}

// ── Helper interni ────────────────────────────────────────────────────────────
async function findEntry(id) {
  const archive = await getArchive();
  return archive.find(e => e.id === id) || null;
}

async function loadEntry(entry, { restoreCurrentJob, renderJobs, activateTab }) {
  if (!entry.fullData) { alert('Dati non disponibili per questo preventivo.'); return; }

  // 1. Salva i dati del preventivo come currentJob
  await saveData(STORAGE_KEYS.currentJob, entry.fullData);

  // 2. Salva le lavorazioni
  if (Array.isArray(entry.fullData.jobs)) {
    // export separato dei jobs (se salvato nella fullData)
  }
  // Nota: i jobs sono già in STORAGE_KEYS.jobs dal momento del salvataggio originale.
  // Per il ripristino completo li ricarichiamo dalla fullData se presenti.
  if (entry.fullData.jobsList) {
    await saveData(STORAGE_KEYS.jobs, entry.fullData.jobsList);
  }

  // 3. Ripristina i campi form
  await restoreCurrentJob();

  // 4. Aggiorna la lista lavorazioni
  await renderJobs();

  // 5. Vai al tab Lavoro
  activateTab('tab-lavoro');
}
