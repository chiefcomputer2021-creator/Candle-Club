import { useSyncExternalStore } from 'react';

export type Theme = 'auto' | 'light' | 'dark';

// Appearance is a per-device preference, not shared with the team.
const KEY = 'candleclub-theme';
const listeners = new Set<() => void>();
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

/** What's actually on screen once "auto" follows the device setting. */
export const effectiveTheme = (t: Theme = getTheme()): 'light' | 'dark' =>
  t === 'auto' ? (darkQuery().matches ? 'dark' : 'light') : t;

export function applyTheme(t: Theme) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
  const bar = effectiveTheme(t) === 'dark' ? '#141210' : '#EAE3D9';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
}

export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t); } catch { /* storage blocked */ }
  applyTheme(t);
  listeners.forEach((l) => l());
}

/** Keeps the theme-color bar right when the device switches while on "auto". */
export function watchDeviceTheme() {
  darkQuery().addEventListener('change', () => {
    if (getTheme() === 'auto') applyTheme('auto');
    listeners.forEach((l) => l());
  });
}

export function useTheme(): Theme {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, getTheme);
}
