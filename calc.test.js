'use strict';

const { computeJobCost, computeQuote } = require('../calc.js');

// ─────────────────────────────────────────────────────────────────
// FIXTURES — dati di test riutilizzabili
// ─────────────────────────────────────────────────────────────────

const machine3d = {
  id: 'm1', type: '3d', name: 'Stampante Test',
  machineCost: 1200,   // €
  lifetimeHours: 8000, // h  → ammortamento = 0.15 €/h
  energyCost: 0.25,    // €/kWh
  powerKwh: 1,         // kWh ogni...
  powerEveryH: 4,      // ...4 ore → 0.25 kW → 0.0625 €/h
  maintenanceCost: 80, // € ogni 1000h → 0.08 €/h
};

const machineLaser = {
  id: 'm2', type: 'laser', name: 'Laser Test',
  machineCost: 2000,
  lifetimeHours: 10000, // ammortamento = 0.20 €/h
  energyCost: 0.25,
  powerKwh: 1,
  powerEveryH: 2,        // 0.5 kW → 0.125 €/h
  maintenanceCost: 100,  // 0.10 €/h
};

const material3d = { id: 'mat1', type: '3d', name: 'PLA 1kg', unit: 'kg', unitCost: 20 };
const materialLaser = { id: 'mat2', type: 'laser', name: 'MDF 3mm', unit: 'foglio', unitCost: 5 };

function makeJob3d(overrides = {}) {
  return {
    id: 'j1', type: '3d',
    machineId: 'm1', materialId: 'mat1',
    piecesPerUnit: 10, unitCount: 2,
    gramsPerUnit: 100,  // 100g × 2 piatti = 200g = 0.2 kg → 4€ materiale
    materialQtyPerUnit: 0,
    days: 0, hours: 5, minutes: 0,  // 5h × 2 = 10h totali
    extraMaterialCost: 0,
    extraMaterialLabel: '',
    ...overrides,
  };
}

function makeJobLaser(overrides = {}) {
  return {
    id: 'j2', type: 'laser',
    machineId: 'm2', materialId: 'mat2',
    piecesPerUnit: 4, unitCount: 3,
    gramsPerUnit: 0,
    materialQtyPerUnit: 2,  // 2 fogli × 3 lavorazioni = 6 fogli → 30€ materiale
    days: 0, hours: 2, minutes: 0,  // 2h × 3 = 6h totali
    extraMaterialCost: 0,
    extraMaterialLabel: '',
    ...overrides,
  };
}

const defaultParams = {
  manualHours: 0, laborRate: 0,
  failureMargin: 0, profitMargin: 0,
  discountAmount: 0, minimumPrice: 0,
  vatPercent: 22, includeVat: false,
  includeShipping: false, shippingCost: 0,
  includeInsurance: false, insuranceCost: 0,
};

// ─────────────────────────────────────────────────────────────────
// MICRO HELPERS
// ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function round2(n) { return Math.round(n * 100) / 100; }

function expect(label, actual, expected, tolerance = 0.01) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`       atteso:   ${expected}`);
    console.error(`       ottenuto: ${actual}`);
    failed++;
  }
}

function expectNull(label, actual) {
  if (actual === null) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label} — atteso null, ottenuto: ${JSON.stringify(actual)}`);
    failed++;
  }
}

function expectBool(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label} — atteso: ${expected}, ottenuto: ${actual}`);
    failed++;
  }
}

function section(title) { console.log(`\n─── ${title} ───`); }

// ─────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────

section('1. computeJobCost — dati mancanti');
{
  expectNull('ritorna null se machineId non trovato',
    computeJobCost(makeJob3d(), null, material3d));
  expectNull('ritorna null se materialId non trovato',
    computeJobCost(makeJob3d(), machine3d, null));
  expectNull('ritorna null se job è null',
    computeJobCost(null, machine3d, material3d));
}

