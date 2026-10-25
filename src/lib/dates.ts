import { DOW } from './constants';

export const pad = (n: number) => (n < 10 ? '0' : '') + n;
export const iso = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const todayISO = () => iso(new Date());

export function parseISO(s: string | undefined | null): Date {
  const p = String(s || '').split('-');
  return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
}
export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);

export function fmtDate(s: string | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!s) return '';
  return parseISO(s).toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'short', year: 'numeric' });
}
export const fmtShort = (s: string) => fmtDate(s, { day: 'numeric', month: 'short' });
export const fmtLong = (s: string) => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtFull = (s: string) => fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function relDay(s: string): string {
  const d = daysBetween(todayISO(), s);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d < 7) return 'In ' + d + ' days';
  if (d < -1 && d > -7) return Math.abs(d) + ' days ago';
  return DOW[parseISO(s).getDay()].slice(0, 3);
}

export type Period = 'month' | 'year' | 'all';
export function inPeriod(d: string | undefined, period: Period): boolean {
  if (!d) return false;
  const t = todayISO();
  if (period === 'month') return d.slice(0, 7) === t.slice(0, 7);
  if (period === 'year') return d.slice(0, 4) === t.slice(0, 4);
  return true;
}
