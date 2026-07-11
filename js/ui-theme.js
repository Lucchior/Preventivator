/**
 * ui-theme.js — Preventivator
 * Gestione tema chiaro/scuro con preferenza salvata in IndexedDB.
 */

import { loadData, saveData } from './storage.js';

const THEME_KEY    = 'preventivator_theme';
const LIGHT_CLASS  = 'light-theme';
const BTN_ID       = 'themeToggleBtn';

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.classList.toggle(LIGHT_CLASS, isLight);
  const btn = document.getElementById(BTN_ID);
  if (btn) {
    btn.textContent = isLight ? '🌙' : '☀️';
    btn.title       = isLight ? 'Passa al tema scuro' : 'Passa al tema chiaro';
  }
}

export async function initTheme() {
  const saved = await loadData(THEME_KEY, 'dark');
  applyTheme(saved);

  document.getElementById(BTN_ID)?.addEventListener('click', async () => {
    const current = document.documentElement.classList.contains(LIGHT_CLASS) ? 'light' : 'dark';
    const next    = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    await saveData(THEME_KEY, next);
  });
}
