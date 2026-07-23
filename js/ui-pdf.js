/**
 * ui-pdf.js — Preventivator
 * Generazione PDF a due pagine con jsPDF nativo (testo vettoriale vero,
 * selezionabile e copiabile — non più uno screenshot rasterizzato).
 *
 * Dipende solo da jsPDF (vendorizzata in vendor/jspdf.umd.min.js).
 * html2canvas non è più necessaria: rimossa.
 */

import { getProfile }                             from './ui-profile.js';
import { currency, num, formatHours }             from './utils.js';

const REGIME_LABELS = {
  forfettario: 'Regime forfettario', ordinario: 'Regime ordinario',
  semplificato: 'Regime semplificato', minimi: 'Regime dei minimi',
};
const ST_LABELS = { standard: 'Standard', express: 'Espresso', economy: 'Economy' };

// ── Palette (RGB 0-255) ───────────────────────────────────────────────────────
const C = {
  navy:    [15, 23, 42],
  indigo:  [79, 70, 229],
  indigoD: [55, 48, 163],
  purpleD: [30, 27, 75],
  purple2: [49, 46, 129],
  white:   [255, 255, 255],
  text:    [30, 41, 59],
  muted:   [100, 116, 139],
  mutedL:  [148, 163, 184],
  border:  [226, 232, 240],
  bgLight: [248, 250, 252],
  bgPurple:[245, 243, 255],
  green:   [22, 101, 52],
  greenBg: [240, 253, 244],
  red:     [220, 38, 38],
  amber:   [217, 119, 6],
};

const PAGE_W = 210, PAGE_H = 297;
const MARGIN = 16;

// ── Helpers di label ──────────────────────────────────────────────────────────
export function jobTypeLabel(result) {
  const types = [...new Set((result.jobResults || []).map(r => r.job.type))];
  if (types.includes('3d') && types.includes('laser')) return 'Stampa 3D + Laser';
  if (types.includes('laser')) return 'Solo lavorazione laser';
  return 'Solo stampa 3D';
}

function senderInfo(p) {
  const isPiva = p.type === 'piva';
  const name = isPiva
    ? (p.RagioneSociale || 'Fornitore')
    : `${p.Nome || ''} ${p.Cognome || ''}`.trim() || 'Fornitore';
  const addr = [
    p.Indirizzo,
    p.Cap && p.Citta ? `${p.Cap} ${p.Citta}` : (p.Citta || p.Cap || ''),
    p.Provincia ? `(${p.Provincia.toUpperCase()})` : '',
  ].filter(Boolean).join(', ');
  return { isPiva, name, addr };
}

// ── Primitive di disegno ──────────────────────────────────────────────────────

function setFill(doc, rgb)  { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setText(doc, rgb)  { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc, rgb)  { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

function wrapText(doc, text, maxWidth, fontSize) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(String(text ?? ''), maxWidth);
}

function ensureSpace(doc, y, needed, bottomLimit = PAGE_H - 20) {
  if (y + needed > bottomLimit) {
    doc.addPage();
    return 14;
  }
  return y;
}

function drawBanner(doc, { height, colorTop, colorBottom, title, subtitleLines = [], rightLines = [] }) {
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(colorTop[0] + (colorBottom[0] - colorTop[0]) * t);
    const g = Math.round(colorTop[1] + (colorBottom[1] - colorTop[1]) * t);
    const b = Math.round(colorTop[2] + (colorBottom[2] - colorTop[2]) * t);
    setFill(doc, [r, g, b]);
    doc.rect(0, (height / steps) * i, PAGE_W, height / steps + 0.5, 'F');
  }

  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(title, MARGIN, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let sy = 22;
  subtitleLines.forEach(line => {
    if (!line) return;
    doc.text(line, MARGIN, sy);
    sy += 4.2;
  });

  let ry = 14;
  rightLines.forEach(({ text, size = 9, bold = false, color = C.white }) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    setText(doc, color);
    doc.text(text, PAGE_W - MARGIN, ry, { align: 'right' });
    ry += size > 12 ? 6.5 : 4.5;
  });
}

