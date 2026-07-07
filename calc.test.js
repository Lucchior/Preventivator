/**
 * tests/calc.test.js — Preventivator
 * Suite di test per la logica di calcolo pura (calc.js).
 * Eseguire con: npm test
 */

import { computeJobCost, computeQuote } from '../js/calc.js';

// ── Fixtures ──────────────────────────────────────────────────────
const machine3d = {
  id: 'm1', type: '3d', name: 'Stampante Test',
  machineCost: 1200, lifetimeHours: 8000,
  energyCost: 0.25, powerKwh: 1, powerEveryH: 4,
  maintenanceCost: 80,
};
const machineLaser = {
  id: 'm2', type: 'laser', name: 'Laser Test',
  machineCost: 2000, lifetimeHours: 10000,
  energyCost: 0.25, powerKwh: 1, powerEveryH: 2,
  maintenanceCost: 100,
};
const material3d    = { id: 'mat1', type: '3d',    name: 'PLA 1kg',    unit: 'kg',     unitCost: 20 };
const materialLaser = { id: 'mat2', type: 'laser', name: 'MDF 3mm',    unit: 'foglio', unitCost: 5  };

function makeJob3d(overrides = {}) {
  return { id: 'j1', type: '3d', machineId: 'm1', materialId: 'mat1',
    piecesPerUnit: 10, unitCount: 2, gramsPerUnit: 100, materialQtyPerUnit: 0,
    days: 0, hours: 5, minutes: 0, extraMaterialCost: 0, extraMaterialLabel: '', ...overrides };
}
function makeJobLaser(overrides = {}) {
  return { id: 'j2', type: 'laser', machineId: 'm2', materialId: 'mat2',
    piecesPerUnit: 4, unitCount: 3, gramsPerUnit: 0, materialQtyPerUnit: 2,
    days: 0, hours: 2, minutes: 0, extraMaterialCost: 0, extraMaterialLabel: '', ...overrides };
}
const defaultParams = {
  manualHours: 0, laborRate: 0, failureMargin: 0, profitMargin: 0,
  discountAmount: 0, minimumPrice: 0, vatPercent: 22, includeVat: false,
  includeShipping: false, shippingCost: 0, includeInsurance: false, insuranceCost: 0,
};

