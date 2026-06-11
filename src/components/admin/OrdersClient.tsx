'use client';

import { useEffect, useState, useCallback } from 'react';

interface OrderItem { perfume_name: string; brand: string; volume: string; quantity: number; price: number }
interface Order {
  id: number; order_number: number; status: string; customer_name: string;
  contact: string; total: number; type: string; note: string | null;
  created_at: string; order_items: OrderItem[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый', accepted: 'Принят', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён',
};
const STATUS_TABS = ['', 'new', 'accepted', 'shipped', 'done', 'canceled'];
const TAB_LABEL: Record<string, string> = { '': 'Все', ...STATUS_LABELS };

/** Ссылка для контакта: @ник/ник → t.me, телефон → tel:, иначе null. */
function contactHref(raw: string): string | null {
  const t = (raw || '').trim();
  if (!t) return null;
  if (/^@?[a-zA-Z0-9_]{4,32}$/.test(t)) return `https://t.me/${t.replace(/^@/, '')}`;
  const digits = t.replace(/\D/g, '');
  if (/^\+?[0-9\s\-()]{7,20}$/.test(t) && digits.length >= 7) {
    return `tel:${t.startsWith('+') ? '+' : ''}${digits}`;
  }
  return null;
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json().catch(() => ({ orders: [] }));
    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: number, next: string) => {
    setOrders((prev) => prev?.map((o) => (o.id === id ? { ...o, status: next } : o)) ?? prev);
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
  };

  const saveNote = async (id: number, note: string) => {
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-4">Заказы</h1>

      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${status === s ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
            {TAB_LABEL[s]}
          </button>
        ))}
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск: имя, контакт или № заказа" className="input-base mb-5" />

      {orders === null ? (
        <p className="text-ink-300 text-sm">Загрузка…</p>
      ) : orders.length === 0 ? (
        <p className="text-ink-300 text-sm">Заказов нет.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => {
            const open = openId === o.id;
            return (
              <div key={o.id} className="rounded-xl bg-cream-50" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
                <button onClick={() => setOpenId(open ? null : o.id)}
                  className="w-full flex justify-between items-center px-4 py-3 text-left">
                  <div>
                    <p className="text-sm text-ink-900">№{o.order_number} · {o.customer_name}</p>
                    <p className="text-xs text-ink-300">
                      {new Date(o.created_at).toLocaleDateString('ru-RU')} · {o.contact} · {STATUS_LABELS[o.status] ?? o.status}
                    </p>
                  </div>
                  <p className="font-display text-lg font-light text-ink-900 tabular-nums">{o.total.toLocaleString('ru-RU')} ₽</p>
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t border-cream-200 pt-3 flex flex-col gap-3">
                    {o.order_items.map((it, i) => (
                      <div key={i} className="flex justify-between text-xs text-ink-500">
                        <span>{it.brand ? `${it.brand} — ` : ''}{it.perfume_name} · {it.volume}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
                        <span className="tabular-nums">{(it.quantity * it.price).toLocaleString('ru-RU')} ₽</span>
                      </div>
                    ))}
                    <div className="text-sm text-ink-700">
                      <span className="text-ink-300">Контакт: </span>
                      {contactHref(o.contact)
                        ? <a href={contactHref(o.contact) as string} target="_blank" rel="noopener noreferrer"
                            className="text-gold-500 underline hover:text-ink-900">{o.contact}</a>
                        : <span>{o.contact}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_TABS.filter(Boolean).map((s) => (
                        <button key={s} onClick={() => changeStatus(o.id, s)}
                          className={`text-xs px-2.5 py-1 rounded-full border ${o.status === s ? 'bg-gold-500 text-white border-gold-500' : 'border-cream-200 text-ink-500'}`}>
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <textarea defaultValue={o.note ?? ''} placeholder="Примечание менеджера"
                      onBlur={(e) => saveNote(o.id, e.target.value)}
                      className="input-base text-sm" rows={2} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
