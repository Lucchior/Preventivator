/**
 * ui-summary.js — Preventivator
 * Rendering del riepilogo nel tab Riepilogo.
 */

import { currency, num, escapeHtml, formatHours } from './utils.js';

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
