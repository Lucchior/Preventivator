/**
 * ui-theme.js — Preventivator
 * Tema chiaro/scuro: segue prefers-color-scheme di default,
 * con override manuale salvato in IndexedDB.
 */

import { loadData, saveData } from './storage.js';

const THEME_KEY = 'preventivator_theme';

function applyTheme(theme) {
  const html  = document.documentElement;
  const isDark = theme === 'dark';
  html.classList.toggle('dark-theme',  isDark);
  html.classList.toggle('light-theme', !isDark);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.title       = isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro';
  }
}

export async function initTheme() {
  // Default: segue preferenza OS; override salvato vince
  const prefersDark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const systemTheme  = prefersDark ? 'dark' : 'light';
  const saved        = await loadData(THEME_KEY, systemTheme);
  applyTheme(saved);

  // Ascolta cambi OS (validi solo se l'utente non ha un override)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async (e) => {
    const override = await loadData(THEME_KEY, null);
    if (!override) applyTheme(e.matches ? 'dark' : 'light');
  });

  document.getElementById('themeToggleBtn')?.addEventListener('click', async () => {
    const current = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
    const next    = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    await saveData(THEME_KEY, next);
  });
}
