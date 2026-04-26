import type { Volume } from '@/types';

export const TELEGRAM_URL = 'https://t.me/alsharkisia';

export const VOLUME_LABELS: Record<Volume, string> = {
  '5ml': '5 мл',
  '10ml': '10 мл',
  '15ml': '15 мл',
  '20ml': '20 мл',
  'original': 'Оригинал',
};

export const VOLUME_HINTS: Record<Volume, string> = {
  '5ml': '~50 нанесений',
  '10ml': '~100 нанесений',
  '15ml': '~150 нанесений',
  '20ml': '~200 нанесений',
  'original': 'Полный флакон',
};
