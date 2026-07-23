/**
 * ui-summary.js — Preventivator
 * Rendering del riepilogo nel tab Riepilogo.
 */

import { currency, num, escapeHtml, formatHours } from './utils.js';
import { loadData, saveData, STORAGE_KEYS }       from './storage.js';

export function renderSummary(result) {
  const quoteSummary       = document.getElementById('quoteSummary');
  const recommendedPriceBox = document.getElementById('recommendedPriceBox');

  window.__lastQuoteResult = (result && result.version === 'hybrid-v3') ? result : null;

  if (!result || result.version !== 'hybrid-v3') {
    quoteSummary.innerHTML     = '<div class="empty">Compila il tab Lavoro e clicca "Calcola riepilogo" per vedere i risultati.</div>';
    recommendedPriceBox.textContent = '--';
    return;
  }

  const vatBadge       = result.includeVat
    ? '<span class="badge green">IVA inclusa</span>'
    : '<span class="badge red">IVA esclusa</span>';
  const minimumApplied = result.priceAfterMinimum > result.priceAfterDiscount + 0.005;
  const netMargin      = result.priceAfterMinimum - result.adjustedTotal;
  const netMarginPct   = result.adjustedTotal > 0 ? (netMargin / result.adjustedTotal) * 100 : 0;

  let html = `
    <div class="summary-meta">
      <div class="meta-item"><div class="k">Preventivo</div><div class="v">${escapeHtml(result.jobName || 'Senza nome')}</div></div>
      <div class="meta-item"><div class="k">Cliente</div><div class="v">${escapeHtml(result.clientName || 'Non indicato')}</div></div>
      <div class="meta-item"><div class="k">Mail/telefono</div><div class="v">${escapeHtml(result.clientContact || 'Non indicato')}</div></div>
      <div class="meta-item"><div class="k">Data</div><div class="v">${escapeHtml(result.quoteDate || '-')}</div></div>
    </div>`;

  // ── Blocco costo reale ──
  html += `<div class="summary-block cost-real">
    <div class="summary-block-head"><span class="icon">🛠️</span><span class="title">Costo reale di produzione</span></div>
    <p class="desc">Dettaglio per ogni lavorazione, poi totale con manodopera e margine fallimento.</p>`;

  result.jobResults.forEach((r, i) => {
    const is3d  = r.job.type === '3d';
    const badge = is3d
      ? '<span class="badge blue" style="font-size:10px;">3D</span>'
      : '<span class="badge amber" style="font-size:10px;">Laser</span>';
    const label = r.job.label ? ` — ${escapeHtml(r.job.label)}` : '';

    html += `
      <details class="detail-block" style="margin-bottom:8px;" open>
        <summary>${badge} Lavorazione ${i + 1}${label} <strong style="float:right;">${currency.format(r.subtotal)}</strong></summary>
        <div class="summary-line sub"><span>Macchina</span><strong>${escapeHtml(r.machine.name)}</strong></div>
        <div class="summary-line sub"><span>Materiale</span><strong>${escapeHtml(r.material.name)}</strong></div>
        <div class="summary-line sub"><span>Pezzi per ${is3d ? 'piatto' : 'lavorazione'}</span><strong>${r.job.piecesPerUnit}</strong></div>
        <div class="summary-line sub"><span>N° ${is3d ? 'piatti' : 'lavorazioni'}</span><strong>${r.job.unitCount}</strong></div>
        <div class="summary-line sub"><span>Durata per ${is3d ? 'piatto' : 'lavorazione'}</span><strong>${formatHours(r.hoursPerUnit)}</strong></div>
        <div class="summary-line sub"><span>Durata totale</span><strong>${formatHours(r.totalHours)}</strong></div>
        ${is3d ? `<div class="summary-line sub"><span>Materiale totale</span><strong>${num.format(r.totalGrams)} g</strong></div>` : ''}
        <div class="summary-line sub"><span>— Costo materiale</span><strong>${currency.format(r.materialCost)}</strong></div>
        <div class="summary-line sub"><span>— Energia</span><strong>${currency.format(r.energyCost)}</strong></div>
        <div class="summary-line sub"><span>— Manutenzione</span><strong>${currency.format(r.maintenanceCost)}</strong></div>
        <div class="summary-line sub"><span>— Ammortamento macchina</span><strong>${currency.format(r.amortCost)}</strong></div>
        ${r.extraCost > 0 ? `<div class="summary-line sub"><span>— ${escapeHtml(r.job.extraMaterialLabel || 'Componente extra')} (×${r.job.unitCount})</span><strong>${currency.format(r.extraCost)}</strong></div>` : ''}
      </details>`;
  });

  html += `
    <div class="summary-line" style="margin-top:4px;"><span>Subtotale lavorazioni</span><strong>${currency.format(result.baseTechnicalTotal)}</strong></div>
    <div class="summary-line"><span>Manodopera (${num.format(result.manualHours)} h × ${currency.format(result.laborRate)})</span><strong>${currency.format(result.manualLaborCost)}</strong></div>
    <div class="summary-line"><span>Totale base</span><strong>${currency.format(result.baseTotal)}</strong></div>
    <div class="summary-line"><span>Margine fallimento (${num.format(result.failureMargin)}%)</span><strong>+ ${currency.format(result.failureCost)}</strong></div>
    <div class="block-total"><span>Totale costo reale</span><span class="block-total-value">${currency.format(result.adjustedTotal)}</span></div>
  </div>`;

  // ── Blocco prezzo cliente ──
  const shippingTypeLabels = { standard: 'Standard', express: 'Espresso', economy: 'Economy' };

  html += `<div class="summary-block cost-client">
    <div class="summary-block-head"><span class="icon">💶</span><span class="title">Prezzo per il cliente</span></div>
    <p class="desc">Dal costo reale al prezzo finale con rincaro, sconto, minimo, IVA e spedizione.</p>
    <div class="summary-line sub"><span>Costo reale di produzione</span><strong>${currency.format(result.adjustedTotal)}</strong></div>
    <div class="summary-line"><span>Rincaro / guadagno (${num.format(result.profitMargin)}%)</span><strong>+ ${currency.format(result.profitValue)}</strong></div>
    <div class="summary-line"><span>Prezzo con rincaro</span><strong>${currency.format(result.priceBeforeDiscount)}</strong></div>
    <div class="summary-line deduct"><span>Sconto cliente</span><strong>− ${currency.format(result.discountValue)}</strong></div>
    ${minimumApplied ? `<div class="summary-line"><span>Prezzo minimo applicato (${currency.format(result.minimumPrice)})</span><strong>${currency.format(result.priceAfterMinimum)}</strong></div>` : ''}
    <div class="summary-line"><span>IVA (${num.format(result.vatPercent)}%) ${vatBadge}</span><strong>${result.includeVat ? '+ ' + currency.format(result.vatValue) : '—'}</strong></div>
    <div class="summary-line"><span>Subtotale prodotto</span><strong>${currency.format(result.priceWithVat)}</strong></div>
    ${result.includeShipping ? `
    <div class="summary-line" style="margin-top:6px;"><span>Spedizione ${escapeHtml(shippingTypeLabels[result.shippingType] || result.shippingType)}</span><strong>+ ${currency.format(result.shippingCost)}</strong></div>
    ${result.includeInsurance ? `<div class="summary-line"><span>Assicurazione spedizione</span><strong>+ ${currency.format(result.insuranceCost)}</strong></div>` : ''}
    <div class="summary-line sub"><span>Tempi consegna stimati*</span><strong>${result.deliveryDaysMin}–${result.deliveryDaysMax} gg lavorativi</strong></div>
    ${result.shippingNotes ? `<div class="summary-line sub"><span>Note spedizione</span><strong>${escapeHtml(result.shippingNotes)}</strong></div>` : ''}
    ` : ''}
    <div class="block-total"><span>Totale finale${result.includeShipping ? ' (spedizione inclusa)' : ''}</span><span class="block-total-value">${currency.format(result.finalRecommendedPrice)}</span></div>
    <div class="margin-chip">📈 Margine netto (senza spedizione): ${currency.format(netMargin)} (${num.format(netMarginPct)}%)</div>
    ${result.unitPriceClient !== null && result.totalPiecesAll > 1 ? `<div class="margin-chip" style="margin-top:6px;">🔢 Prezzo/pezzo: ${currency.format(result.unitPriceClient)} su ${result.totalPiecesAll} pezzi</div>` : ''}
    ${result.includeShipping ? `<div style="margin-top:10px;font-size:11.5px;color:var(--muted);">* I tempi di consegna sono stime indicative. Le spedizioni sono gestite da corrieri terzi e possono variare.</div>` : ''}
  </div>`;

  quoteSummary.innerHTML          = html;
  recommendedPriceBox.textContent = currency.format(result.finalRecommendedPrice);
}

