import { DEFAULT_LISTS } from './lists';
import { addDays, iso, pad, todayISO } from './dates';
import { uid } from './format';
import type { Expense, Order, Payment } from './types';

export function buildSample(): { orders: Order[]; expenses: Expense[] } {
  const t = todayISO();
  const people = ['Ananya Rao', 'Joseph and Maria D’Souza', 'St. Thomas Parish', 'Priya Menon', 'The Fernandes family', 'Rahul Kapoor', 'Leela Nair', 'Grace Chapel', 'Sneha Iyer', 'Arjun and Kavya', 'Mary Thomas', 'Vikram Shetty', 'Hope Fellowship', 'Neha Pillai', 'Celine Mascarenhas', 'Rohan Bhat', 'Our Lady of Health Church', 'Divya Krishnan', 'Anil and Rekha', 'Teresa Gomes'];
  const plan: [number, number, number][] = [
    [-165, 0, 24000], [-150, 3, 4800], [-138, 1, 7500], [-120, 6, 38000], [-104, 2, 5500], [-92, 4, 14400], [-77, 0, 26000], [-63, 5, 6200],
    [-49, 3, 5200], [-36, 1, 8000], [-22, 2, 5500], [-12, 6, 42000], [-5, 4, 12800], [-2, 0, 21500], [1, 3, 3600], [3, 1, 6500],
    [-158, 6, 31000], [-131, 0, 19500], [-112, 3, 5600], [-97, 6, 27000], [-84, 1, 7200], [-70, 0, 23000], [-56, 6, 34000], [-43, 4, 11200], [-29, 0, 18500], [-17, 5, 6800],
    [6, 0, 20000], [9, 5, 4800], [13, 6, 26000], [17, 2, 4500], [24, 3, 4000], [33, 0, 19000],
  ];
  const methods = ['UPI', 'Cash', 'Bank Transfer', 'UPI', 'Cash'];
  const notesFor = ['White lilies and ivory candles on the altar steps and front pews.', 'Car arrives at 9:30. Red roses on the bonnet, ribbons on the doors.', 'Simple wreath, white chrysanthemums and eucalyptus.', 'Blush and cream palette, trailing greenery.', 'Twelve tables, low arrangements so guests can see each other.', 'Pillar candles in glass with floating roses for the entrance.', 'Stage backdrop and entrance arch, venue access from 2 pm.', ''];

  const orders: Order[] = plan.map((p, i) => {
    const ev = addDays(t, p[0]);
    const price = p[2];
    const pays: Payment[] = [];
    let status: string;
    let created = addDays(ev, -(18 + (i % 4) * 9));
    if (created > t) created = addDays(t, -2);
    if (p[0] < 0) {
      status = i === 7 || i === 19 ? 'Cancelled' : 'Completed';
      if (status === 'Completed') {
        const dep = Math.round(price * (i % 2 ? 0.4 : 0.5) / 100) * 100;
        pays.push({ id: uid('pay'), date: addDays(ev, -10 - (i % 5)), amount: dep, method: methods[i % 5] });
        if (i !== 12 && i !== 13) pays.push({ id: uid('pay'), date: ev, amount: price - dep, method: methods[(i + 2) % 5] });
        else if (i === 13) pays.push({ id: uid('pay'), date: addDays(ev, 1), amount: Math.round((price - dep) / 2), method: 'Cash' });
      } else pays.push({ id: uid('pay'), date: addDays(ev, -20), amount: 1000, method: 'UPI' });
    } else if (p[0] <= 4) {
      status = 'In Progress';
      pays.push({ id: uid('pay'), date: addDays(t, -8 - (i % 3)), amount: Math.round(price * 0.5 / 100) * 100, method: methods[i % 5] });
    } else if (p[0] <= 20) {
      status = i % 3 === 0 ? 'Inquiry' : 'Confirmed';
      if (status === 'Confirmed') pays.push({ id: uid('pay'), date: addDays(t, -(i % 6) - 1), amount: Math.round(price * 0.3 / 100) * 100, method: methods[i % 5] });
    } else status = 'Inquiry';
    return {
      id: uid('ord'), clientName: people[i % people.length], phone: '98' + String(45000000 + i * 731219).slice(0, 8), email: '',
      eventDate: ev, serviceType: DEFAULT_LISTS.services[p[1]], flowerType: DEFAULT_LISTS.flowers[i % 3], totalPrice: price, status, labels: [],
      notes: notesFor[p[1]], createdAt: created + 'T10:00:00.000Z', payments: pays,
    };
  });

  const expenses: Expense[] = [];
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const ym = iso(base).slice(0, 8);
    const maxDay = m === 0 ? now.getDate() : 28;
    const add = (day: number, category: string, amount: number, note: string) => {
      if (day <= maxDay) expenses.push({ id: uid('exp'), date: ym + pad(day), category, amount, note });
    };
    add(1, 'Rent', 9500, 'Studio rent');
    add(4, 'Flowers & Greenery', 6200 + m * 340, 'Weekly market run');
    add(12, 'Flowers & Greenery', 4800 + (m % 3) * 900, 'Roses, lilies and fillers');
    add(19, 'Flowers & Greenery', 3900 + (m % 2) * 1500, 'Exotic order, orchids');
    add(8, 'Candles & Materials', 2400 + (m % 3) * 600, 'Pillar candles and floral foam');
    add(15, 'Transport', 1800 + (m % 4) * 250, 'Van hire for weekend events');
    add(22, 'Labor', 4000, 'Helpers for setup');
    if (m % 2 === 0) add(10, 'Vessels & Props', 3500, 'Brass urns and glass cylinders');
    if (m === 3) add(25, 'Other', 1200, 'Studio repairs');
  }
  return { orders, expenses };
}
