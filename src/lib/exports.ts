import { fmtDate, fmtFull, todayISO } from './dates';
import { formatMoney, num } from './format';
import { statusName } from './lists';
import { orderBalance, orderPaid, paymentStatusLabel } from './money';
import type { BookData, Expense, Order, Settings } from './types';

export function downloadFile(filename: string, data: string, mime: string) {
  const blob = new Blob([data], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: unknown) => {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n');

export function exportOrdersCSV(orders: Order[], labelNames: (ids: string[]) => string = () => '') {
  const rows: unknown[][] = [['Event date', 'Client', 'Phone', 'Email', 'Service', 'Flowers', 'Status', 'Labels', 'Total', 'Paid', 'Balance', 'Payment status', 'Notes']];
  orders.slice().sort((a, b) => a.eventDate.localeCompare(b.eventDate)).forEach((o) => {
    rows.push([o.eventDate, o.clientName, o.phone, o.email, o.serviceType, o.flowerType, statusName(o.status), labelNames(o.labels), num(o.totalPrice), orderPaid(o), orderBalance(o), paymentStatusLabel(o), o.notes]);
  });
  downloadFile('candle-club-orders-' + todayISO() + '.csv', csv(rows), 'text/csv');
}

export function exportExpensesCSV(expenses: Expense[]) {
  const rows: unknown[][] = [['Date', 'Category', 'Amount', 'Note']];
  expenses.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => rows.push([e.date, e.category, num(e.amount), e.note]));
  downloadFile('candle-club-expenses-' + todayISO() + '.csv', csv(rows), 'text/csv');
}

export function exportBackup(book: BookData) {
  const body = { app: 'candle-club', version: 1, exportedAt: new Date().toISOString(), orders: book.orders, expenses: book.expenses, settings: book.settings };
  downloadFile('candle-club-backup-' + todayISO() + '.json', JSON.stringify(body, null, 2), 'application/json');
}

const esc = (s: unknown) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export function invoiceHTML(o: Order, s: Settings): string {
  const money = (n: unknown) => formatMoney(n, s.currency);
  const no = 'CC-' + o.eventDate.replace(/-/g, '').slice(2) + '-' + o.id.slice(-4).toUpperCase();
  const pays = (o.payments || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const bal = orderBalance(o);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invoice ' + no + '</title>' +
    '<style>body{margin:0;background:#F3EFE9;font-family:Georgia,"Iowan Old Style",serif;color:#2F2A26}' +
    '.pg{max-width:760px;margin:32px auto;background:#FCFAF6;padding:48px 52px;border-radius:14px;box-shadow:0 10px 40px -20px rgba(0,0,0,.3)}' +
    'h1{font-weight:400;font-size:40px;margin:0;letter-spacing:-.02em}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #3D352E;padding-bottom:22px}' +
    '.k{font-family:system-ui,sans-serif;font-size:12px;color:#66685A;margin-bottom:3px}.m{font-family:ui-monospace,Menlo,monospace}' +
    '.cols{display:flex;gap:40px;margin:26px 0}table{width:100%;border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;margin:8px 0 22px}' +
    'th{text-align:left;font-weight:500;color:#66685A;font-size:12px;padding:8px 0;border-bottom:1px solid #E0D5BE}td{padding:10px 0;border-bottom:1px solid #EFE7D4}.r{text-align:right}' +
    '.tot{margin-left:auto;width:280px;font-family:system-ui,sans-serif;font-size:14px}.tot div{display:flex;justify-content:space-between;padding:6px 0}.tot .big{border-top:2px solid #3D352E;margin-top:6px;padding-top:10px;font-size:18px;font-weight:600}' +
    '.note{font-family:system-ui,sans-serif;font-size:13px;color:#66685A;margin-top:30px}@media print{body{background:#fff}.pg{box-shadow:none;margin:0}}</style></head><body><div class="pg">' +
    '<div class="top"><div><h1>' + esc(s.businessName) + '</h1>' + (s.contact ? '<div class="k" style="margin-top:8px">' + esc(s.contact) + '</div>' : '') + '</div>' +
    '<div style="text-align:right"><div class="k">Invoice</div><div class="m">' + no + '</div><div class="k" style="margin-top:10px">Issued</div><div class="m">' + esc(fmtDate(todayISO())) + '</div></div></div>' +
    '<div class="cols"><div><div class="k">Billed to</div><div style="font-size:18px">' + esc(o.clientName) + '</div>' +
    (o.phone ? '<div class="k">' + esc(o.phone) + '</div>' : '') + (o.email ? '<div class="k">' + esc(o.email) + '</div>' : '') + '</div>' +
    '<div><div class="k">Event date</div><div class="m">' + esc(fmtFull(o.eventDate)) + '</div></div></div>' +
    '<table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody><tr><td>' + esc(o.serviceType) + (o.flowerType ? ', ' + esc(o.flowerType.toLowerCase()) + ' flowers' : '') +
    (o.notes ? '<div style="color:#66685A;font-size:12.5px;margin-top:4px">' + esc(o.notes) + '</div>' : '') + '</td><td class="r m">' + money(o.totalPrice) + '</td></tr></tbody></table>' +
    (pays.length ? '<table><thead><tr><th>Payments received</th><th>Method</th><th class="r">Amount</th></tr></thead><tbody>' + pays.map((p) => '<tr><td class="m">' + esc(fmtDate(p.date)) + '</td><td>' + esc(p.method) + '</td><td class="r m">' + money(p.amount) + '</td></tr>').join('') + '</tbody></table>' : '') +
    '<div class="tot"><div><span>Total</span><span class="m">' + money(o.totalPrice) + '</span></div><div><span>Paid</span><span class="m">' + money(orderPaid(o)) + '</span></div>' +
    '<div class="big"><span>' + (bal > 0 ? 'Balance due' : 'Paid in full') + '</span><span class="m">' + money(Math.max(0, bal)) + '</span></div></div>' +
    '<p class="note">Thank you for choosing ' + esc(s.businessName) + '.</p></div></body></html>';
}

export function downloadInvoice(o: Order, s: Settings) {
  const slug = o.clientName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  downloadFile('invoice-' + slug + '-' + o.eventDate + '.html', invoiceHTML(o, s), 'text/html');
}