section('2. computeJobCost — lavorazione 3D base');
{
  // Job: 100g/piatto × 2 piatti = 200g = 0.2 kg → 0.2 × 20 = 4 €
  // Ore: 5h/piatto × 2 = 10h totali
  // Energia: 10h × (1kWh/4h) × 0.25€/kWh = 10 × 0.25 × 0.25 = 0.625 €
  // Manutenzione: (10/1000) × 80 = 0.80 €
  // Ammortamento: 10 × (1200/8000) = 10 × 0.15 = 1.50 €
  // Extra: 0
  // Subtotale: 4 + 0.625 + 0.80 + 1.50 = 6.925 €

  const r = computeJobCost(makeJob3d(), machine3d, material3d);
  expect('materialCost = 4.00 €',    r.materialCost,    4.00);
  expect('energyCost = 0.625 €',     r.energyCost,      0.625);
  expect('maintenanceCost = 0.80 €', r.maintenanceCost, 0.80);
  expect('amortCost = 1.50 €',       r.amortCost,       1.50);
  expect('extraCost = 0 €',          r.extraCost,       0);
  expect('subtotal = 6.925 €',       r.subtotal,        6.925);
  expect('totalHours = 10 h',        r.totalHours,      10);
  expect('totalPieces = 20',         r.totalPieces,     20);  // 10 pz × 2 piatti
  expect('totalGrams = 200 g',       r.totalGrams,      200);
}

section('3. computeJobCost — lavorazione laser base');
{
  // Materiale: 2 fogli × 3 lav × 5€/foglio = 30 €
  // Ore: 2h × 3 = 6h totali
  // Energia: 6 × (1/2) × 0.25 = 0.75 €
  // Manutenzione: (6/1000) × 100 = 0.60 €
  // Ammortamento: 6 × (2000/10000) = 6 × 0.20 = 1.20 €
  // Subtotale: 30 + 0.75 + 0.60 + 1.20 = 32.55 €

  const r = computeJobCost(makeJobLaser(), machineLaser, materialLaser);
  expect('materialCost = 30 €',       r.materialCost,    30);
  expect('energyCost = 0.75 €',       r.energyCost,      0.75);
  expect('maintenanceCost = 0.60 €',  r.maintenanceCost, 0.60);
  expect('amortCost = 1.20 €',        r.amortCost,       1.20);
  expect('subtotal = 32.55 €',        r.subtotal,        32.55);
  expect('totalHours = 6 h',          r.totalHours,      6);
  expect('totalPieces = 12',          r.totalPieces,     12);  // 4 pz × 3 lav
}

section('4. computeJobCost — durata con giorni e minuti');
{
  // 1g 2h 30min = 24 + 2 + 0.5 = 26.5h per unità × 2 = 53h totali
  const job = makeJob3d({ days: 1, hours: 2, minutes: 30, unitCount: 2 });
  const r = computeJobCost(job, machine3d, material3d);
  expect('hoursPerUnit = 26.5 h', r.hoursPerUnit, 26.5);
  expect('totalHours = 53 h',     r.totalHours,   53);
}

section('5. computeJobCost — componente extra');
{
  // extraMaterialCost = 3.50€ × 2 ripetizioni = 7€
  const job = makeJob3d({ extraMaterialCost: 3.50, unitCount: 2 });
  const r = computeJobCost(job, machine3d, material3d);
  expect('extraCost = 7 €', r.extraCost, 7.00);
  expect('subtotal include extra', r.subtotal, r.materialCost + r.energyCost + r.maintenanceCost + r.amortCost + 7.00);
}

section('6. computeJobCost — vita utile macchina zero (no divisione per zero)');
{
  const machineNoLife = { ...machine3d, lifetimeHours: 0 };
  const r = computeJobCost(makeJob3d(), machineNoLife, material3d);
  expect('amortCost = 0 se lifetimeHours=0', r.amortCost, 0);
}

section('7. computeJobCost — consumo energia zero');
{
  const machineNoEnergy = { ...machine3d, powerKwh: 0 };
  const r = computeJobCost(makeJob3d(), machineNoEnergy, material3d);
  expect('energyCost = 0 se powerKwh=0', r.energyCost, 0);
}

section('8. computeJobCost — powerEveryH zero (no divisione per zero)');
{
  const machineBadPower = { ...machine3d, powerEveryH: 0 };
  const r = computeJobCost(makeJob3d(), machineBadPower, material3d);
  expect('energyCost = 0 se powerEveryH=0', r.energyCost, 0);
}

