/**
 * ui-pdf.js — Preventivator
 * Generazione PDF a due pagine tramite html2canvas + jsPDF.
 * Fallback a window.print() se le librerie non sono disponibili.
 */

import { getProfile }                             from './ui-profile.js';
import { currency, num, escapeHtml, formatHours } from './utils.js';

const REGIME_LABELS = {
  forfettario: 'Regime forfettario', ordinario: 'Regime ordinario',
  semplificato: 'Regime semplificato', minimi: 'Regime dei minimi',
};
const ST_LABELS = { standard: 'Standard', express: 'Espresso', economy: 'Economy' };

// ── Label tipo lavoro ─────────────────────────────────────────────────────────
export function jobTypeLabel(result) {
  const types = [...new Set((result.jobResults || []).map(r => r.job.type))];
  if (types.includes('3d') && types.includes('laser')) return 'Stampa 3D + Laser';
  if (types.includes('laser')) return 'Solo lavorazione laser';
  return 'Solo stampa 3D';
}

// ── Popolamento DOM delle due pagine ─────────────────────────────────────────
export async function buildPdf(result) {
  const p          = await getProfile();
  const isPiva     = p.type === 'piva';
  const senderName = isPiva ? (p.RagioneSociale || 'Fornitore') : `${p.Nome || ''} ${p.Cognome || ''}`.trim() || 'Fornitore';
  const addr       = [p.Indirizzo, p.Cap && p.Citta ? `${p.Cap} ${p.Citta}` : (p.Citta || p.Cap || ''), p.Provincia ? `(${p.Provincia.toUpperCase()})` : ''].filter(Boolean).join(', ');
  const senderSub  = [isPiva && p.PartitaIva ? 'P.IVA: ' + p.PartitaIva : '', p.CodiceFiscale ? 'C.F.: ' + p.CodiceFiscale : '', p.Email, p.Telefono, addr].filter(Boolean).join(' · ');
  const genDate    = new Date().toLocaleDateString('it-IT');

  // ── Pagina 1 ──────────────────────────────────────────────────────
  document.getElementById('p1SenderName').textContent  = senderName;
  document.getElementById('p1SenderSub').textContent   = senderSub;
  document.getElementById('p1QuoteName').textContent   = result.jobName || 'Preventivo';
  document.getElementById('p1QuoteDate').textContent   = result.quoteDate || genDate;
  document.getElementById('p1GeneratedOn').textContent = genDate;

  const si = [];
  if (isPiva && p.PartitaIva)    si.push(`<div class="p1-row"><span class="k">P.IVA</span><span class="v">${escapeHtml(p.PartitaIva)}</span></div>`);
  if (p.CodiceFiscale)           si.push(`<div class="p1-row"><span class="k">C.F.</span><span class="v">${escapeHtml(p.CodiceFiscale)}</span></div>`);
  if (isPiva && p.RegimeFiscale) si.push(`<div class="p1-row"><span class="k">Regime</span><span class="v">${escapeHtml(REGIME_LABELS[p.RegimeFiscale] || p.RegimeFiscale)}</span></div>`);
  if (isPiva && p.Sdi)           si.push(`<div class="p1-row"><span class="k">SDI</span><span class="v">${escapeHtml(p.Sdi)}</span></div>`);
  if (isPiva && p.Pec)           si.push(`<div class="p1-row"><span class="k">PEC</span><span class="v">${escapeHtml(p.Pec)}</span></div>`);
  if (p.Email)                   si.push(`<div class="p1-row"><span class="k">Email</span><span class="v">${escapeHtml(p.Email)}</span></div>`);
  if (p.Telefono)                si.push(`<div class="p1-row"><span class="k">Tel.</span><span class="v">${escapeHtml(p.Telefono)}</span></div>`);
  if (addr)                      si.push(`<div class="p1-row"><span class="k">Indirizzo</span><span class="v">${escapeHtml(addr)}</span></div>`);
  if (isPiva && p.Sito)          si.push(`<div class="p1-row"><span class="k">Web</span><span class="v">${escapeHtml(p.Sito)}</span></div>`);
  document.getElementById('p1SenderInfo').innerHTML = si.join('');

  const ci = [
    `<div class="p1-row"><span class="k">Cliente</span><span class="v">${escapeHtml(result.clientName || 'Non indicato')}</span></div>`,
    result.clientContact ? `<div class="p1-row"><span class="k">Contatto</span><span class="v">${escapeHtml(result.clientContact)}</span></div>` : '',
    `<div class="p1-row"><span class="k">Tipo</span><span class="v">${escapeHtml(jobTypeLabel(result))}</span></div>`,
  ];
  document.getElementById('p1ClientInfo').innerHTML = ci.join('');

  document.getElementById('p1JobsBody').innerHTML = (result.jobResults || []).map((r, i) => {
    const is3d  = r.job.type === '3d';
    const badge = is3d ? '<span class="tb tb3">3D</span>' : '<span class="tb tbl">Laser</span>';
    const label = r.job.label || `Lavorazione ${i + 1}`;
    const qty   = `${r.job.unitCount} ${is3d ? (r.job.unitCount > 1 ? 'piatti' : 'piatto') : 'lav.'}`;
    let rows = `<tr>
      <td><div class="jn">${escapeHtml(label)}${badge}</div>${r.job.piecesPerUnit > 1 ? `<div class="jd">${r.job.piecesPerUnit} pezzi per ${is3d ? 'piatto' : 'lavorazione'}</div>` : ''}</td>
      <td>${r.material ? escapeHtml(r.material.name) : '—'}</td>
      <td>${qty}</td>
      <td style="font-weight:700;">${currency.format(r.subtotal)}</td>
    </tr>`;
    if (r.extraCost > 0 && r.job.extraMaterialLabel)
      rows += `<tr><td colspan="3" style="padding-left:20px;font-size:10px;color:#7c3aed;font-style:italic;">↳ ${escapeHtml(r.job.extraMaterialLabel)} (×${r.job.unitCount})</td><td style="font-size:10px;color:#7c3aed;">${currency.format(r.extraCost)}</td></tr>`;
    return rows;
  }).join('');

  const pb = [];
  if (result.discountValue > 0) {
    pb.push(`<div class="p1-pr"><span class="pk">Imponibile</span><span class="pv">${currency.format(result.priceBeforeDiscount)}</span></div>`);
    pb.push(`<div class="p1-pr ded"><span class="pk">Sconto</span><span class="pv">−${currency.format(result.discountValue)}</span></div>`);
  }
  if (result.includeVat) {
    pb.push(`<div class="p1-pr"><span class="pk">Imponibile netto</span><span class="pv">${currency.format(result.priceAfterMinimum)}</span></div>`);
    pb.push(`<div class="p1-pr"><span class="pk">IVA ${num.format(result.vatPercent)}%</span><span class="pv">+${currency.format(result.vatValue)}</span></div>`);
  } else {
    pb.push(`<div class="p1-pr"><span class="pk">Subtotale prodotto</span><span class="pv">${currency.format(result.priceAfterMinimum)}</span></div>`);
    pb.push(`<div class="p1-pr"><span class="pk">IVA</span><span class="pv">Esclusa</span></div>`);
  }
  if (result.includeShipping && result.shippingTotal > 0) {
    pb.push(`<div class="p1-pr shp"><span class="pk">Spedizione (${escapeHtml(ST_LABELS[result.shippingType] || result.shippingType)})</span><span class="pv">+${currency.format(result.shippingCost)}</span></div>`);
    if (result.includeInsurance)
      pb.push(`<div class="p1-pr shp"><span class="pk">Assicurazione</span><span class="pv">+${currency.format(result.insuranceCost)}</span></div>`);
  }
  pb.push(`<div class="p1-ptot"><span class="tk">TOTALE${result.includeVat ? ' IVA INCLUSA' : ''}</span><span class="tv">${currency.format(result.finalRecommendedPrice)}</span></div>`);
  document.getElementById('p1PricingBox').innerHTML = pb.join('');

  const snEl = document.getElementById('p1ShippingNote');
  if (result.includeShipping) {
    let note = `🚚 Consegna stimata: ${result.deliveryDaysMin}–${result.deliveryDaysMax} giorni lavorativi (stima indicativa).`;
    if (result.shippingNotes)    note += ` Note: ${result.shippingNotes}`;
    if (result.includeInsurance) note += ' Spedizione assicurata inclusa.';
    snEl.textContent   = note;
    snEl.style.display = 'block';
  } else { snEl.style.display = 'none'; }

  document.getElementById('p1FooterLeft').textContent =
    [senderName, isPiva && p.PartitaIva ? 'P.IVA ' + p.PartitaIva : '', p.Email].filter(Boolean).join(' · ');

  // ── Pagina 2 ──────────────────────────────────────────────────────
  const meta = [
    ['Preventivo', result.jobName || '—'], ['Data', result.quoteDate || '—'],
    ['Cliente', result.clientName || '—'], ['Contatto', result.clientContact || '—'],
    ['Tipo lavoro', jobTypeLabel(result)],  ['Fornitore', senderName],
  ];
  document.getElementById('p2Meta').innerHTML = meta.map(([k, v]) =>
    `<div style="display:flex;gap:6px;"><span style="color:#6b7280;min-width:80px;">${escapeHtml(k)}:</span><strong>${escapeHtml(v)}</strong></div>`
  ).join('');

  const p2body = document.getElementById('p2JobsBody');
  p2body.innerHTML = (result.jobResults || []).map((r, i) => {
    const label = r.job.label || `Lavorazione ${i + 1}`;
    const is3d  = r.job.type === '3d';
    let rows = `<tr>
      <td><strong>${escapeHtml(label)}</strong><br><span style="font-size:8px;color:#6b7280;">${is3d ? 'Stampa 3D' : 'Laser'} · ${r.job.unitCount} ${is3d ? 'piatti' : 'lav.'} · ${r.job.piecesPerUnit} pz/${is3d ? 'piatto' : 'lav.'}</span></td>
      <td>${escapeHtml(r.machine?.name || '—')}</td>
      <td>${escapeHtml(r.material?.name || '—')}</td>
      <td>${formatHours(r.totalHours)}</td>
      <td>${currency.format(r.materialCost)}</td>
      <td>${currency.format(r.energyCost)}</td>
      <td>${currency.format(r.maintenanceCost)}</td>
      <td>${currency.format(r.amortCost)}</td>
      <td>${r.extraCost > 0 ? currency.format(r.extraCost) : '—'}</td>
      <td style="font-weight:800;">${currency.format(r.subtotal)}</td>
    </tr>`;
    if (r.extraCost > 0 && r.job.extraMaterialLabel)
      rows += `<tr class="rsub"><td colspan="10" style="padding-left:20px;">↳ ${escapeHtml(r.job.extraMaterialLabel)} × ${r.job.unitCount}</td></tr>`;
    if (is3d && r.totalGrams > 0)
      rows += `<tr class="rsub"><td colspan="10" style="padding-left:20px;">Materiale 3D totale: ${num.format(r.totalGrams)} g | Ore/piatto: ${formatHours(r.hoursPerUnit)}</td></tr>`;
    return rows;
  }).join('');

  const totalExtra = (result.jobResults || []).reduce((s, r) => s + r.extraCost, 0);
  p2body.innerHTML += `<tr class="rs"><td><strong>TOTALE LAVORAZIONI</strong></td><td></td><td></td><td></td>
    <td>${currency.format(result.materialCostTotal)}</td><td>${currency.format(result.energyCostTotal)}</td>
    <td>${currency.format(result.maintenanceCostTotal)}</td><td>${currency.format(result.machineAmortCostTotal)}</td>
    <td>${totalExtra > 0 ? currency.format(totalExtra) : '—'}</td>
    <td style="font-weight:900;">${currency.format(result.baseTechnicalTotal)}</td></tr>`;

  const minApplied = result.priceAfterMinimum > result.priceAfterDiscount + 0.005;
  document.getElementById('p2CalcBoxes').innerHTML = `
    <div class="p2-cbox"><h4>Struttura del costo reale</h4>
      <div class="p2-cr"><span class="ck">Subtotale lavorazioni</span><span class="cv">${currency.format(result.baseTechnicalTotal)}</span></div>
      <div class="p2-cr"><span class="ck">+ Manodopera (${num.format(result.manualHours)}h × ${currency.format(result.laborRate)})</span><span class="cv">${currency.format(result.manualLaborCost)}</span></div>
      <div class="p2-cr"><span class="ck">+ Fallimento ${num.format(result.failureMargin)}%</span><span class="cv">${currency.format(result.failureCost)}</span></div>
      <div class="p2-cr hi"><span class="ck">COSTO REALE</span><span class="cv">${currency.format(result.adjustedTotal)}</span></div>
    </div>
    <div class="p2-cbox"><h4>Prezzo al cliente</h4>
      <div class="p2-cr"><span class="ck">Costo reale</span><span class="cv">${currency.format(result.adjustedTotal)}</span></div>
      <div class="p2-cr"><span class="ck">+ Rincaro ${num.format(result.profitMargin)}%</span><span class="cv">+${currency.format(result.profitValue)}</span></div>
      <div class="p2-cr"><span class="ck">− Sconto</span><span class="cv">−${currency.format(result.discountValue)}</span></div>
      ${minApplied ? `<div class="p2-cr"><span class="ck">Prezzo minimo</span><span class="cv">${currency.format(result.minimumPrice)}</span></div>` : ''}
      <div class="p2-cr"><span class="ck">+ IVA ${num.format(result.vatPercent)}%</span><span class="cv">${result.includeVat ? '+' + currency.format(result.vatValue) : 'esclusa'}</span></div>
      ${result.includeShipping ? `<div class="p2-cr"><span class="ck">+ Spedizione</span><span class="cv">+${currency.format(result.shippingTotal)}</span></div>` : ''}
      <div class="p2-cr hi"><span class="ck">TOTALE FINALE</span><span class="cv">${currency.format(result.finalRecommendedPrice)}</span></div>
    </div>`;

  const marginNet = result.priceAfterMinimum - result.adjustedTotal;
  const marginPct = result.adjustedTotal > 0 ? (marginNet / result.adjustedTotal * 100) : 0;
  document.getElementById('p2TotalsGrid').innerHTML = `
    <div class="p2-ti"><div class="tik">Costo reale</div><div class="tiv">${currency.format(result.adjustedTotal)}</div></div>
    <div class="p2-ti"><div class="tik">Margine netto</div><div class="tiv">${currency.format(marginNet)} (${num.format(marginPct)}%)</div></div>
    ${result.totalPiecesAll > 1 && result.unitPriceClient ? `<div class="p2-ti"><div class="tik">Prezzo/pezzo</div><div class="tiv">${currency.format(result.unitPriceClient)}</div></div>` : '<div class="p2-ti"><div class="tik">Pezzi</div><div class="tiv">—</div></div>'}
    ${result.includeShipping ? `<div class="p2-ti"><div class="tik">Spedizione</div><div class="tiv">${currency.format(result.shippingTotal)}</div></div>` : ''}
    <div class="p2-ti fin"><div class="tik">TOTALE CLIENTE</div><div class="tiv">${currency.format(result.finalRecommendedPrice)}</div></div>`;

  document.getElementById('p2GeneratedOn').textContent = 'Generato il ' + genDate;
}

