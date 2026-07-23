/**
 * app.js — Preventivator
 * Punto di ingresso. Inizializza IndexedDB, migra dati e avvia l'app.
 */

import { loadData, saveData, STORAGE_KEYS, initStorage } from './storage.js';
import { getMachines, getMaterials, getJobs, seedDefaultsIfFirstRun } from './models.js';
import { computeJobCost, computeQuote }                    from './calc.js';
import { todayString, showInlineError, hideInlineError } from './utils.js';
import { renderMachines, initMachinesHandlers }            from './ui-machines.js';
import { renderMaterials, initMaterialsHandlers, updateMaterialFormUI } from './ui-materials.js';
import { renderJobs, initJobsHandlers }                    from './ui-jobs.js';
import { renderSummary, initScenarioHandlers }             from './ui-summary.js';
import { restoreProfile, initProfileHandlers }             from './ui-profile.js';
import { initPdfHandler, generatePdf }                     from './ui-pdf.js';
import { initIoHandlers }                                  from './ui-io.js';
import { archiveSave, renderArchive, initArchiveHandlers } from './ui-archive.js';
import { initTheme }                                        from './ui-theme.js';

// ── Tab navigation ────────────────────────────────────────────────────────────
export function activateTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    const isActive = b.dataset.tab === id;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === id));
}

// ── Restore job form ──────────────────────────────────────────────────────────
export async function restoreCurrentJob() {
  const saved = await loadData(STORAGE_KEYS.currentJob, null);
  if (!saved || saved.version !== 'hybrid-v3') {
    const dateInput = document.getElementById('quoteDate');
    if (dateInput && !dateInput.value) dateInput.value = todayString();
    return;
  }
  const set = (id, v, fb = '') => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') { el.checked = v !== undefined && v !== null ? Boolean(v) : Boolean(fb); return; }
    if (v !== undefined && v !== null && v !== '') el.value = v;
    else if (fb !== '') el.value = fb;
  };
  set('jobName',         saved.jobName        || '');
  set('clientName',      saved.clientName     || '');
  set('clientContact',   saved.clientContact  || '');
  set('quoteDate',       saved.quoteDate      || todayString());
  set('manualHours',     saved.manualHours,       0);
  set('laborRate',       saved.laborRate,          0);
  set('failureMargin',   saved.failureMargin,      8);
  set('profitMargin',    saved.profitMargin,        100);
  set('discountAmount',  saved.discountAmount,     0);
  set('minimumPrice',    saved.minimumPrice,        0);
  set('vatPercent',      saved.vatPercent,          22);
  set('includeVat',      saved.includeVat,          true);
  set('includeShipping', saved.includeShipping,     false);
  set('shippingCost',    saved.shippingCost,        0);
  set('shippingType',    saved.shippingType,        'standard');
  set('includeInsurance',saved.includeInsurance,    false);
  set('insuranceCost',   saved.insuranceCost,       0);
  set('deliveryDaysMin', saved.deliveryDaysMin,     3);
  set('deliveryDaysMax', saved.deliveryDaysMax,     5);
  set('shippingNotes',   saved.shippingNotes,       '');
  updateShippingUI();
  if (saved.result) renderSummary(saved.result);
}

// ── Shipping UI ───────────────────────────────────────────────────────────────
function updateShippingUI() {
  const on = document.getElementById('includeShipping').checked;
  document.getElementById('shippingFields').classList.toggle('hidden', !on);
  const insured = on && document.getElementById('includeInsurance').checked;
  document.getElementById('insuranceCostWrap').style.display = insured ? 'block' : 'none';
}

