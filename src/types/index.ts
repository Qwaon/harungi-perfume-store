export type Volume = '5ml' | '10ml' | '15ml' | '20ml' | 'original';
export type Gender = 'мужской' | 'женский' | 'унисекс';
export type ScentType =
  | 'цветочный'
  | 'восточный'
  | 'древесный'
  | 'свежий'
  | 'фужерный'
  | 'шипровый'
  | 'гурманский';

export type Format = 'оригинал' | 'распив';
export type Occasion = 'офис' | 'вечер' | 'ежедневно' | 'свидание' | 'путешествие';
export type Season = 'весна' | 'лето' | 'осень' | 'зима' | 'всесезонный';
export type Intensity = 'лёгкий' | 'средний' | 'насыщенный';
export type SourceType = 'retail' | 'decant';

export interface Perfume {
  id: string;
  name: string;
  brand: string;
  description: string;
  notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  gender: Gender;
  scentType: ScentType;
  format: Format;
  images: string[];
  prices: Partial<Record<Volume, number>>;
  availableVolumes: Volume[];
  originalVolumeMl?: number;
  featured: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
  occasion: Occasion[];
  season: Season[];
  intensity: Intensity;
  inStock: boolean;
  sourceType: SourceType;
}

export interface CartItem {
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volume: Volume;
  volumeLabel: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface OrderPayload {
  name: string;
  contact: string;
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volume: Volume;
  volumeLabel: string;
  price: number;
  source: string;
  pageUrl: string;
  pagePath: string;
  timestamp: string;
  messageType: 'order' | 'consultation';
  // 'single' для обычного заказа, 'consultation' для консультации.
  type: 'single' | 'consultation';
  // Telegram user id (только при заказе из Mini App), для будущей привязки.
  tgUserId?: string;
  // Подписанная Telegram initData: Worker берёт tg_user_id из неё (надёжнее tgUserId).
  initData?: string;
}

export interface CartOrderPayload {
  name: string;
  contact: string;
  items: CartItem[];
  total: number;
  source: string;
  pageUrl: string;
  pagePath: string;
  timestamp: string;
  messageType: 'cart-order';
  type: 'cart';
  tgUserId?: string;
  // Подписанная Telegram initData: Worker берёт tg_user_id из неё (надёжнее tgUserId).
  initData?: string;
}

// Ответ Worker'а на POST / — orderNumber может быть null, если Airtable недоступен.
export interface OrderResponse {
  ok: boolean;
  orderNumber?: number | null;
  error?: string;
}

export interface FilterState {
  brand: string;
  gender: string;
  scentType: string;
  format: string;
  season: string;
  intensity: string;
}