section('9. computeQuote — sequenza calcolo base (nessun margine)');
{
  const jr3d   = computeJobCost(makeJob3d(),    machine3d,    material3d);
  const jrLaser = computeJobCost(makeJobLaser(), machineLaser, materialLaser);
  const q = computeQuote([jr3d, jrLaser], defaultParams);

  // baseTechnicalTotal = 6.925 + 32.55 = 39.475
  expect('baseTechnicalTotal = 39.475 €', q.baseTechnicalTotal, 39.475);
  // manualLaborCost = 0, failureCost = 0, profitValue = 0, discountValue = 0
  expect('manualLaborCost = 0',    q.manualLaborCost, 0);
  expect('failureCost = 0',        q.failureCost,     0);
  expect('profitValue = 0',        q.profitValue,     0);
  expect('discountValue = 0',      q.discountValue,   0);
  // IVA esclusa → priceWithVat = priceAfterMinimum = 39.475
  expect('finalRecommendedPrice = 39.475 €', q.finalRecommendedPrice, 39.475);
}

section('10. computeQuote — manodopera');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, manualHours: 2, laborRate: 25 });
  // manualLaborCost = 2 × 25 = 50
  expect('manualLaborCost = 50 €', q.manualLaborCost, 50);
  expect('baseTotal = subtotal + 50', q.baseTotal, jr.subtotal + 50);
}

section('11. computeQuote — margine fallimento');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // baseTotal = 6.925, failureMargin = 10%
  const q = computeQuote([jr], { ...defaultParams, failureMargin: 10 });
  expect('failureCost = 10% di baseTotal', q.failureCost, round2(jr.subtotal * 0.10));
  expect('adjustedTotal = baseTotal + failureCost', q.adjustedTotal, round2(jr.subtotal * 1.10));
}

section('12. computeQuote — rincaro/guadagno');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // adjustedTotal (no failure) = 6.925, profitMargin = 100%
  const q = computeQuote([jr], { ...defaultParams, profitMargin: 100 });
  expect('profitValue = 100% di adjustedTotal', q.profitValue, jr.subtotal);
  expect('priceBeforeDiscount = 2 × adjustedTotal', q.priceBeforeDiscount, jr.subtotal * 2);
}

section('13. computeQuote — sconto fisso normale');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, profitMargin: 100, discountAmount: 2 });
  // priceBeforeDiscount = 6.925 × 2 = 13.85, sconto 2€ → 11.85
  expect('discountValue = 2 €', q.discountValue, 2);
  expect('priceAfterDiscount = priceBeforeDiscount - 2', q.priceAfterDiscount, q.priceBeforeDiscount - 2);
}

section('14. computeQuote — sconto che supera il prezzo (non negativo)');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // priceBeforeDiscount ~6.925, sconto 999€
  const q = computeQuote([jr], { ...defaultParams, discountAmount: 999 });
  expect('discountValue = priceBeforeDiscount (non supera)', q.discountValue, q.priceBeforeDiscount);
  expect('priceAfterDiscount = 0', q.priceAfterDiscount, 0);
  expectBool('finalPrice >= 0', q.finalRecommendedPrice >= 0, true);
}

section('15. computeQuote — prezzo minimo che scatta');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // subtotal ~6.925, prezzo minimo 50€
  const q = computeQuote([jr], { ...defaultParams, minimumPrice: 50 });
  expect('priceAfterMinimum = 50 (floor)', q.priceAfterMinimum, 50);
}

section('16. computeQuote — prezzo minimo che NON scatta');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // profitMargin 100% → priceBeforeDiscount ~13.85, minimumPrice 5€
  const q  = computeQuote([jr], { ...defaultParams, profitMargin: 100, minimumPrice: 5 });
  expect('priceAfterMinimum = priceAfterDiscount (sopra il floor)', q.priceAfterMinimum, q.priceAfterDiscount);
}

section('17. computeQuote — IVA inclusa');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // subtotal 6.925, IVA 22%
  const q  = computeQuote([jr], { ...defaultParams, includeVat: true, vatPercent: 22 });
  const expectedVat = round2(jr.subtotal * 0.22);
  expect('vatValue = 22% di priceAfterMinimum', q.vatValue, expectedVat);
  expect('priceWithVat = priceAfterMinimum + vatValue', q.priceWithVat, jr.subtotal + expectedVat);
}

