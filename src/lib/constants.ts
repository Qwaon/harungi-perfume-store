import type { Volume } from '@/types';

export const TELEGRAM_URL = 'https://t.me/alsharkisia';

export const VOLUME_LABELS: Record<Volume, string> = {
  '2ml': '2 мл',
  '5ml': '5 мл',
  '10ml': '10 мл',
  '50ml': '50 мл',
  '100ml': '100 мл',
};

export const VOLUME_HINTS: Record<Volume, string> = {
  '2ml': '~20 нанесений',
  '5ml': '~50 нанесений',
  '10ml': '~100 нанесений',
  '50ml': 'Полный флакон',
  '100ml': 'Полный флакон',
};