// ── Job form submit ───────────────────────────────────────────────────────────
function initJobFormHandler() {
  document.getElementById('jobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobs = await getJobs();
    if (!jobs.length) {
      showInlineError('jobFormError', '⚠️ Aggiungi almeno una lavorazione prima di calcolare.');
      return;
    }

    const [machines, materials] = await Promise.all([getMachines(), getMaterials()]);
    const jobResults = jobs.map(j => {
      const machine  = machines.find(m => m.id === j.machineId);
      const material = materials.find(m => m.id === j.materialId);
      return computeJobCost(j, machine, material);
    });
    const invalid    = jobResults.findIndex(r => r === null);
    if (invalid !== -1) {
      const j = jobs[invalid];
      showInlineError('jobFormError', `⚠️ Lavorazione ${invalid + 1}${j.label ? ' (' + j.label + ')' : ''}: seleziona una macchina e un materiale validi.`);
      return;
    }
    hideInlineError('jobFormError');

    const g = id => document.getElementById(id);
    const manualHours       = Number(g('manualHours').value      || 0);
    const laborRate         = Number(g('laborRate').value        || 0);
    const failureMargin     = Number(g('failureMargin').value    || 0);
    const profitMargin      = Number(g('profitMargin').value     || 0);
    const discountAmount    = Number(g('discountAmount').value   || 0);
    const minimumPrice      = Number(g('minimumPrice').value     || 0);
    const vatPercent        = Number(g('vatPercent').value       || 0);
    const includeVat        = g('includeVat').checked;
    const includeShipping   = g('includeShipping').checked;
    const shippingCost      = includeShipping ? Number(g('shippingCost').value     || 0) : 0;
    const shippingType      = includeShipping ? g('shippingType').value               : '';
    const includeInsurance  = includeShipping && g('includeInsurance').checked;
    const insuranceCost     = includeInsurance ? Number(g('insuranceCost').value  || 0) : 0;
    const deliveryDaysMin   = includeShipping ? Number(g('deliveryDaysMin').value || 1) : 0;
    const deliveryDaysMax   = includeShipping ? Number(g('deliveryDaysMax').value || 1) : 0;
    const shippingNotes     = includeShipping ? g('shippingNotes').value.trim()         : '';

    const shippingParams = {
      manualHours, laborRate, failureMargin, profitMargin,
      discountAmount, minimumPrice, vatPercent, includeVat,
      includeShipping, shippingCost, includeInsurance, insuranceCost,
    };
    const q = computeQuote(jobResults, shippingParams);

    const result = {
      version: 'hybrid-v3',
      jobName: g('jobName').value.trim(), clientName: g('clientName').value.trim(),
      clientContact: g('clientContact').value.trim(), quoteDate: g('quoteDate').value || todayString(),
      jobResults, totalPiecesAll: q.totalPiecesAll, unitPriceClient: q.unitPriceClient,
      manualHours, laborRate, manualLaborCost: q.manualLaborCost,
      failureMargin, profitMargin, discountAmount, minimumPrice, vatPercent, includeVat,
      includeShipping, shippingCost, shippingType, includeInsurance, insuranceCost,
      shippingTotal: q.shippingTotal, deliveryDaysMin, deliveryDaysMax, shippingNotes,
      materialCostTotal: q.materialCostTotal, energyCostTotal: q.energyCostTotal,
      maintenanceCostTotal: q.maintenanceCostTotal, machineAmortCostTotal: q.machineAmortCostTotal,
      baseTechnicalTotal: q.baseTechnicalTotal, baseTotal: q.baseTotal,
      failureCost: q.failureCost, adjustedTotal: q.adjustedTotal, profitValue: q.profitValue,
      priceBeforeDiscount: q.priceBeforeDiscount, discountValue: q.discountValue,
      priceAfterDiscount: q.priceAfterDiscount, priceAfterMinimum: q.priceAfterMinimum,
      vatValue: q.vatValue, priceWithVat: q.priceWithVat, finalRecommendedPrice: q.finalRecommendedPrice,
    };

    await saveData(STORAGE_KEYS.currentJob, {
      version: 'hybrid-v3', jobName: result.jobName, clientName: result.clientName,
      clientContact: result.clientContact, quoteDate: result.quoteDate,
      manualHours, laborRate, failureMargin, profitMargin,
      discountAmount, minimumPrice, vatPercent, includeVat,
      includeShipping, shippingCost, shippingType, includeInsurance, insuranceCost,
      deliveryDaysMin, deliveryDaysMax, shippingNotes, result,
    });

    renderSummary(result);
    activateTab('tab-riepilogo');

    // Salva automaticamente in archivio
    const currentJobData = {
      version: 'hybrid-v3', jobName: result.jobName, clientName: result.clientName,
      clientContact: result.clientContact, quoteDate: result.quoteDate,
      manualHours, laborRate, failureMargin, profitMargin,
      discountAmount, minimumPrice, vatPercent, includeVat,
      includeShipping, shippingCost, shippingType, includeInsurance, insuranceCost,
      deliveryDaysMin, deliveryDaysMax, shippingNotes,
      jobsList: jobs, // snapshot delle lavorazioni per ripristino futuro
      result,
    };
    archiveSave(currentJobData, result).then(() => renderArchive());
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  // 1. Storage + tema (prima di tutto per evitare flash)
  await initStorage();
  await seedDefaultsIfFirstRun();
  await initTheme();

  // 2. Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // 3. Shipping toggle
  document.getElementById('includeShipping').addEventListener('change',  updateShippingUI);
  document.getElementById('includeInsurance').addEventListener('change', updateShippingUI);

  // 4. Moduli
  initMachinesHandlers();
  initMaterialsHandlers();
  initJobsHandlers();
  initProfileHandlers();
  initPdfHandler();
  initScenarioHandlers();
  initArchiveHandlers({ restoreCurrentJob, renderJobs, activateTab, generatePdf });
  initIoHandlers({ renderMachines, renderMaterials, restoreProfile, renderJobs, restoreCurrentJob, activateTab });
  initJobFormHandler();

  // 5. Render iniziale (parallelo dove possibile)
  const dateInput = document.getElementById('quoteDate');
  if (dateInput && !dateInput.value) dateInput.value = todayString();
  updateMaterialFormUI();
  updateShippingUI();

  await Promise.all([
    renderMachines(),
    renderMaterials(),
    restoreProfile(),
    renderArchive(),
  ]);
  await renderJobs();
  await restoreCurrentJob();

  // 6. Ripristina ultimo riepilogo calcolato
  const saved = await loadData(STORAGE_KEYS.currentJob, {});
  if (saved.result) renderSummary(saved.result);
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    const TAB_MAP = { '1':'tab-profilo','2':'tab-macchine','3':'tab-lavoro','4':'tab-riepilogo','5':'tab-archivio','6':'tab-dati' };
    if (TAB_MAP[e.key]) { e.preventDefault(); activateTab(TAB_MAP[e.key]); return; }
    if (e.key === 's') { e.preventDefault(); document.getElementById('jobForm')?.requestSubmit(); return; }
    if (e.key === 'p') { e.preventDefault(); if (window.__lastQuoteResult) document.getElementById('exportPdfBtn')?.click(); return; }
  });

  // Deep-link da PWA shortcut o link diretto (es. #tab-lavoro)
  const validTabs = ['tab-profilo','tab-macchine','tab-lavoro','tab-riepilogo','tab-archivio','tab-dati'];
  const hashTab = window.location.hash.replace('#', '');
  if (validTabs.includes(hashTab)) activateTab(hashTab);
  window.addEventListener('hashchange', () => {
    const t = window.location.hash.replace('#', '');
    if (validTabs.includes(t)) activateTab(t);
  });
}

