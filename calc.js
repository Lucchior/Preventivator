/**
 * calc.js — Preventivator
 * Logica di calcolo pura, senza dipendenze da DOM o localStorage.
 * Ogni funzione è testabile in isolamento.
 *
 * @version 1.0.0
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
// COSTO SINGOLA LAVORAZIONE
// ─────────────────────────────────────────────────────────────────

/**
 * Calcola il costo reale di una singola lavorazione (3D o laser).
 *
 * @param {Object} job      - Lavorazione dal modello dati
 * @param {Object} machine  - Macchina già risolta (non array)
 * @param {Object} material - Materiale già risolto (non array)
 * @returns {Object|null}   - Risultato dettagliato, o null se dati mancanti
 */
function computeJobCost(job, machine, material) {
  if (!job || !machine || !material) return null;

  const hoursPerUnit = (Number(job.days) || 0) * 24
                     + (Number(job.hours) || 0)
                     + (Number(job.minutes) || 0) / 60;
  const unitCount  = Math.max(Number(job.unitCount) || 1, 1);
  const totalHours = hoursPerUnit * unitCount;
  const totalPieces = Math.max(Number(job.piecesPerUnit) || 1, 1) * unitCount;

  // ── Costo materiale ──────────────────────────────────────────────
  let materialCost = 0;
  let totalGrams   = 0;
  let totalQty     = 0;

  if (job.type === '3d') {
    totalGrams   = (Number(job.gramsPerUnit) || 0) * unitCount;
    materialCost = (totalGrams / 1000) * Number(material.unitCost || 0);
  } else {
    totalQty     = (Number(job.materialQtyPerUnit) || 0) * unitCount;
    materialCost = totalQty * Number(material.unitCost || 0);
  }

  // ── Energia: (kWh / ogni_h) × ore × costo ───────────────────────
  const powerEveryH = Number(machine.powerEveryH);
  const powerRate   = powerEveryH > 0
    ? Number(machine.powerKwh || 0) / powerEveryH
    : 0;
  const energyCost = totalHours * powerRate * Number(machine.energyCost || 0);

  // ── Manutenzione: (ore / 1000) × costo_ogni_1000h ───────────────
  const maintenanceCost = (totalHours / 1000) * Number(machine.maintenanceCost || 0);

  // ── Ammortamento: ore × (costo_macchina / vita_utile) ────────────
  const lifetimeHours = Number(machine.lifetimeHours);
  const amortRate  = lifetimeHours > 0
    ? Number(machine.machineCost || 0) / lifetimeHours
    : 0;
  const amortCost  = totalHours * amortRate;

  // ── Componente extra (moltiplicato per le ripetizioni) ───────────
  const extraCost = Number(job.extraMaterialCost || 0) * unitCount;

  const subtotal = materialCost + energyCost + maintenanceCost + amortCost + extraCost;

  return {
    job, machine, material,
    hoursPerUnit, totalHours, totalPieces,
    materialCost, energyCost, maintenanceCost, amortCost, extraCost,
    subtotal, totalGrams, totalQty,
  };
}

// ─────────────────────────────────────────────────────────────────
// PREVENTIVO COMPLETO
// ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} QuoteParams
 * @property {number}  manualHours       - Ore di manodopera manuale
 * @property {number}  laborRate         - Tariffa oraria manodopera (€/h)
 * @property {number}  failureMargin     - Margine fallimento (%)
 * @property {number}  profitMargin      - Rincaro/guadagno (%)
 * @property {number}  discountAmount    - Sconto fisso (€)
 * @property {number}  minimumPrice      - Prezzo minimo garantito (€)
 * @property {number}  vatPercent        - Aliquota IVA (%)
 * @property {boolean} includeVat        - Applica IVA al totale
 * @property {boolean} includeShipping   - Includi spedizione
 * @property {number}  shippingCost      - Costo spedizione base (€)
 * @property {boolean} includeInsurance  - Includi assicurazione spedizione
 * @property {number}  insuranceCost     - Costo assicurazione (€)
 */

