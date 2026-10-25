import { uid } from './format';

/** Colour choices for statuses and labels; each maps to a .sw-<key> class that sets --c (light + dark). */
export const SWATCHES = ['slate', 'wine', 'gold', 'leaf', 'taupe', 'rose', 'plum', 'umber', 'sky', 'peach'] as const;
export type Swatch = (typeof SWATCHES)[number];
export const swatchClass = (c: string) => 'sw-' + (SWATCHES.includes(c as Swatch) ? c : 'taupe');

/** What a status means for the money maths and the "mark complete" shortcut. */
export type StatusKind = 'open' | 'done' | 'cancelled';
export const KIND_LABEL: Record<StatusKind, string> = { open: 'In progress', done: 'Completed', cancelled: 'Cancelled' };

export interface StatusDef { id: string; name: string; color: Swatch; kind: StatusKind }
export interface Label { id: string; name: string; color: Swatch }

// Built-in IDs equal their original names, so orders saved before statuses were editable still match.
export const DEFAULT_STATUSES: StatusDef[] = [
  { id: 'Inquiry', name: 'Inquiry', color: 'slate', kind: 'open' },
  { id: 'Confirmed', name: 'Confirmed', color: 'wine', kind: 'open' },
  { id: 'In Progress', name: 'In Progress', color: 'gold', kind: 'open' },
  { id: 'Completed', name: 'Completed', color: 'leaf', kind: 'done' },
  { id: 'Cancelled', name: 'Cancelled', color: 'taupe', kind: 'cancelled' },
];

export const DEFAULT_LISTS = {
  services: ['Altar Decor', 'Wedding Car Decor', 'Funeral/Grave Floral', 'Bridal Bouquet', 'Table Centerpiece', 'Candle Arrangement', 'Event Florals (Other)', 'Custom/Other'],
  flowers: ['Local', 'Exotic', 'Mixed'],
  paymentMethods: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'],
  expenseCategories: ['Flowers & Greenery', 'Vessels & Props', 'Transport', 'Labor', 'Candles & Materials', 'Rent', 'Other'],
};
export type ListKey = keyof typeof DEFAULT_LISTS;

export const newStatus = (name: string, color: Swatch = 'plum', kind: StatusKind = 'open'): StatusDef => ({ id: uid('st'), name, color, kind });
export const newLabel = (name: string, color: Swatch = 'umber'): Label => ({ id: uid('lb'), name, color });

/*
 * The statuses in use, kept here so plain helpers like isActive() don't need settings passed in.
 * BookProvider registers the business's list whenever it changes.
 */
let current: StatusDef[] = DEFAULT_STATUSES;
let byId = new Map(current.map((s) => [s.id, s]));
export function registerStatuses(defs: StatusDef[]) {
  current = defs.length ? defs : DEFAULT_STATUSES;
  byId = new Map(current.map((s) => [s.id, s]));
}
/** Unknown IDs (e.g. a status that was deleted) still render, as a neutral open status. */
export const statusDef = (id: string): StatusDef => byId.get(id) || { id, name: id || 'No status', color: 'taupe', kind: 'open' };
export const statusName = (id: string) => statusDef(id).name;
export const statusKind = (id: string) => statusDef(id).kind;
export const firstOfKind = (kind: StatusKind) => current.find((s) => s.kind === kind);
