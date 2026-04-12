export type Volume = '2ml' | '5ml' | '10ml' | '50ml' | '100ml';
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
  featured: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
  occasion: Occasion[];
  season: Season[];
  intensity: Intensity;
  inStock: boolean;
  sourceType: SourceType;
}

export interface OrderPayload {
  name: string;
  contact: string;
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volume: Volume;
  price: number;
  source: string;
  pageUrl: string;
  pagePath: string;
  timestamp: string;
  messageType: 'order' | 'consultation';
}

export interface FilterState {
  brand: string;
  gender: string;
  scentType: string;
  format: string;
  season: string;
  intensity: string;
}