/**
 * Calcola il preventivo completo a partire dai risultati per lavorazione.
 * Sequenza rigorosa e documentata nei commenti inline.
 *
 * @param {Array}       jobResults  - Array di risultati da computeJobCost()
 * @param {QuoteParams} params
 * @returns {Object}                - Risultato completo del preventivo
 */
function computeQuote(jobResults, params) {
  const {
    manualHours     = 0,
    laborRate       = 0,
    failureMargin   = 0,
    profitMargin    = 0,
    discountAmount  = 0,
    minimumPrice    = 0,
    vatPercent      = 22,
    includeVat      = true,
    includeShipping = false,
    shippingCost    = 0,
    includeInsurance = false,
    insuranceCost   = 0,
  } = params;

  // 1. Somma costi tecnici di tutte le lavorazioni
  const baseTechnicalTotal = jobResults.reduce((s, r) => s + r.subtotal, 0);

  // 2. + Manodopera manuale
  const manualLaborCost = Number(manualHours) * Number(laborRate);
  const baseTotal       = baseTechnicalTotal + manualLaborCost;

  // 3. + Margine fallimento % (sul totale base: copre stampe da rifare)
  const failureCost   = baseTotal * (Number(failureMargin) / 100);
  const adjustedTotal = baseTotal + failureCost;

  // 4. + Rincaro/guadagno % (sul costo totale corretto)
  const profitValue        = adjustedTotal * (Number(profitMargin) / 100);
  const priceBeforeDiscount = adjustedTotal + profitValue;

  // 5. - Sconto cliente (importo fisso; non può rendere il prezzo negativo)
  const discountValue  = Math.min(Number(discountAmount), priceBeforeDiscount);
  const priceAfterDiscount = priceBeforeDiscount - discountValue;

  // 6. Prezzo minimo garantito (floor)
  const priceAfterMinimum = Math.max(priceAfterDiscount, Number(minimumPrice));

  // 7. + IVA (calcolata solo sul netto prodotto, prima della spedizione)
  const vatValue    = includeVat ? priceAfterMinimum * (Number(vatPercent) / 100) : 0;
  const priceWithVat = priceAfterMinimum + vatValue;

  // 8. + Spedizione (fuori dai margini: è un rimborso, non un ricavo)
  const shippingTotal       = includeShipping
    ? Number(shippingCost) + (includeInsurance ? Number(insuranceCost) : 0)
    : 0;
  const finalRecommendedPrice = priceWithVat + shippingTotal;

  // Statistiche aggregate
  const totalPiecesAll = jobResults.reduce((s, r) => s + r.totalPieces, 0);
  const unitPriceClient = totalPiecesAll > 0 ? priceWithVat / totalPiecesAll : null;

  const materialCostTotal     = jobResults.reduce((s, r) => s + r.materialCost, 0);
  const energyCostTotal       = jobResults.reduce((s, r) => s + r.energyCost, 0);
  const maintenanceCostTotal  = jobResults.reduce((s, r) => s + r.maintenanceCost, 0);
  const machineAmortCostTotal = jobResults.reduce((s, r) => s + r.amortCost, 0);

  return {
    // Aggregati lavorazioni
    materialCostTotal, energyCostTotal, maintenanceCostTotal, machineAmortCostTotal,
    baseTechnicalTotal,
    // Calcolo sequenziale
    manualLaborCost, baseTotal,
    failureCost, adjustedTotal,
    profitValue, priceBeforeDiscount,
    discountValue, priceAfterDiscount,
    priceAfterMinimum,
    vatValue, priceWithVat,
    shippingTotal, finalRecommendedPrice,
    // Statistiche
    totalPiecesAll, unitPriceClient,
  };
}

// Esportazione (compatibile sia con CommonJS per i test che con ES modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeJobCost, computeQuote };
}