// ── Test runner ───────────────────────────────────────────────────
let passed = 0, failed = 0;
function round2(n) { return Math.round(n * 100) / 100; }
function expect(label, actual, expected, tol = 0.01) {
  if (Math.abs(actual - expected) <= tol) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ ${label}\n       atteso: ${expected}\n       ottenuto: ${actual}`); failed++; }
}
function expectNull(label, actual) {
  if (actual === null) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ ${label} — atteso null, ottenuto: ${JSON.stringify(actual)}`); failed++; }
}
function expectBool(label, actual, expected) {
  if (actual === expected) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ ${label} — atteso: ${expected}, ottenuto: ${actual}`); failed++; }
}
function section(t) { console.log(`\n─── ${t} ───`); }

// ── Test cases ────────────────────────────────────────────────────
section('1. computeJobCost — dati mancanti');
expectNull('null se machine=null',   computeJobCost(makeJob3d(), null, material3d));
expectNull('null se material=null',  computeJobCost(makeJob3d(), machine3d, null));
expectNull('null se job=null',       computeJobCost(null, machine3d, material3d));

section('2. computeJobCost — lavorazione 3D base');
{
  const r = computeJobCost(makeJob3d(), machine3d, material3d);
  expect('materialCost = 4.00 €',    r.materialCost,    4.00);
  expect('energyCost = 0.625 €',     r.energyCost,      0.625);
  expect('maintenanceCost = 0.80 €', r.maintenanceCost, 0.80);
  expect('amortCost = 1.50 €',       r.amortCost,       1.50);
  expect('extraCost = 0 €',          r.extraCost,       0);
  expect('subtotal = 6.925 €',       r.subtotal,        6.925);
  expect('totalHours = 10 h',        r.totalHours,      10);
  expect('totalPieces = 20',         r.totalPieces,     20);
  expect('totalGrams = 200 g',       r.totalGrams,      200);
}

section('3. computeJobCost — lavorazione laser base');
{
  const r = computeJobCost(makeJobLaser(), machineLaser, materialLaser);
  expect('materialCost = 30 €',      r.materialCost,    30);
  expect('energyCost = 0.75 €',      r.energyCost,      0.75);
  expect('maintenanceCost = 0.60 €', r.maintenanceCost, 0.60);
  expect('amortCost = 1.20 €',       r.amortCost,       1.20);
  expect('subtotal = 32.55 €',       r.subtotal,        32.55);
  expect('totalHours = 6 h',         r.totalHours,      6);
  expect('totalPieces = 12',         r.totalPieces,     12);
}

section('4. computeJobCost — giorni + ore + minuti');
{
  const r = computeJobCost(makeJob3d({ days:1, hours:2, minutes:30, unitCount:2 }), machine3d, material3d);
  expect('hoursPerUnit = 26.5 h', r.hoursPerUnit, 26.5);
  expect('totalHours = 53 h',     r.totalHours,   53);
}

section('5. computeJobCost — componente extra');
{
  const r = computeJobCost(makeJob3d({ extraMaterialCost:3.50, unitCount:2 }), machine3d, material3d);
  expect('extraCost = 7 €', r.extraCost, 7.00);
  expect('subtotal include extra', r.subtotal, r.materialCost + r.energyCost + r.maintenanceCost + r.amortCost + 7.00);
}

section('6. computeJobCost — lifetimeHours = 0 (no divisione per zero)');
expect('amortCost = 0', computeJobCost(makeJob3d(), { ...machine3d, lifetimeHours:0 }, material3d).amortCost, 0);

section('7. computeJobCost — powerKwh = 0');
expect('energyCost = 0', computeJobCost(makeJob3d(), { ...machine3d, powerKwh:0 }, material3d).energyCost, 0);

section('8. computeJobCost — powerEveryH = 0 (no divisione per zero)');
expect('energyCost = 0', computeJobCost(makeJob3d(), { ...machine3d, powerEveryH:0 }, material3d).energyCost, 0);

section('9. computeQuote — senza margini');
{
  const jr3d  = computeJobCost(makeJob3d(),    machine3d,    material3d);
  const jrLas = computeJobCost(makeJobLaser(), machineLaser, materialLaser);
  const q = computeQuote([jr3d, jrLas], defaultParams);
  expect('baseTechnicalTotal = 39.475 €', q.baseTechnicalTotal, 39.475);
  expect('finalRecommendedPrice = 39.475', q.finalRecommendedPrice, 39.475);
}

section('10. computeQuote — manodopera');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, manualHours:2, laborRate:25 });
  expect('manualLaborCost = 50 €', q.manualLaborCost, 50);
  expect('baseTotal = subtotal + 50', q.baseTotal, jr.subtotal + 50);
}

section('11. computeQuote — margine fallimento 10%');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, failureMargin:10 });
  expect('failureCost = 10%', q.failureCost, round2(jr.subtotal * 0.10));
  expect('adjustedTotal = ×1.10', q.adjustedTotal, round2(jr.subtotal * 1.10));
}

section('12. computeQuote — rincaro 100%');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, profitMargin:100 });
  expect('profitValue = adjustedTotal', q.profitValue, jr.subtotal);
  expect('priceBeforeDiscount = ×2',    q.priceBeforeDiscount, jr.subtotal * 2);
}

section('13. computeQuote — sconto fisso normale');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, profitMargin:100, discountAmount:2 });
  expect('discountValue = 2 €',                q.discountValue, 2);
  expect('priceAfterDiscount = before − 2',    q.priceAfterDiscount, q.priceBeforeDiscount - 2);
}

section('14. computeQuote — sconto > prezzo (non negativo)');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, discountAmount:999 });
  expect('discountValue capped al priceBeforeDiscount', q.discountValue, q.priceBeforeDiscount);
  expect('priceAfterDiscount = 0', q.priceAfterDiscount, 0);
  expectBool('finalPrice >= 0', q.finalRecommendedPrice >= 0, true);
}

section('15. computeQuote — prezzo minimo che scatta');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, minimumPrice:50 });
  expect('priceAfterMinimum = 50', q.priceAfterMinimum, 50);
}

section('16. computeQuote — prezzo minimo che NON scatta');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, profitMargin:100, minimumPrice:5 });
  expect('priceAfterMinimum = priceAfterDiscount', q.priceAfterMinimum, q.priceAfterDiscount);
}

section('17. computeQuote — IVA inclusa');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, includeVat:true, vatPercent:22 });
  expect('vatValue = 22% di priceAfterMinimum', q.vatValue, round2(jr.subtotal * 0.22));
  expect('priceWithVat = priceAfterMinimum + vatValue', q.priceWithVat, jr.subtotal + round2(jr.subtotal * 0.22));
}

section('18. computeQuote — IVA esclusa');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, includeVat:false, vatPercent:22 });
  expect('vatValue = 0',                         q.vatValue,    0);
  expect('priceWithVat = priceAfterMinimum',      q.priceWithVat, q.priceAfterMinimum);
}

section('19. computeQuote — spedizione aggiunta DOPO IVA');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, includeVat:true, vatPercent:22, includeShipping:true, shippingCost:8 });
  expect('IVA calcolata SENZA spedizione', q.vatValue, round2(jr.subtotal * 0.22));
  expect('shippingTotal = 8 €',            q.shippingTotal, 8);
  expect('final = priceWithVat + 8',       q.finalRecommendedPrice, q.priceWithVat + 8);
}

section('20. computeQuote — spedizione + assicurazione');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, includeShipping:true, shippingCost:8, includeInsurance:true, insuranceCost:2.50 });
  expect('shippingTotal = 10.50 €', q.shippingTotal, 10.50);
}

section('21. computeQuote — spedizione disabilitata');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, includeShipping:false, shippingCost:8, includeInsurance:true, insuranceCost:2 });
  expect('shippingTotal = 0 se disabled', q.shippingTotal, 0);
}

section('22. computeQuote — prezzo unitario per pezzo');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, profitMargin:100 });
  expect('unitPriceClient = priceWithVat / 20', q.unitPriceClient, round2(q.priceWithVat / 20));
  expect('totalPiecesAll = 20',                 q.totalPiecesAll, 20);
}

section('23. computeQuote — ordine: fallimento PRIMA di rincaro');
{
  const jr = computeJobCost(makeJob3d(), machine3d, material3d);
  const q  = computeQuote([jr], { ...defaultParams, failureMargin:10, profitMargin:100 });
  expect('adjustedTotal = base × 1.10',       q.adjustedTotal,       jr.subtotal * 1.10);
  expect('priceBeforeDiscount = adjusted × 2', q.priceBeforeDiscount, jr.subtotal * 1.10 * 2);
}

section('24. computeQuote — aggregati materiali/energia/manutenzione/ammort.');
{
  const jr3d  = computeJobCost(makeJob3d(),    machine3d,    material3d);
  const jrLas = computeJobCost(makeJobLaser(), machineLaser, materialLaser);
  const q = computeQuote([jr3d, jrLas], defaultParams);
  expect('materialCostTotal',     q.materialCostTotal,     jr3d.materialCost    + jrLas.materialCost);
  expect('energyCostTotal',       q.energyCostTotal,       jr3d.energyCost      + jrLas.energyCost);
  expect('maintenanceCostTotal',  q.maintenanceCostTotal,  jr3d.maintenanceCost + jrLas.maintenanceCost);
  expect('machineAmortCostTotal', q.machineAmortCostTotal, jr3d.amortCost       + jrLas.amortCost);
}

// ── Report ────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(50));
console.log(`  RISULTATO: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50) + '\n');
if (failed > 0) process.exit(1);
