// src/lib/orderHistory.ts
'use client';

import { Volume } from '@/types';
import { storageGet, storageSet } from '@/lib/storage';

const ORDERS_KEY = 'orders';
const MAX_ORDERS = 50;

/** Позиция: [perfumeId, volume, quantity, unitPrice] — компактно под лимит 4 КБ. */
export type StoredOrderItem = [string, Volume, number, number];

export interface StoredOrder {
  id: string;
  ts: string; // ISO дата
  items: StoredOrderItem[];
  total: number;
  type: 'order' | 'cart-order';
}

function isStoredOrder(x: unknown): x is StoredOrder {
  return (
    !!x &&
    typeof (x as StoredOrder).id === 'string' &&
    typeof (x as StoredOrder).ts === 'string' &&
    Array.isArray((x as StoredOrder).items) &&
    typeof (x as StoredOrder).total === 'number'
  );
}

export async function readOrders(): Promise<StoredOrder[]> {
  try {
    const raw = await storageGet(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredOrder);
  } catch {
    return [];
  }
}

/** Добавляет заказ в начало истории, обрезает до MAX_ORDERS. Никогда не бросает. */
export async function appendOrder(order: Omit<StoredOrder, 'id' | 'ts'>): Promise<void> {
  try {
    const existing = await readOrders();
    const entry: StoredOrder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      ...order,
    };
    const next = [entry, ...existing].slice(0, MAX_ORDERS);
    await storageSet(ORDERS_KEY, JSON.stringify(next));
  } catch {
    // история не критична — оформление заказа уже прошло
  }
}