function drawTable(doc, { x, y, columns, rows, headerFill = C.bgLight, headerText = C.muted, fontSize = 8.5, lineH = 4 }) {
  const totalW = columns.reduce((s, c) => s + c.width, 0);

  setFill(doc, headerFill);
  doc.rect(x, y, totalW, 7, 'F');
  setText(doc, headerText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  let cx = x;
  columns.forEach(col => {
    const tx = col.align === 'right' ? cx + col.width - 2 : cx + 2;
    doc.text(col.label.toUpperCase(), tx, y + 4.7, { align: col.align === 'right' ? 'right' : 'left' });
    cx += col.width;
  });
  y += 7;
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + totalW, y);

  rows.forEach(row => {
    const wrapped = columns.map((col, i) => wrapText(doc, row.cells[i] ?? '', col.width - 4, fontSize));
    const maxLines = Math.max(1, ...wrapped.map(w => w.length));
    const rowH = Math.max(7, maxLines * lineH + 3);

    y = ensureSpace(doc, y, rowH + 2);

    if (row.fill) { setFill(doc, row.fill); doc.rect(x, y, totalW, rowH, 'F'); }

    doc.setFont('helvetica', row.bold ? 'bold' : (row.italic ? 'italic' : 'normal'));
    doc.setFontSize(row.small ? fontSize - 1 : fontSize);
    setText(doc, row.color || C.text);

    cx = x;
    columns.forEach((col, i) => {
      const lines = wrapped[i];
      const tx = col.align === 'right' ? cx + col.width - 2 : cx + 2 + (row.indent && i === 0 ? row.indent : 0);
      lines.forEach((ln, li) => {
        doc.text(ln, tx, y + 4.8 + li * lineH, { align: col.align === 'right' ? 'right' : 'left' });
      });
      cx += col.width;
    });

    y += rowH;
    setDraw(doc, C.border);
    doc.setLineWidth(0.2);
    doc.line(x, y, x + totalW, y);
  });

  return y;
}

function kvRow(doc, x, y, key, value, { keyW = 26, width = 80, size = 8.5, bold = true } = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  setText(doc, C.muted);
  doc.text(key, x, y);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  setText(doc, C.text);
  const lines = wrapText(doc, value, width - keyW, size);
  doc.text(lines, x + keyW, y);
  return y + lines.length * 4;
}

function drawInfoBox(doc, { x, y, width, height, title }) {
  setDraw(doc, C.border);
  setFill(doc, C.bgLight);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, C.muted);
  doc.text(title.toUpperCase(), x + 4, y + 6);
}

/**
 * Recupera un QR code (PNG base64) da un servizio pubblico gratuito.
 * Enhancement progressivo: se offline o il servizio non risponde, restituisce
 * null e il PDF viene comunque generato correttamente senza QR.
 */
