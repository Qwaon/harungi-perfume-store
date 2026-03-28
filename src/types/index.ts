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
}

export interface OrderPayload {
  name: string;
  contact: string;
  perfumeId: string;
  perfumeName: string;
  brand: string;
  volume: Volume;
  price: number;
}

export interface FilterState {
  brand: string;
  gender: string;
  scentType: string;
  format: string;
}
