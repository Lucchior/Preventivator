/**
 * app.js — Preventivator
 * Punto di ingresso dell'applicazione.
 * Importa tutti i moduli e coordina l'inizializzazione.
 */

import { loadData, saveData, STORAGE_KEYS } from './storage.js';
import { getMachines, getMaterials, getJobs } from './models.js';
import { computeJobCost }                   from './calc.js';
import { todayString }                      from './utils.js';
import { renderMachines, initMachinesHandlers } from './ui-machines.js';
import { renderMaterials, initMaterialsHandlers, updateMaterialFormUI } from './ui-materials.js';
import { renderJobs, initJobsHandlers }     from './ui-jobs.js';
import { renderSummary }                    from './ui-summary.js';
import { restoreProfile, initProfileHandlers } from './ui-profile.js';
import { initPdfHandler }                   from './ui-pdf.js';
import { initIoHandlers }                   from './ui-io.js';

// ── Tab navigation ────────────────────────────────────────────────────────────
export function activateTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b  => b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === id));
}

// ── Restore job form from localStorage ───────────────────────────────────────
export function restoreCurrentJob() {
  const saved = loadData(STORAGE_KEYS.currentJob, null);

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

  set('jobName',        saved.jobName        || '');
  set('clientName',     saved.clientName     || '');
  set('clientContact',  saved.clientContact  || '');
  set('quoteDate',      saved.quoteDate      || todayString());
  set('manualHours',    saved.manualHours,      0);
  set('laborRate',      saved.laborRate,         0);
  set('failureMargin',  saved.failureMargin,     8);
  set('profitMargin',   saved.profitMargin,      100);
  set('discountAmount', saved.discountAmount,    0);
  set('minimumPrice',   saved.minimumPrice,      0);
  set('vatPercent',     saved.vatPercent,        22);
  set('includeVat',     saved.includeVat,        true);
  set('includeShipping',  saved.includeShipping, false);
  set('shippingCost',     saved.shippingCost,    0);
  set('shippingType',     saved.shippingType,    'standard');
  set('includeInsurance', saved.includeInsurance, false);
  set('insuranceCost',    saved.insuranceCost,   0);
  set('deliveryDaysMin',  saved.deliveryDaysMin, 3);
  set('deliveryDaysMax',  saved.deliveryDaysMax, 5);
  set('shippingNotes',    saved.shippingNotes,   '');

  updateShippingUI();
  if (saved.result) renderSummary(saved.result);
}

// ── Shipping UI toggle ────────────────────────────────────────────────────────
function updateShippingUI() {
  const on = document.getElementById('includeShipping').checked;
  document.getElementById('shippingFields').classList.toggle('hidden', !on);
  const insured = on && document.getElementById('includeInsurance').checked;
  document.getElementById('insuranceCostWrap').style.display = insured ? 'block' : 'none';
}