// ── Confronto Scenario A/B ────────────────────────────────────────────────────

async function getScenario(key) {
  return loadData(key, null);
}

function scenarioSnapshot(result) {
  return {
    label: result.jobName || 'Senza nome',
    savedAt: new Date().toISOString(),
    adjustedTotal: result.adjustedTotal,
    profitMargin: result.profitMargin,
    discountValue: result.discountValue,
    vatPercent: result.vatPercent,
    includeVat: result.includeVat,
    shippingTotal: result.shippingTotal || 0,
    finalRecommendedPrice: result.finalRecommendedPrice,
    netMargin: result.priceAfterMinimum - result.adjustedTotal,
    netMarginPct: result.adjustedTotal > 0 ? ((result.priceAfterMinimum - result.adjustedTotal) / result.adjustedTotal) * 100 : 0,
  };
}

async function renderScenarioCompare() {
  const box = document.getElementById('scenarioCompareBox');
  if (!box) return;
  const [a, b] = await Promise.all([getScenario(STORAGE_KEYS.scenarioA), getScenario(STORAGE_KEYS.scenarioB)]);

  if (!a && !b) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');

  const rows = [
    ['Nome preventivo', a?.label, b?.label],
    ['Costo reale', a && currency.format(a.adjustedTotal), b && currency.format(b.adjustedTotal)],
    ['Rincaro %', a && num.format(a.profitMargin) + '%', b && num.format(b.profitMargin) + '%'],
    ['Sconto', a && currency.format(a.discountValue), b && currency.format(b.discountValue)],
    ['IVA', a && (a.includeVat ? num.format(a.vatPercent) + '%' : 'esclusa'), b && (b.includeVat ? num.format(b.vatPercent) + '%' : 'esclusa')],
    ['Spedizione', a && currency.format(a.shippingTotal), b && currency.format(b.shippingTotal)],
    ['Margine netto', a && `${currency.format(a.netMargin)} (${num.format(a.netMarginPct)}%)`, b && `${currency.format(b.netMargin)} (${num.format(b.netMarginPct)}%)`],
    ['Totale finale', a && currency.format(a.finalRecommendedPrice), b && currency.format(b.finalRecommendedPrice)],
  ];

  box.innerHTML = `
    <div class="summary-block" style="border-left:3px solid var(--accent, #5b5ee0);">
      <div class="summary-block-head"><span class="icon">🔀</span><span class="title">Confronto Scenario A / B</span></div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;color:var(--muted);font-size:11px;text-transform:uppercase;">Voce</th>
              <th style="text-align:right;padding:6px 8px;color:var(--muted);font-size:11px;text-transform:uppercase;">Scenario A</th>
              <th style="text-align:right;padding:6px 8px;color:var(--muted);font-size:11px;text-transform:uppercase;">Scenario B</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(([k, va, vb]) => `
              <tr style="border-top:1px solid var(--border, #e2e8f0);">
                <td style="padding:6px 8px;color:var(--muted);">${escapeHtml(k)}</td>
                <td style="padding:6px 8px;text-align:right;font-weight:600;">${va !== undefined && va !== null ? escapeHtml(String(va)) : '—'}</td>
                <td style="padding:6px 8px;text-align:right;font-weight:600;">${vb !== undefined && vb !== null ? escapeHtml(String(vb)) : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="actions" style="margin-top:10px;">
        <button class="secondary" type="button" id="clearScenariosBtn" style="font-size:12px;padding:6px 12px;">🗑️ Cancella scenari</button>
      </div>
    </div>`;

  document.getElementById('clearScenariosBtn')?.addEventListener('click', async () => {
    await saveData(STORAGE_KEYS.scenarioA, null);
    await saveData(STORAGE_KEYS.scenarioB, null);
    await renderScenarioCompare();
  });
}

export function initScenarioHandlers() {
  document.getElementById('saveScenarioABtn')?.addEventListener('click', async () => {
    const result = window.__lastQuoteResult;
    if (!result) { alert('Calcola prima un preventivo per poterlo salvare come scenario.'); return; }
    await saveData(STORAGE_KEYS.scenarioA, scenarioSnapshot(result));
    await renderScenarioCompare();
  });

  document.getElementById('saveScenarioBBtn')?.addEventListener('click', async () => {
    const result = window.__lastQuoteResult;
    if (!result) { alert('Calcola prima un preventivo per poterlo salvare come scenario.'); return; }
    await saveData(STORAGE_KEYS.scenarioB, scenarioSnapshot(result));
    await renderScenarioCompare();
  });

  renderScenarioCompare();
}
