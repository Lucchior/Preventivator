/**
 * calc.js — Preventivator
 * Logica di calcolo pura. Zero dipendenze da DOM, localStorage o altri moduli.
 * Tutte le funzioni sono testate in tests/calc.test.js.
 *
 * @version 1.0.0
 */

// ── Costo singola lavorazione ─────────────────────────────────────────────────

/**
 * Calcola il costo reale di una singola lavorazione (3D o laser).
 * @param {Object} job      - Lavorazione dal modello dati
 * @param {Object} machine  - Macchina già risolta
 * @param {Object} material - Materiale già risolto
 * @returns {Object|null}
 */
export function computeJobCost(job, machine, material) {
  if (!job || !machine || !material) return null;

  const hoursPerUnit = (Number(job.days)    || 0) * 24
                     + (Number(job.hours)   || 0)
                     + (Number(job.minutes) || 0) / 60;
  const unitCount   = Math.max(Number(job.unitCount)    || 1, 1);
  const totalHours  = hoursPerUnit * unitCount;
  const totalPieces = Math.max(Number(job.piecesPerUnit) || 1, 1) * unitCount;

  // ── Costo materiale ────────────────────────────────────────────────
  let materialCost = 0;
  let totalGrams   = 0;
  let totalQty     = 0;

  if (job.type === '3d') {
    totalGrams   = (Number(job.gramsPerUnit)       || 0) * unitCount;
    materialCost = (totalGrams / 1000) * Number(material.unitCost || 0);
  } else {
    totalQty     = (Number(job.materialQtyPerUnit) || 0) * unitCount;
    materialCost = totalQty * Number(material.unitCost || 0);
  }

  // ── Energia: (kWh / ogni_h) × ore_totali × costo_kwh ─────────────
  const powerEveryH = Number(machine.powerEveryH);
  const powerRate   = powerEveryH > 0
    ? Number(machine.powerKwh || 0) / powerEveryH
    : 0;
  const energyCost = totalHours * powerRate * Number(machine.energyCost || 0);

  // ── Manutenzione: (ore / 1000) × costo_ogni_1000h ─────────────────
  const maintenanceCost = (totalHours / 1000) * Number(machine.maintenanceCost || 0);

  // ── Ammortamento: ore × (costo_macchina / vita_utile) ─────────────
  const lifetimeHours = Number(machine.lifetimeHours);
  const amortRate     = lifetimeHours > 0
    ? Number(machine.machineCost || 0) / lifetimeHours
    : 0;
  const amortCost = totalHours * amortRate;

  // ── Componente extra (moltiplicato per le ripetizioni) ────────────
  const extraCost = Number(job.extraMaterialCost || 0) * unitCount;

  const subtotal = materialCost + energyCost + maintenanceCost + amortCost + extraCost;

  return {
    job, machine, material,
    hoursPerUnit, totalHours, totalPieces,
    materialCost, energyCost, maintenanceCost, amortCost, extraCost,
    subtotal, totalGrams, totalQty,
  };
}

// ── Preventivo completo ───────────────────────────────────────────────────────

/**
 * Calcola il preventivo aggregando i risultati delle singole lavorazioni.
 * Sequenza: costo reale → manodopera → fallimento → rincaro → sconto → minimo → IVA → spedizione
 *
 * @param {Array}  jobResults - Risultati da computeJobCost()
 * @param {Object} params
 */
export function computeQuote(jobResults, params) {
  const {
    manualHours      = 0,
    laborRate        = 0,
    failureMargin    = 0,
    profitMargin     = 0,
    discountAmount   = 0,
    minimumPrice     = 0,
    vatPercent       = 22,
    includeVat       = true,
    includeShipping  = false,
    shippingCost     = 0,
    includeInsurance = false,
    insuranceCost    = 0,
  } = params;

  // 1. Somma costi tecnici di tutte le lavorazioni
  const baseTechnicalTotal = jobResults.reduce((s, r) => s + r.subtotal, 0);

  // 2. + Manodopera manuale
  const manualLaborCost = Number(manualHours) * Number(laborRate);
  const baseTotal       = baseTechnicalTotal + manualLaborCost;

  // 3. + Margine fallimento % (copre stampe da rifare)
  const failureCost   = baseTotal * (Number(failureMargin) / 100);
  const adjustedTotal = baseTotal + failureCost;

  // 4. + Rincaro/guadagno %
  const profitValue         = adjustedTotal * (Number(profitMargin) / 100);
  const priceBeforeDiscount = adjustedTotal + profitValue;

  // 5. - Sconto cliente (non può rendere il prezzo negativo)
  const discountValue      = Math.min(Number(discountAmount), priceBeforeDiscount);
  const priceAfterDiscount = priceBeforeDiscount - discountValue;

  // 6. Prezzo minimo garantito (floor)
  const priceAfterMinimum = Math.max(priceAfterDiscount, Number(minimumPrice));

  // 7. + IVA (sul netto prodotto, prima della spedizione)
  const vatValue     = includeVat ? priceAfterMinimum * (Number(vatPercent) / 100) : 0;
  const priceWithVat = priceAfterMinimum + vatValue;

  // 8. + Spedizione (fuori dai margini: è un rimborso, non un ricavo)
  const shippingTotal         = includeShipping
    ? Number(shippingCost) + (includeInsurance ? Number(insuranceCost) : 0)
    : 0;
  const finalRecommendedPrice = priceWithVat + shippingTotal;

  // Statistiche
  const totalPiecesAll  = jobResults.reduce((s, r) => s + r.totalPieces, 0);
  const unitPriceClient = totalPiecesAll > 0 ? priceWithVat / totalPiecesAll : null;

  const materialCostTotal     = jobResults.reduce((s, r) => s + r.materialCost, 0);
  const energyCostTotal       = jobResults.reduce((s, r) => s + r.energyCost, 0);
  const maintenanceCostTotal  = jobResults.reduce((s, r) => s + r.maintenanceCost, 0);
  const machineAmortCostTotal = jobResults.reduce((s, r) => s + r.amortCost, 0);

  return {
    materialCostTotal, energyCostTotal, maintenanceCostTotal, machineAmortCostTotal,
    baseTechnicalTotal,
    manualLaborCost, baseTotal,
    failureCost, adjustedTotal,
    profitValue, priceBeforeDiscount,
    discountValue, priceAfterDiscount,
    priceAfterMinimum,
    vatValue, priceWithVat,
    shippingTotal, finalRecommendedPrice,
    totalPiecesAll, unitPriceClient,
  };
}