async function fetchQrDataUrl(payload) {
  if (!payload) return null;
  try {
    const url = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=' + encodeURIComponent(payload);
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror    = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── PAGINA 1 — Copia Cliente ─────────────────────────────────────────────────
function buildPage1(doc, result, profile, qrDataUrl) {
  const { isPiva, name, addr } = senderInfo(profile);
  const genDate = new Date().toLocaleDateString('it-IT');

  const subtitleLines = [
    [isPiva && profile.PartitaIva ? 'P.IVA: ' + profile.PartitaIva : '', profile.CodiceFiscale ? 'C.F.: ' + profile.CodiceFiscale : ''].filter(Boolean).join('   '),
    [profile.Email, profile.Telefono].filter(Boolean).join('   ·   '),
    addr,
  ].filter(Boolean);

  drawBanner(doc, {
    height: 34,
    colorTop: C.navy, colorBottom: C.indigo,
    title: name,
    subtitleLines,
    rightLines: [
      { text: 'PREVENTIVO', size: 8, color: [199, 210, 254] },
      { text: result.jobName || 'Senza nome', size: 13, bold: true },
      { text: 'Data: ' + (result.quoteDate || genDate), size: 8.5, color: [203, 213, 225] },
    ],
  });

  let y = 46;

  const boxW = (PAGE_W - MARGIN * 2 - 6) / 2;
  const boxH = 34;
  drawInfoBox(doc, { x: MARGIN, y, width: boxW, height: boxH, title: 'Fornitore' });
  drawInfoBox(doc, { x: MARGIN + boxW + 6, y, width: boxW, height: boxH, title: 'Cliente' });

  let fy = y + 11;
  if (isPiva && profile.PartitaIva) fy = kvRow(doc, MARGIN + 4, fy, 'P.IVA', profile.PartitaIva, { width: boxW - 8 });
  if (profile.CodiceFiscale)        fy = kvRow(doc, MARGIN + 4, fy, 'C.F.', profile.CodiceFiscale, { width: boxW - 8 });
  if (profile.Email)                fy = kvRow(doc, MARGIN + 4, fy, 'Email', profile.Email, { width: boxW - 8, size: 7.8 });
  if (profile.Telefono)             fy = kvRow(doc, MARGIN + 4, fy, 'Tel.', profile.Telefono, { width: boxW - 8 });

  let cy = y + 11;
  cy = kvRow(doc, MARGIN + boxW + 10, cy, 'Cliente', result.clientName || 'Non indicato', { width: boxW - 8 });
  if (result.clientContact) cy = kvRow(doc, MARGIN + boxW + 10, cy, 'Contatto', result.clientContact, { width: boxW - 8, size: 7.8 });
  cy = kvRow(doc, MARGIN + boxW + 10, cy, 'Tipo', jobTypeLabel(result), { width: boxW - 8 });

  y += boxH + 10;

  setFill(doc, C.indigo);
  doc.roundedRect(MARGIN, y, 62, 7, 1.5, 1.5, 'F');
  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DETTAGLIO LAVORAZIONI', MARGIN + 4, y + 4.8);
  y += 12;

  const tableW = PAGE_W - MARGIN * 2;
  const rows = [];
  (result.jobResults || []).forEach((r, i) => {
    const is3d = r.job.type === '3d';
    const label = (r.job.label || `Lavorazione ${i + 1}`) + '  ·  ' + (is3d ? '3D' : 'Laser');
    const qty = `${r.job.unitCount} ${is3d ? (r.job.unitCount > 1 ? 'piatti' : 'piatto') : 'lav.'}`;
    rows.push({ cells: [label, r.material ? r.material.name : '—', qty, currency.format(r.subtotal)] });
    if (r.extraCost > 0 && r.job.extraMaterialLabel) {
      rows.push({
        cells: [`↳ ${r.job.extraMaterialLabel} (×${r.job.unitCount})`, '', '', currency.format(r.extraCost)],
        italic: true, small: true, color: C.indigoD, indent: 3,
      });
    }
  });

  y = drawTable(doc, {
    x: MARGIN, y,
    columns: [
      { label: 'Lavorazione', width: tableW * 0.48, align: 'left' },
      { label: 'Materiale',   width: tableW * 0.22, align: 'left' },
      { label: 'Qtà',         width: tableW * 0.12, align: 'left' },
      { label: 'Importo',     width: tableW * 0.18, align: 'right' },
    ],
    rows,
  });

  y += 8;
  y = ensureSpace(doc, y, 60);

  const pbW = 78;
  const pbX = PAGE_W - MARGIN - pbW;
  let py = y;

  const priceLine = (label, value, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.bold ? 9 : 8.5);
    setText(doc, opts.color || C.muted);
    doc.text(label, pbX, py);
    setText(doc, opts.valueColor || C.text);
    doc.text(value, pbX + pbW, py, { align: 'right' });
    setDraw(doc, C.border);
    doc.setLineWidth(0.15);
    doc.line(pbX, py + 1.6, pbX + pbW, py + 1.6);
    py += 6;
  };

  if (result.discountValue > 0) {
    priceLine('Imponibile', currency.format(result.priceBeforeDiscount));
    priceLine('Sconto', '−' + currency.format(result.discountValue), { valueColor: C.red });
  }
  if (result.includeVat) {
    priceLine('Imponibile netto', currency.format(result.priceAfterMinimum));
    priceLine(`IVA ${num.format(result.vatPercent)}%`, '+' + currency.format(result.vatValue));
  } else {
    priceLine('Subtotale prodotto', currency.format(result.priceAfterMinimum));
    priceLine('IVA', 'Esclusa');
  }
  if (result.includeShipping && result.shippingTotal > 0) {
    priceLine(`Spedizione (${ST_LABELS[result.shippingType] || result.shippingType})`, '+' + currency.format(result.shippingCost));
    if (result.includeInsurance) priceLine('Assicurazione', '+' + currency.format(result.insuranceCost));
  }

  py += 2;
  setFill(doc, C.green);
  doc.roundedRect(pbX, py, pbW, 13, 2, 2, 'F');
  setText(doc, C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`TOTALE${result.includeVat ? ' IVA INCL.' : ''}`, pbX + 4, py + 5.2);
  doc.setFontSize(14);
  doc.text(currency.format(result.finalRecommendedPrice), pbX + pbW - 4, py + 9.5, { align: 'right' });
  py += 20;

  y = Math.max(y, py);

  if (result.includeShipping) {
    let note = `Consegna stimata: ${result.deliveryDaysMin}\u2013${result.deliveryDaysMax} giorni lavorativi (stima indicativa, gestita da corrieri terzi).`;
    if (result.shippingNotes)    note += ` Note: ${result.shippingNotes}`;
    if (result.includeInsurance) note += ' Spedizione assicurata inclusa.';
    const lines = wrapText(doc, note, PAGE_W - MARGIN * 2 - 8, 8);
    const boxH2 = lines.length * 4 + 6;
    y = ensureSpace(doc, y, boxH2 + 6);
    setFill(doc, [255, 251, 235]);
    setDraw(doc, [253, 230, 138]);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, boxH2, 1.5, 1.5, 'FD');
    setText(doc, [120, 53, 15]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(lines, MARGIN + 4, y + 5);
  }

  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, PAGE_H - 20, PAGE_W - MARGIN, PAGE_H - 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, C.mutedL);
  const footerLeft = [name, isPiva && profile.PartitaIva ? 'P.IVA ' + profile.PartitaIva : '', profile.Email].filter(Boolean).join('  ·  ');
  doc.text(footerLeft, MARGIN, PAGE_H - 15);
  doc.text(`Documento generato il ${genDate} — valido salvo conferma scritta.`, MARGIN, PAGE_H - 10);

  if (qrDataUrl) {
    try {
      const qrSize = 14;
      const qx = PAGE_W - MARGIN - qrSize;
      const qy = PAGE_H - 19;
      doc.addImage(qrDataUrl, 'PNG', qx, qy, qrSize, qrSize);
      doc.setFontSize(5.5);
      setText(doc, C.mutedL);
      doc.text('Scansiona per contattarci', qx + qrSize / 2, qy + qrSize + 3, { align: 'center' });
    } catch { /* se l'immagine non è valida, il PDF resta comunque corretto */ }
  }
}

