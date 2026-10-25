import type { ReactNode } from 'react';
import { effectiveTheme, setTheme, useTheme, type Theme } from '../lib/theme';
import { Icon } from './Icons';

const OPTIONS: { id: Theme; label: string; icon: ReactNode }[] = [
  { id: 'light', label: 'Light', icon: Icon.sun },
  { id: 'dark', label: 'Dark', icon: Icon.moon },
  { id: 'auto', label: 'Match device', icon: Icon.device },
];

/** Three-way switch for the sidebar. */
export function ThemeSwitch() {
  const theme = useTheme();
  return (
    <div className="theme-seg" role="radiogroup" aria-label="Appearance">
      {OPTIONS.map((o) => (
        <button key={o.id} role="radio" aria-checked={theme === o.id} title={o.label} onClick={() => setTheme(o.id)}>
          {o.icon}<span>{o.id === 'auto' ? 'Auto' : o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Single button for tight spaces: flips between light and dark. */
export function ThemeButton({ className }: { className?: string }) {
  const theme = useTheme();
  const dark = effectiveTheme(theme) === 'dark';
  return (
    <button className={className} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark ? Icon.sun : Icon.moon}
    </button>
  );
}