section('18. computeQuote — IVA esclusa');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, includeVat: false, vatPercent: 22 });
  expect('vatValue = 0 quando IVA esclusa', q.vatValue, 0);
  expect('priceWithVat = priceAfterMinimum', q.priceWithVat, q.priceAfterMinimum);
}

section('19. computeQuote — spedizione aggiunta DOPO IVA');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], {
    ...defaultParams,
    includeVat: true, vatPercent: 22,
    includeShipping: true, shippingCost: 8,
    includeInsurance: false, insuranceCost: 0,
  });
  // La spedizione non deve influenzare il calcolo dell'IVA
  expect('vatValue calcolato su priceAfterMinimum (senza spedizione)',
    q.vatValue, round2(jr.subtotal * 0.22));
  expect('shippingTotal = 8 €', q.shippingTotal, 8);
  expect('finalRecommendedPrice = priceWithVat + 8', q.finalRecommendedPrice, q.priceWithVat + 8);
}

section('20. computeQuote — spedizione + assicurazione');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], {
    ...defaultParams,
    includeShipping: true, shippingCost: 8,
    includeInsurance: true, insuranceCost: 2.50,
  });
  expect('shippingTotal = 10.50 €', q.shippingTotal, 10.50);
}

section('21. computeQuote — spedizione disabilitata');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], {
    ...defaultParams,
    includeShipping: false, shippingCost: 8, // presente ma non attiva
    includeInsurance: true, insuranceCost: 2,
  });
  expect('shippingTotal = 0 se includeShipping=false', q.shippingTotal, 0);
}

section('22. computeQuote — prezzo unitario per pezzo');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // totalPieces = 10 pz/piatto × 2 piatti = 20 pezzi
  const q = computeQuote([jr], { ...defaultParams, profitMargin: 100 });
  // priceWithVat (no IVA) = priceBeforeDiscount = 6.925 × 2 = 13.85
  // unitPriceClient = 13.85 / 20 = 0.6925 €
  expect('unitPriceClient = priceWithVat / 20', q.unitPriceClient, round2(q.priceWithVat / 20));
  expect('totalPiecesAll = 20', q.totalPiecesAll, 20);
}

section('23. computeQuote — ordine corretto: fallimento applicato PRIMA del rincaro');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  // Se failure e profit fossero applicati insieme il risultato sarebbe diverso.
  // Sequenza corretta:
  //   adjustedTotal  = baseTotal × 1.10  (10% fallimento)
  //   priceBeforeDiscount = adjustedTotal × 2.00  (100% rincaro)
  const q = computeQuote([jr], { ...defaultParams, failureMargin: 10, profitMargin: 100 });
  const expectedAdjusted = jr.subtotal * 1.10;
  const expectedPrice    = expectedAdjusted * 2.00;
  expect('adjustedTotal = baseTotal × 1.10',       q.adjustedTotal,       expectedAdjusted);
  expect('priceBeforeDiscount = adjusted × 2.00',  q.priceBeforeDiscount, expectedPrice);
}

section('24. computeQuote — totale aggregati materiali/energia/manutenzione/ammort.');
{
  const jr3d    = computeJobCost(makeJob3d(),    machine3d,    material3d);
  const jrLaser = computeJobCost(makeJobLaser(), machineLaser, materialLaser);
  const q = computeQuote([jr3d, jrLaser], defaultParams);
  expect('materialCostTotal = somma lavorazioni',    q.materialCostTotal,    jr3d.materialCost    + jrLaser.materialCost);
  expect('energyCostTotal = somma lavorazioni',      q.energyCostTotal,      jr3d.energyCost      + jrLaser.energyCost);
  expect('maintenanceCostTotal = somma lavorazioni', q.maintenanceCostTotal, jr3d.maintenanceCost  + jrLaser.maintenanceCost);
  expect('machineAmortCostTotal = somma lavorazioni', q.machineAmortCostTotal, jr3d.amortCost + jrLaser.amortCost);
}

// ─────────────────────────────────────────────────────────────────
// REPORT FINALE
// ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(50));
console.log(`  RISULTATO: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50) + '\n');

if (failed > 0) process.exit(1);
