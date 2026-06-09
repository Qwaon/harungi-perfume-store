// src/lib/orderHistory.ts
'use client';

export interface OrderItem {
  perfume_id: string | null;
  perfume_name: string;
  brand: string;
  volume: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  order_number: number;
  status: string;
  total: number;
  type: string;
  created_at: string;
  order_items: OrderItem[];
}

const WEBHOOK_URL = process.env.NEXT_PUBLIC_ORDER_WEBHOOK_URL;

/**
 * История заказов из Supabase через Worker. initData — подписанная строка
 * Telegram (window.Telegram.WebApp.initData), Worker проверит подпись.
 * Никогда не бросает: при сбое возвращает [].
 */
export async function readOrders(initData: string): Promise<Order[]> {
  if (!WEBHOOK_URL || !initData) return [];
  try {
    const res = await fetch(`${WEBHOOK_URL}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.orders) ? data.orders : [];
  } catch {
    return [];
  }
}