// ── Generazione PDF reale ─────────────────────────────────────────────────────

function showOverlay(visible) {
  const el = document.getElementById('pdfOverlay');
  if (!el) return;
  el.style.display = visible ? 'flex' : 'none';
}

/**
 * Controlla che jsPDF e html2canvas siano disponibili.
 * Entrambi vengono caricati come script UMD prima del modulo.
 */
function librariesAvailable() {
  return typeof window.jspdf !== 'undefined' && typeof window.html2canvas !== 'undefined';
}

/**
 * Renderizza un elemento DOM con html2canvas e restituisce una immagine JPEG base64.
 * @param {HTMLElement} el       - Elemento da renderizzare
 * @param {number}      scale    - Fattore di scala (2 = alta risoluzione)
 */
async function renderPageToImage(el, scale = 2) {
  const canvas = await window.html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    // larghezza A4 a 96 DPI
    windowWidth: 794,
    width:  el.scrollWidth,
    height: el.scrollHeight,
  });
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Genera e scarica il PDF con jsPDF + html2canvas.
 * Se le librerie non sono disponibili, fa fallback a window.print().
 */
export async function generatePdf(result) {
  if (!librariesAvailable()) {
    console.warn('[PDF] Librerie non disponibili, fallback a window.print()');
    await buildPdf(result);
    window.print();
    return;
  }

  showOverlay(true);

  try {
    // 1. Popola il DOM
    await buildPdf(result);

    // 2. Rendi visibile il printArea fuori dallo schermo per html2canvas
    const printArea = document.getElementById('printArea');
    printArea.classList.add('rendering');

    // 3. Attendi un frame per assicurarsi che il DOM sia aggiornato
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise(resolve => setTimeout(resolve, 150));

    // 4. Renderizza le due pagine
    const p1El = document.getElementById('p1');
    const p2El = document.getElementById('p2');
    const [img1, img2] = await Promise.all([
      renderPageToImage(p1El),
      renderPageToImage(p2El),
    ]);

    // 5. Nascondi nuovamente
    printArea.classList.remove('rendering');

    // 6. Crea il PDF A4
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // A4: 210 × 297 mm — immagine adattata alla larghezza piena
    const addPage = (imgData, addNewPage = false) => {
      if (addNewPage) pdf.addPage();
      // Calcola altezza proporzionale: l'immagine è larga 794px, alta h px
      // Convertiamo in mm: 794px / 3.7795px/mm ≈ 210mm
      // La proporzione è mantenuta
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    };

    addPage(img1, false);
    addPage(img2, true);

    // 7. Metadati PDF
    pdf.setProperties({
      title:    `Preventivo — ${result.jobName || 'senza nome'}`,
      subject:  `Preventivo stampa 3D/laser — ${result.clientName || 'cliente'}`,
      creator:  'Preventivator',
      keywords: 'preventivo, stampa 3D, laser',
    });

    // 8. Scarica il file
    const safeName = (result.jobName || 'preventivo')
      .replace(/[^a-z0-9àèéìòù]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    const dateStr  = new Date().toISOString().slice(0, 10);
    pdf.save(`preventivo-${safeName}-${dateStr}.pdf`);

  } catch (err) {
    console.error('[PDF] Errore generazione:', err);
    // Fallback pulito a window.print()
    document.getElementById('printArea')?.classList.remove('rendering');
    alert('Errore nella generazione del PDF. Verrà aperta la finestra di stampa del browser come alternativa.');
    window.print();
  } finally {
    showOverlay(false);
  }
}

// ── Init handler ──────────────────────────────────────────────────────────────
export function initPdfHandler() {
  const btn = document.getElementById('exportPdfBtn');
  btn.addEventListener('click', async () => {
    const result = window.__lastQuoteResult;
    if (!result) { alert('Prima calcola un preventivo nel tab Lavoro.'); return; }
    btn.disabled    = true;
    btn.textContent = 'Generazione in corso…';
    try {
      await generatePdf(result);
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Esporta PDF per il cliente';
    }
  });
}