// ── PAGINA 2 — Copia Fornitore (uso interno) ──────────────────────────────────
function buildPage2(doc, result, profile) {
  const { name } = senderInfo(profile);
  const genDate = new Date().toLocaleDateString('it-IT');

  drawBanner(doc, {
    height: 24,
    colorTop: C.purpleD, colorBottom: C.purple2,
    title: 'Copia Fornitore — Dettaglio Completo',
    subtitleLines: [],
    rightLines: [{ text: 'USO INTERNO', size: 8, bold: true, color: [196, 181, 253] }],
  });

  let y = 32;

  const meta = [
    ['Preventivo', result.jobName || '—'], ['Data', result.quoteDate || genDate],
    ['Cliente', result.clientName || '—'], ['Contatto', result.clientContact || '—'],
    ['Tipo lavoro', jobTypeLabel(result)], ['Fornitore', name],
  ];
  const colW = (PAGE_W - MARGIN * 2) / 2;
  meta.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const mx = MARGIN + col * colW, my = y + row * 5.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); setText(doc, C.muted);
    doc.text(k + ':', mx, my);
    doc.setFont('helvetica', 'bold'); setText(doc, C.text);
    doc.text(String(v), mx + 24, my);
  });
  y += Math.ceil(meta.length / 2) * 5.5 + 6;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setText(doc, [124, 58, 237]);
  doc.text('DETTAGLIO LAVORAZIONI (COSTI REALI)', MARGIN, y);
  setDraw(doc, [237, 233, 254]); doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);
  y += 6;

  const tableW = PAGE_W - MARGIN * 2;
  const rows = [];
  (result.jobResults || []).forEach((r, i) => {
    const is3d = r.job.type === '3d';
    const label = `${r.job.label || `Lavorazione ${i + 1}`}\n${is3d ? '3D' : 'Laser'} · ${r.job.unitCount} ${is3d ? 'piatti' : 'lav.'} · ${r.job.piecesPerUnit} pz`;
    rows.push({
      cells: [
        label, r.machine?.name || '—', r.material?.name || '—', formatHours(r.totalHours),
        currency.format(r.materialCost), currency.format(r.energyCost),
        currency.format(r.maintenanceCost), currency.format(r.amortCost),
        r.extraCost > 0 ? currency.format(r.extraCost) : '—',
        currency.format(r.subtotal),
      ],
    });
    if (r.extraCost > 0 && r.job.extraMaterialLabel) {
      rows.push({ cells: [`↳ ${r.job.extraMaterialLabel} × ${r.job.unitCount}`, '', '', '', '', '', '', '', '', ''], italic: true, small: true, color: C.indigoD, indent: 3 });
    }
    if (is3d && r.totalGrams > 0) {
      rows.push({ cells: [`Materiale 3D totale: ${num.format(r.totalGrams)} g  ·  Ore/piatto: ${formatHours(r.hoursPerUnit)}`, '', '', '', '', '', '', '', '', ''], italic: true, small: true, color: C.muted, indent: 3 });
    }
  });
  const totalExtra = (result.jobResults || []).reduce((s, r) => s + r.extraCost, 0);
  rows.push({
    cells: [
      'TOTALE LAVORAZIONI', '', '', '',
      currency.format(result.materialCostTotal), currency.format(result.energyCostTotal),
      currency.format(result.maintenanceCostTotal), currency.format(result.machineAmortCostTotal),
      totalExtra > 0 ? currency.format(totalExtra) : '—',
      currency.format(result.baseTechnicalTotal),
    ],
    bold: true, fill: C.bgPurple,
  });

  const cw = tableW / 100;
  y = drawTable(doc, {
    x: MARGIN, y, fontSize: 6.6, lineH: 3.2,
    columns: [
      { label: 'Lavorazione', width: cw * 22, align: 'left' },
      { label: 'Macchina',    width: cw * 12, align: 'left' },
      { label: 'Materiale',   width: cw * 12, align: 'left' },
      { label: 'Durata',      width: cw * 10, align: 'left' },
      { label: 'Mat.€',       width: cw * 8.5, align: 'right' },
      { label: 'Energ.€',     width: cw * 8.5, align: 'right' },
      { label: 'Manut.€',     width: cw * 8.5, align: 'right' },
      { label: 'Ammort.€',    width: cw * 9,   align: 'right' },
      { label: 'Extra€',      width: cw * 8,   align: 'right' },
      { label: 'Subtot.€',    width: cw * 9.5, align: 'right' },
    ],
    rows,
  });

  y += 8;
  y = ensureSpace(doc, y, 60);

  const cbW = (PAGE_W - MARGIN * 2 - 6) / 2;
  const minApplied = result.priceAfterMinimum > result.priceAfterDiscount + 0.005;

  function calcBox(x, title, lines, highlight) {
    let by = y;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); setText(doc, C.muted);
    doc.text(title.toUpperCase(), x, by);
    by += 5;
    lines.forEach(([k, v]) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); setText(doc, C.muted);
      const kLines = wrapText(doc, k, cbW - 28, 7.5);
      doc.text(kLines, x, by);
      doc.setFont('helvetica', 'bold'); setText(doc, C.text);
      doc.text(v, x + cbW - 2, by, { align: 'right' });
      by += Math.max(4.5, kLines.length * 3.6);
    });
    setFill(doc, C.bgPurple);
    doc.rect(x - 1, by, cbW + 2, 6.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); setText(doc, [76, 29, 149]);
    doc.text(highlight[0], x, by + 4.3);
    doc.text(highlight[1], x + cbW - 2, by + 4.3, { align: 'right' });
    return by + 9;
  }

  const y1 = calcBox(MARGIN, 'Struttura del costo reale', [
    ['Subtotale lavorazioni', currency.format(result.baseTechnicalTotal)],
    [`+ Manodopera (${num.format(result.manualHours)}h × ${currency.format(result.laborRate)})`, currency.format(result.manualLaborCost)],
    [`+ Fallimento ${num.format(result.failureMargin)}%`, currency.format(result.failureCost)],
  ], ['COSTO REALE', currency.format(result.adjustedTotal)]);

  const priceLines = [
    ['Costo reale', currency.format(result.adjustedTotal)],
    [`+ Rincaro ${num.format(result.profitMargin)}%`, '+' + currency.format(result.profitValue)],
    ['− Sconto', '−' + currency.format(result.discountValue)],
  ];
  if (minApplied) priceLines.push(['Prezzo minimo', currency.format(result.minimumPrice)]);
  priceLines.push([`+ IVA ${num.format(result.vatPercent)}%`, result.includeVat ? '+' + currency.format(result.vatValue) : 'esclusa']);
  if (result.includeShipping) priceLines.push(['+ Spedizione', '+' + currency.format(result.shippingTotal)]);

  const y2 = calcBox(MARGIN + cbW + 6, 'Prezzo al cliente', priceLines, ['TOTALE FINALE', currency.format(result.finalRecommendedPrice)]);

  y = Math.max(y1, y2) + 6;
  y = ensureSpace(doc, y, 40);

  const marginNet = result.priceAfterMinimum - result.adjustedTotal;
  const marginPct = result.adjustedTotal > 0 ? (marginNet / result.adjustedTotal * 100) : 0;

  setDraw(doc, [216, 180, 254]); setFill(doc, [250, 245, 255]);
  doc.setLineWidth(0.5);
  const sumBoxH = 26;
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, sumBoxH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); setText(doc, [124, 58, 237]);
  doc.text('RIEPILOGO FINALE', MARGIN + 4, y + 6);

  const tiles = [
    ['Costo reale', currency.format(result.adjustedTotal)],
    ['Margine netto', `${currency.format(marginNet)} (${num.format(marginPct)}%)`],
    result.totalPiecesAll > 1 && result.unitPriceClient
      ? ['Prezzo/pezzo', currency.format(result.unitPriceClient)]
      : ['Pezzi totali', String(result.totalPiecesAll || '—')],
  ];
  if (result.includeShipping) tiles.push(['Spedizione' + (result.includeInsurance ? ' + ass.' : ''), currency.format(result.shippingTotal)]);

  const tileW = (PAGE_W - MARGIN * 2 - 8 - tiles.length * 3) / (tiles.length + 1);
  let tx = MARGIN + 4;
  tiles.forEach(([k, v]) => {
    setDraw(doc, [233, 213, 255]); setFill(doc, C.white);
    doc.roundedRect(tx, y + 9, tileW, 14, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); setText(doc, [124, 58, 237]);
    doc.text(k, tx + 2.5, y + 13.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); setText(doc, [30, 27, 75]);
    doc.text(v, tx + 2.5, y + 19.5);
    tx += tileW + 3;
  });
  setFill(doc, [124, 58, 237]);
  doc.roundedRect(tx, y + 9, tileW, 14, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); setText(doc, [196, 181, 253]);
  doc.text('TOTALE CLIENTE', tx + 2.5, y + 13.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); setText(doc, C.white);
  doc.text(currency.format(result.finalRecommendedPrice), tx + 2.5, y + 19.8);

  setFill(doc, C.purpleD);
  doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');
  setText(doc, [167, 139, 250]);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text('Documento ad uso interno — non divulgare al cliente', MARGIN, PAGE_H - 5);
  doc.text('Generato il ' + genDate, PAGE_W - MARGIN, PAGE_H - 5, { align: 'right' });
}

