import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { useConfirm } from '../components/Confirm';
import { useToast } from '../components/Toasts';
import { useBook } from '../data/BookContext';
import { MONTHS } from '../lib/constants';
import { fmtShort, inPeriod, pad, type Period } from '../lib/dates';
import { exportExpensesCSV } from '../lib/exports';
import { num, plural } from '../lib/format';
import { allPayments, isActive, orderBalance } from '../lib/money';
import { useUI } from '../ui';

const PERIODS: [Period, string][] = [['month', 'This month'], ['year', 'This year'], ['all', 'All time']];

export function FinancesView() {
  const book = useBook();
  const ui = useUI();
  const confirm = useConfirm();
  const toast = useToast();
  const { orders, expenses, money } = book;
  const P = ui.finPeriod;

  const pays = allPayments(orders);
  const periodPays = pays.filter((p) => inPeriod(p.date, P));
  const income = periodPays.reduce((s, p) => s + p.amount, 0);
  const exps = expenses.filter((e) => inPeriod(e.date, P));
  const expense = exps.reduce((s, e) => s + num(e.amount), 0);
  const profit = income - expense;
  const owingOrders = orders.filter((o) => isActive(o) && orderBalance(o) > 0);
  const outstanding = owingOrders.reduce((s, o) => s + orderBalance(o), 0);
  const margin = income > 0 ? Math.round(profit / income * 100) : null;
  const pLabel = { month: MONTHS[new Date().getMonth()], year: String(new Date().getFullYear()), all: 'All time' }[P];

  const byCat: Record<string, number> = {};
  exps.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + num(e.amount); });
  const catList = Object.keys(byCat).sort((a, b) => byCat[b] - byCat[a]);
  const catMax = catList.length ? byCat[catList[0]] : 0;

  const expAll = expenses.slice().sort((a, b) => b.date.localeCompare(a.date));
  const payAll = pays.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);

  async function deleteExpense(id: string) {
    const ex = expenses.find((x) => x.id === id);
    const ok = await confirm({ title: 'Delete this expense?', body: (ex ? money(ex.amount) + ' for ' + (ex.note || ex.category) : 'This expense') + ' will be removed from your finances.', ok: 'Delete expense', danger: true });
    if (!ok) return;
    book.deleteExpense(id);
    toast('Expense deleted');
  }

  return (
    <>
      <div className="head">
        <div>
          <h1 className="title">Finances</h1>
          <p className="subline">Income is every payment recorded on an order. Expenses are everything you log here.</p>
        </div>
        <div className="head-actions">
          <div className="seg" role="group" aria-label="Period">
            {PERIODS.map(([k, label]) => <button key={k} aria-pressed={P === k} onClick={() => ui.setFinPeriod(k)}>{label}</button>)}
          </div>
          <button className="btn primary" onClick={() => ui.setSheet({ kind: 'expense', id: null })}>{Icon.plus}Add expense</button>
        </div>
      </div>

      <div className="ledger">
        <Ledger color="var(--green)" k="Income" v={money(income)} n={plural(periodPays.length, 'payment') + ', ' + pLabel} />
        <Ledger color="var(--rose)" k="Expenses" v={money(expense)} n={plural(exps.length, 'entry', 'entries') + ', ' + pLabel} />
        <Ledger color="var(--gold)" k="Net profit" v={money(profit)} n={margin == null ? pLabel : margin + '% margin, ' + pLabel} neg={profit < 0} />
        <Ledger color="var(--accent)" k="Outstanding" v={money(outstanding)} n={plural(owingOrders.length, 'order') + ' with a balance'} />
      </div>

      <div className="fin-grid">
        <section className="panel">
          <div className="panel-h">
            <h2>Last six months</h2>
            <div className="chart-legend"><span><i style={{ background: 'var(--green)' }} />Income</span><span><i style={{ background: 'var(--rose)' }} />Expenses</span></div>
          </div>
          <Chart />
        </section>
        <section className="panel">
          <div className="panel-h"><h2>Where the money went</h2><span className="faint" style={{ fontSize: 12.5 }}>{pLabel}</span></div>
          <div className="panel-b">
            {catList.length ? (
              <div className="cats">
                {catList.map((c) => (
                  <div key={c} className="cat-row">
                    <div className="cat-top"><span>{c} <span className="faint">{expense ? Math.round(byCat[c] / expense * 100) : 0}%</span></span><b>{money(byCat[c])}</b></div>
                    <div className="cat-bar"><i style={{ width: (byCat[c] / catMax * 100).toFixed(1) + '%' }} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="empty-note">No expenses logged for {P === 'all' ? 'any period' : pLabel} yet.</p>}
          </div>
        </section>
      </div>

      <div className="fin-grid two">
        <section className="panel">
          <div className="panel-h">
            <h2>Expense log</h2>
            {expenses.length > 0 && <button className="btn sm ghost" onClick={() => exportExpensesCSV(expenses)}>{Icon.download}CSV</button>}
          </div>
          <div className="panel-b">
            {expAll.length ? (
              <ul className="log">
                {expAll.map((e) => (
                  <li key={e.id}>
                    <div className="log-row">
                      <span className="log-date">{fmtShort(e.date)}</span>
                      <button className="log-main" onClick={() => ui.setSheet({ kind: 'expense', id: e.id })}>
                        <b>{e.note || e.category}</b>
                        <small><span className="tag">{e.category}</span>{e.date.slice(0, 4)}</small>
                      </button>
                      <span className="log-amt out">−{money(e.amount)}</span>
                      <button className="x" aria-label="Delete expense" onClick={() => deleteExpense(e.id)}>{Icon.trash}</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="empty-note">No expenses yet. Log flower purchases, transport, rent and anything else you spend on.</p>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-h"><h2>Recent payments</h2><span className="faint" style={{ fontSize: 12.5 }}>Latest 15</span></div>
          <div className="panel-b">
            {payAll.length ? (
              <ul className="log">
                {payAll.map((p) => (
                  <li key={p.id}>
                    <button className="log-row p" onClick={() => ui.setSheet({ kind: 'order', id: p.orderId })}>
                      <span className="log-date">{fmtShort(p.date)}</span>
                      <span className="log-main"><b>{p.client}</b><small>{p.method || ''}, {p.service}</small></span>
                      <span className="log-amt in">+{money(p.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="empty-note">Payments appear here when you record them on an order.</p>}
          </div>
        </section>
      </div>
    </>
  );
}

function Ledger({ color, k, v, n, neg }: { color: string; k: string; v: string; n: string; neg?: boolean }) {
  return (
    <div className="lg">
      <div className="lg-k"><i style={{ ['--k' as string]: color }} />{k}</div>
      <div className={'lg-v' + (neg ? ' neg' : '')}>{v}</div>
      <div className="lg-n">{n}</div>
    </div>
  );
}

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const s of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (s * p >= v) return s * p;
  return 10 * p;
}

function useNarrow(query = '(max-width: 599px)') {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

function Chart() {
  const { orders, expenses, money, compact } = useBook();
  const narrow = useNarrow();
  const boxRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ i: number; left: number; top: number } | null>(null);

  const t = new Date();
  const months = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(t.getFullYear(), t.getMonth() - (5 - k), 1);
    return { key: d.getFullYear() + '-' + pad(d.getMonth() + 1), label: MONTHS[d.getMonth()].slice(0, 3), full: MONTHS[d.getMonth()] + ' ' + d.getFullYear(), inc: 0, exp: 0 };
  });
  const idx: Record<string, number> = {};
  months.forEach((m, i) => { idx[m.key] = i; });
  allPayments(orders).forEach((p) => { const k = (p.date || '').slice(0, 7); if (k in idx) months[idx[k]].inc += p.amount; });
  expenses.forEach((e) => { const k = (e.date || '').slice(0, 7); if (k in idx) months[idx[k]].exp += num(e.amount); });

  const max = niceMax(Math.max(...months.map((m) => Math.max(m.inc, m.exp))));
  const W = narrow ? 380 : 640, H = narrow ? 240 : 270, L = narrow ? 46 : 58, R = 6, T = 14, B = 30;
  const iw = W - L - R, ih = H - T - B, gw = iw / 6, bw = Math.min(26, gw * (narrow ? 0.3 : 0.28)), gap = 5;

  function showTip(i: number, el: SVGRectElement) {
    const box = boxRef.current;
    if (!box) return;
    const br = box.getBoundingClientRect(), rr = el.getBoundingClientRect();
    setTip({ i, left: Math.min(Math.max(rr.left - br.left + rr.width / 2, 80), br.width - 80), top: rr.top - br.top + 30 });
  }
  const tm = tip ? months[tip.i] : null;

  return (
    <div className="chart-box" ref={boxRef}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Income and expenses for the last six months">
        {[0, 1, 2, 3, 4].map((g) => {
          const y = T + ih - ih * g / 4;
          return (
            <g key={g}>
              <line x1={L} x2={W - R} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" strokeDasharray={g ? '2 4' : undefined} />
              <text x={L - 10} y={y + 4} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="var(--ink-faint)">{compact(max * g / 4)}</text>
            </g>
          );
        })}
        {months.map((m, i) => {
          const cx = L + gw * i + gw / 2;
          const hi = m.inc / max * ih, he = m.exp / max * ih;
          const isNow = i === 5;
          return (
            <g key={m.key}>
              <g className={'bar-g' + (tip?.i === i ? ' hot' : '')}>
                <rect x={cx - bw - gap / 2} y={T + ih - hi} width={bw} height={Math.max(hi, m.inc ? 2 : 0)} rx="4" fill="var(--green)" />
                <rect x={cx + gap / 2} y={T + ih - he} width={bw} height={Math.max(he, m.exp ? 2 : 0)} rx="4" fill="var(--rose)" opacity={isNow ? undefined : 0.88} />
              </g>
              <text x={cx} y={H - 10} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight={isNow ? 600 : 400} fill={isNow ? 'var(--ink)' : 'var(--ink-soft)'}>{m.label}</text>
              <rect
                className="bar-hit" x={L + gw * i} y={T} width={gw} height={ih}
                aria-label={`${m.full}: income ${money(m.inc)}, expenses ${money(m.exp)}`}
                onMouseEnter={(e) => showTip(i, e.currentTarget)}
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      <div className={'tip' + (tm ? ' on' : '')} style={tip ? { left: tip.left, top: tip.top } : undefined}>
        {tm && <>
          <b>{tm.full}</b>
          Income <span>{money(tm.inc)}</span><br />
          Expenses <span>{money(tm.exp)}</span><br />
          Net <span>{money(tm.inc - tm.exp)}</span>
        </>}
      </div>
    </div>
  );
}
