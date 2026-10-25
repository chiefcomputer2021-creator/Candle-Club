export function num(v: unknown): number {
  const n = parseFloat(String(v));
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
export const plural = (n: number, a: string, b?: string) => n + ' ' + (n === 1 ? a : (b || a + 's'));
export const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

const localeFor = (cur: string) => (cur === '₹' ? 'en-IN' : 'en-US');
const trim1 = (x: number) => (Math.round(x * 10) / 10).toString();

export function formatMoney(n: unknown, cur: string): string {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString(localeFor(cur), { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (v < 0 ? '−' : '') + cur + s;
}
export function formatCompact(n: number, cur: string): string {
  n = Number(n) || 0;
  if (cur === '₹') {
    if (n >= 1e7) return cur + trim1(n / 1e7) + 'Cr';
    if (n >= 1e5) return cur + trim1(n / 1e5) + 'L';
  } else if (n >= 1e6) return cur + trim1(n / 1e6) + 'M';
  if (n >= 1e3) return cur + trim1(n / 1e3) + 'k';
  return cur + Math.round(n);
}
