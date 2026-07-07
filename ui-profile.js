/**
 * ui-profile.js — Preventivator
 * Gestione del tab Profilo fornitore.
 */

import { loadData, saveData, STORAGE_KEYS } from './storage.js';
import { escapeHtml, showSaved }            from './utils.js';

const FIELD_IDS = [
  'profileNome', 'profileCognome', 'profileRagioneSociale', 'profilePartitaIva',
  'profileCodiceFiscale', 'profileRegimeFiscale', 'profileSdi', 'profilePec',
  'profileEmail', 'profileTelefono', 'profileIndirizzo', 'profileCitta',
  'profileCap', 'profileProvincia', 'profileSito',
];

const REGIME_LABELS = {
  forfettario:   'Regime forfettario',
  ordinario:     'Regime ordinario',
  semplificato:  'Regime semplificato',
  minimi:        'Regime dei minimi',
};

export function getProfile() {
  return loadData(STORAGE_KEYS.profile, { type: 'privato' });
}

function readProfileForm() {
  const type = document.querySelector('input[name="profileType"]:checked')?.value || 'privato';
  const p    = { type };
  FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) p[id.replace('profile', '')] = el.value.trim();
  });
  return p;
}

function applyProfileVisibility(type) {
  document.querySelectorAll('.profile-piva-only').forEach(el =>
    el.classList.toggle('hidden-field', type !== 'piva'));
  document.querySelectorAll('.profile-privato-only').forEach(el =>
    el.classList.toggle('hidden-field', type !== 'privato'));
}

export function renderProfilePreview(p) {
  const box = document.getElementById('profilePreview');
  if (!p || (!p.Nome && !p.RagioneSociale && !p.Cognome)) {
    box.innerHTML = '<div class="pp-empty">Compila i dati e clicca "Salva profilo" per vedere l\'anteprima.</div>';
    return;
  }
  const isPiva = p.type === 'piva';
  const name   = isPiva ? (p.RagioneSociale || '') : `${p.Nome || ''} ${p.Cognome || ''}`.trim();
  const addr   = [
    p.Indirizzo,
    p.Cap && p.Citta ? `${p.Cap} ${p.Citta}` : (p.Citta || p.Cap || ''),
    p.Provincia ? `(${p.Provincia.toUpperCase()})` : '',
  ].filter(Boolean).join(', ');

  let html = `<div class="pp-name">${escapeHtml(name)}</div>`;
  html    += `<div class="pp-badge ${isPiva ? 'piva' : 'privato'}">${isPiva ? 'Partita IVA' : 'Privato'}</div>`;
  if (isPiva && p.PartitaIva)  html += `<div class="pp-row">P.IVA: <strong>${escapeHtml(p.PartitaIva)}</strong></div>`;
  if (p.CodiceFiscale)         html += `<div class="pp-row">C.F.: <strong>${escapeHtml(p.CodiceFiscale)}</strong></div>`;
  if (isPiva && p.RegimeFiscale) html += `<div class="pp-row">${escapeHtml(REGIME_LABELS[p.RegimeFiscale] || p.RegimeFiscale)}</div>`;
  html += '<hr class="pp-divider">';
  if (addr)          html += `<div class="pp-row">📍 ${escapeHtml(addr)}</div>`;
  if (p.Email)       html += `<div class="pp-row">✉️ ${escapeHtml(p.Email)}</div>`;
  if (p.Telefono)    html += `<div class="pp-row">📞 ${escapeHtml(p.Telefono)}</div>`;
  if (isPiva && p.Pec) html += `<div class="pp-row">📨 PEC: ${escapeHtml(p.Pec)}</div>`;
  if (isPiva && p.Sdi) html += `<div class="pp-row">SDI: ${escapeHtml(p.Sdi)}</div>`;
  if (isPiva && p.Sito) html += `<div class="pp-row">🌐 ${escapeHtml(p.Sito)}</div>`;
  box.innerHTML = html;
}

export function restoreProfile() {
  const p      = getProfile();
  const typeVal = p.type || 'privato';
  const radio  = document.querySelector(`input[name="profileType"][value="${typeVal}"]`);
  if (radio) radio.checked = true;
  applyProfileVisibility(typeVal);
  FIELD_IDS.forEach(id => {
    const el  = document.getElementById(id);
    const key = id.replace('profile', '');
    if (el && p[key] !== undefined) el.value = p[key];
  });
  renderProfilePreview(p);
}

export function initProfileHandlers() {
  document.querySelectorAll('input[name="profileType"]').forEach(radio => {
    radio.addEventListener('change', () => applyProfileVisibility(radio.value));
  });

  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const p = readProfileForm();
    saveData(STORAGE_KEYS.profile, p);
    renderProfilePreview(p);
    showSaved('profileSaved');
  });
}