// ── Job form submit (calcolo preventivo) ──────────────────────────────────────
function initJobFormHandler() {
  const jobForm = document.getElementById('jobForm');

  jobForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const jobs = getJobs();
    if (!jobs.length) { alert('Aggiungi almeno una lavorazione prima di calcolare.'); return; }

    const machines  = getMachines();
    const materials = getMaterials();

    const jobResults = jobs.map(j => computeJobCost(j, machines, materials));
    const invalid    = jobResults.findIndex(r => r === null);
    if (invalid !== -1) {
      const j = jobs[invalid];
      alert(`Lavorazione ${invalid + 1}${j.label ? ' (' + j.label + ')' : ''}: seleziona una macchina e un materiale validi.`);
      return;
    }

    const g = id => document.getElementById(id);
    const manualHours      = Number(g('manualHours').value      || 0);
    const laborRate        = Number(g('laborRate').value        || 0);
    const failureMargin    = Number(g('failureMargin').value    || 0);
    const profitMargin     = Number(g('profitMargin').value     || 0);
    const discountAmount   = Number(g('discountAmount').value   || 0);
    const minimumPrice     = Number(g('minimumPrice').value     || 0);
    const vatPercent       = Number(g('vatPercent').value       || 0);
    const includeVat       = g('includeVat').checked;
    const includeShipping  = g('includeShipping').checked;
    const shippingCost     = includeShipping ? Number(g('shippingCost').value || 0) : 0;
    const shippingType     = includeShipping ? g('shippingType').value : '';
    const includeInsurance = includeShipping && g('includeInsurance').checked;
    const insuranceCost    = includeInsurance ? Number(g('insuranceCost').value || 0) : 0;
    const deliveryDaysMin  = includeShipping ? Number(g('deliveryDaysMin').value || 1) : 0;
    const deliveryDaysMax  = includeShipping ? Number(g('deliveryDaysMax').value || 1) : 0;
    const shippingNotes    = includeShipping ? g('shippingNotes').value.trim() : '';
    const shippingTotal    = shippingCost + insuranceCost;

    // Sequenza di calcolo (documentata in calc.js)
    const baseTechnicalTotal  = jobResults.reduce((s, r) => s + r.subtotal, 0);
    const manualLaborCost     = manualHours * laborRate;
    const baseTotal           = baseTechnicalTotal + manualLaborCost;
    const failureCost         = baseTotal * (failureMargin / 100);
    const adjustedTotal       = baseTotal + failureCost;
    const profitValue         = adjustedTotal * (profitMargin / 100);
    const priceBeforeDiscount = adjustedTotal + profitValue;
    const discountValue       = Math.min(discountAmount, priceBeforeDiscount);
    const priceAfterDiscount  = priceBeforeDiscount - discountValue;
    const priceAfterMinimum   = Math.max(priceAfterDiscount, minimumPrice);
    const vatValue            = includeVat ? priceAfterMinimum * (vatPercent / 100) : 0;
    const priceWithVat        = priceAfterMinimum + vatValue;
    const finalRecommendedPrice = priceWithVat + shippingTotal;

    const totalPiecesAll  = jobResults.reduce((s, r) => s + r.totalPieces, 0);
    const unitPriceClient = totalPiecesAll > 0 ? priceWithVat / totalPiecesAll : null;

    const result = {
      version: 'hybrid-v3',
      jobName:       g('jobName').value.trim(),
      clientName:    g('clientName').value.trim(),
      clientContact: g('clientContact').value.trim(),
      quoteDate:     g('quoteDate').value || todayString(),
      jobResults, totalPiecesAll, unitPriceClient,
      manualHours, laborRate, manualLaborCost,
      failureMargin, profitMargin, discountAmount, minimumPrice, vatPercent, includeVat,
      includeShipping, shippingCost, shippingType, includeInsurance, insuranceCost,
      shippingTotal, deliveryDaysMin, deliveryDaysMax, shippingNotes,
      materialCostTotal:     jobResults.reduce((s, r) => s + r.materialCost,    0),
      energyCostTotal:       jobResults.reduce((s, r) => s + r.energyCost,      0),
      maintenanceCostTotal:  jobResults.reduce((s, r) => s + r.maintenanceCost, 0),
      machineAmortCostTotal: jobResults.reduce((s, r) => s + r.amortCost,       0),
      baseTechnicalTotal, baseTotal, failureCost, adjustedTotal, profitValue,
      priceBeforeDiscount, discountValue, priceAfterDiscount, priceAfterMinimum,
      vatValue, priceWithVat, finalRecommendedPrice,
    };

    saveData(STORAGE_KEYS.currentJob, {
      version: 'hybrid-v3',
      jobName: result.jobName, clientName: result.clientName,
      clientContact: result.clientContact, quoteDate: result.quoteDate,
      manualHours, laborRate, failureMargin, profitMargin,
      discountAmount, minimumPrice, vatPercent, includeVat,
      includeShipping, shippingCost, shippingType, includeInsurance, insuranceCost,
      deliveryDaysMin, deliveryDaysMax, shippingNotes, result,
    });

    renderSummary(result);
    activateTab('tab-riepilogo');
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Shipping toggle
  document.getElementById('includeShipping').addEventListener('change',  updateShippingUI);
  document.getElementById('includeInsurance').addEventListener('change', updateShippingUI);

  // Module handlers
  initMachinesHandlers();
  initMaterialsHandlers();
  initJobsHandlers();
  initProfileHandlers();
  initPdfHandler();
  initIoHandlers({ renderMachines, renderMaterials, restoreProfile, renderJobs, restoreCurrentJob, activateTab });
  initJobFormHandler();

  // Initial render
  const dateInput = document.getElementById('quoteDate');
  if (dateInput && !dateInput.value) dateInput.value = todayString();
  updateMaterialFormUI();
  updateShippingUI();
  renderMachines();
  renderMaterials();
  renderJobs();
  restoreProfile();
  restoreCurrentJob();
  renderSummary(loadData(STORAGE_KEYS.currentJob, {}).result || null);
}

// Avvia quando il DOM è pronto (type="module" è già deferred di default)
init();