// ── Generazione PDF ───────────────────────────────────────────────────────────

function showOverlay(visible) {
  const el = document.getElementById('pdfOverlay');
  if (!el) return;
  el.style.display = visible ? 'flex' : 'none';
}

function librariesAvailable() {
  return typeof window.jspdf !== 'undefined';
}

export async function generatePdf(result) {
  if (!librariesAvailable()) {
    alert('Libreria PDF non disponibile. Verifica che vendor/jspdf.umd.min.js sia presente nel repository (vedi README).');
    return;
  }

  showOverlay(true);
  try {
    const profile = await getProfile();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // QR code opzionale: enhancement progressivo, non blocca la generazione se offline
    const qrPayload = profile.Sito || (profile.Email ? 'mailto:' + profile.Email : null);
    const qrDataUrl = await fetchQrDataUrl(qrPayload);

    buildPage1(doc, result, profile, qrDataUrl);
    doc.addPage();
    buildPage2(doc, result, profile);

    doc.setProperties({
      title:    `Preventivo — ${result.jobName || 'senza nome'}`,
      subject:  `Preventivo stampa 3D/laser — ${result.clientName || 'cliente'}`,
      creator:  'Preventivator',
      keywords: 'preventivo, stampa 3D, laser',
    });

    const safeName = (result.jobName || 'preventivo')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`preventivo-${safeName}-${dateStr}.pdf`);
  } catch (err) {
    console.error('[PDF] Errore generazione:', err);
    alert('Errore nella generazione del PDF: ' + err.message);
  } finally {
    showOverlay(false);
  }
}

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