init().catch(err => {
  console.error('[Preventivator] Errore avvio:', err);
  // Mostra l'errore in modo visibile invece di lasciare la pagina bloccata in silenzio
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:14px 20px;font-family:system-ui,sans-serif;font-size:13px;z-index:99999;text-align:center;';
  banner.textContent = '⚠️ Errore di avvio: ' + (err?.message || err) + ' — Prova a fare un hard refresh (Ctrl+Shift+R) o svuota i dati del sito dalle impostazioni del browser.';
  document.body.prepend(banner);
});

// ── Service Worker ────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js', {
        scope: './',
      });

      // Notifica aggiornamento disponibile
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nuova versione disponibile: mostra banner
            showUpdateBanner(newWorker);
          }
        });
      });

      console.info('[SW] Registrato con scope:', reg.scope);
    } catch (err) {
      console.warn('[SW] Registrazione non riuscita (normale in locale su file://):', err.message);
    }
  });
}

function showUpdateBanner(newWorker) {
  const banner = document.createElement('div');
  banner.id    = 'updateBanner';
  banner.innerHTML = `
    <span>🔄 Nuova versione disponibile</span>
    <button id="updateNowBtn" class="primary" style="padding:6px 14px;font-size:13px;">Aggiorna ora</button>
  `;
  banner.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    background:var(--surface);color:var(--text);padding:12px 20px;border-radius:12px;
    display:flex;align-items:center;gap:14px;z-index:9998;
    box-shadow:var(--shadow-lg);font-size:14px;font-weight:600;
    border:1px solid var(--border);
  `;
  document.body.appendChild(banner);

  document.getElementById('updateNowBtn').addEventListener('click', () => {
    newWorker.postMessage('skipWaiting');
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    banner.remove();
  });
}
