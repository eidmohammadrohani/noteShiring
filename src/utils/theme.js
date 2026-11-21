import { KEYS, readRaw, writeRaw } from '../services/storageAdapter.js';

export const THEMES = ['light', 'dark'];

export function getStoredTheme() {
  const value = readRaw(KEYS.theme);
  return THEMES.includes(value) ? value : null;
}

export function systemTheme() {
  try {
    return globalThis.matchMedia && globalThis.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  } catch {
    return 'light';
  }
}

export function resolveInitialTheme() {
  return getStoredTheme() || systemTheme();
}

export function applyTheme(theme) {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
}

export function storeTheme(theme) {
  try {
    writeRaw(KEYS.theme, theme);
  } catch {
    /* preference simply will not persist */
  }
}
