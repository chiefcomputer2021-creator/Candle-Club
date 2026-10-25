import { DEFAULT_LISTS, DEFAULT_STATUSES } from './lists';
import type { Settings } from './types';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DEFAULT_SETTINGS: Settings = {
  currency: '₹', weekStart: 0, businessName: 'The Candle Club', contact: '',
  statuses: DEFAULT_STATUSES, labels: [], ...DEFAULT_LISTS,
};
