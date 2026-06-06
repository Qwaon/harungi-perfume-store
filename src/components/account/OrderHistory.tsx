// src/components/account/OrderHistory.tsx
'use client';

import { useEffect, useState } from 'react';
import { readOrders, StoredOrder } from '@/lib/orderHistory';
import { perfumes } from '@/data/perfumes';
import { VOLUME_LABELS } from '@/lib/constants';
import { pluralizeRu, POSITION_FORMS } from '@/lib/plural';

function nameFor(perfumeId: string): { name: string; brand: string } {
  const p = perfumes.find((x) => x.id === perfumeId);
  return p ? { name: p.name, brand: p.brand } : { name: 'Аромат', brand: '' };
}

export default function OrderHistory() {
  const [orders, setOrders] = useState<StoredOrder[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    readOrders().then(setOrders);
  }, []);

  if (orders === null) {
    return (
      <div className="flex flex-col gap-2 mb-10">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-cream-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mb-10">
        <p className="label text-ink-500 mb-3">История заказов</p>
        <div
          className="rounded-xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-300"
          style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
        >
          Здесь появятся ваши заказы
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <p className="label text-ink-500 mb-3">История заказов</p>
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const open = openId === o.id;
          const count = o.items.reduce((s, it) => s + it[2], 0);
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
                    {new Date(o.ts).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-ink-300">
                    {count} {pluralizeRu(count, POSITION_FORMS)}
                  </p>
                </div>
                <p className="font-display text-lg font-light text-ink-900 tabular-nums">
                  {o.total.toLocaleString('ru-RU')} ₽
                </p>
              </button>
              {open && (
                <div className="px-4 pb-3 flex flex-col gap-1 border-t border-cream-200 pt-2">
                  {o.items.map((it, idx) => {
                    const { name, brand } = nameFor(it[0]);
                    return (
                      <div key={idx} className="flex justify-between text-xs text-ink-500">
                        <span>
                          {brand ? `${brand} — ` : ''}
                          {name} · {VOLUME_LABELS[it[1]] ?? it[1]}
                          {it[2] > 1 ? ` ×${it[2]}` : ''}
                        </span>
                        <span className="tabular-nums">
                          {(it[2] * it[3]).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
