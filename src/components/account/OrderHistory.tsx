// src/components/account/OrderHistory.tsx
'use client';

import { useEffect, useState } from 'react';
import { readOrders, Order } from '@/lib/orderHistory';
import { pluralizeRu, POSITION_FORMS } from '@/lib/plural';
import { whenStorageReady } from '@/lib/storage';
import CollapsibleSection from '@/components/account/CollapsibleSection';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  accepted: 'Принят',
  shipped: 'Отправлен',
  done: 'Выполнен',
  canceled: 'Отменён',
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Ждём готовности SDK: initData появляется только после загрузки
      // telegram-web-app.js. Раннее чтение даёт пустую строку → пустой список.
      await whenStorageReady();
      if (!alive) return;
      const initData =
        typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData ?? '' : '';
      const result = await readOrders(initData);
      if (alive) setOrders(result);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (orders === null) {
    return (
      <CollapsibleSection title="История заказов" defaultOpen>
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-cream-200 animate-pulse" />
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  if (orders.length === 0) {
    return (
      <CollapsibleSection title="История заказов" count={0}>
        <div
          className="rounded-xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-300"
          style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
        >
          Здесь появятся ваши заказы
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="История заказов" count={orders.length}>
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const open = openId === o.id;
          const count = o.order_items.reduce((s, it) => s + it.quantity, 0);
          return (
            <div
              key={o.id}
              className="rounded-xl bg-cream-100"
              style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
            >
              <button
                onClick={() => setOpenId(open ? null : o.id)}
                className="w-full flex justify-between items-center px-4 py-3 text-left"
                aria-expanded={open}
              >
                <div>
                  <p className="text-sm text-ink-900">
                    №{o.order_number} ·{' '}
                    {new Date(o.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-ink-300">
                    {STATUS_LABELS[o.status] ?? o.status} · {count}{' '}
                    {pluralizeRu(count, POSITION_FORMS)}
                  </p>
                </div>
                <p className="font-display text-lg font-light text-ink-900 tabular-nums">
                  {o.total.toLocaleString('ru-RU')} ₽
                </p>
              </button>
              {open && (
                <div className="px-4 pb-3 flex flex-col gap-1 border-t border-cream-200 pt-2">
                  {o.order_items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-ink-500">
                      <span>
                        {it.brand ? `${it.brand} — ` : ''}
                        {it.perfume_name} · {it.volume}
                        {it.quantity > 1 ? ` ×${it.quantity}` : ''}
                      </span>
                      <span className="tabular-nums">
                        {(it.quantity * it.price).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
