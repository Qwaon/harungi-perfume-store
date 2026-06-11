import Link from 'next/link';
import { countOrdersByStatus, selectPerfumes, selectAllOrderItems } from '@/lib/admin/supabase-server';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новые', accepted: 'Принят', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён',
};

const STATUS_ICONS: Record<string, string> = {
  total: '📋', new: '🆕', accepted: '✅', shipped: '📦', done: '✔️', canceled: '✖️',
};

const PRICE_FIELDS = ['price_5ml', 'price_10ml', 'price_15ml', 'price_20ml', 'price_original'] as const;

interface Perfume {
  id: string; brand: string; name: string; images: string | null; inStock: boolean;
  price_5ml: number | null; price_10ml: number | null; price_15ml: number | null;
  price_20ml: number | null; price_original: number | null;
}

interface OrderItem {
  perfume_id: string | null; perfume_name: string; brand: string; quantity: number;
}

function hasNoPrice(p: Perfume): boolean {
  return PRICE_FIELDS.every((k) => p[k] == null || p[k] === 0);
}

function topBy(items: OrderItem[], key: 'perfume' | 'brand'): { label: string; qty: number }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = key === 'perfume' ? (item.perfume_name || item.perfume_id || '—') : item.brand;
    if (!label) continue;
    totals.set(label, (totals.get(label) ?? 0) + (item.quantity || 0));
  }
  return [...totals.entries()]
    .map(([label, qty]) => ({ label, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

export default async function AdminDashboard() {
  let counts: Record<string, number> = {};
  let perfumes: Perfume[] = [];
  let orderItems: OrderItem[] = [];
  try {
    counts = await countOrdersByStatus();
    perfumes = (await selectPerfumes()) as unknown as Perfume[];
    orderItems = (await selectAllOrderItems()) as unknown as OrderItem[];
  } catch { /* нет env/сети — покажем нули */ }

  const noPhoto = perfumes.filter((p) => !p.images);
  const noPrice = perfumes.filter(hasNoPrice);
  const outOfStock = perfumes.filter((p) => !p.inStock);

  const topProducts = topBy(orderItems, 'perfume');
  const topBrands = topBy(orderItems, 'brand');

  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Дашборд</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">{STATUS_ICONS.total} Всего заказов</p>
          <p className="font-display text-3xl font-light text-gold-500">{counts.total ?? 0}</p>
        </div>
        {['new', 'accepted', 'shipped', 'done', 'canceled'].map((s) => (
          <div key={s} className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">{STATUS_ICONS[s]} {STATUS_LABELS[s]}</p>
            <p className="font-display text-3xl font-light text-ink-900">{counts[s] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">🧴 Товаров</p>
          <p className="font-display text-3xl font-light text-ink-900">{perfumes.length}</p>
        </div>
      </div>

      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Требует внимания</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {noPhoto.length > 0 && (
          <Link href="/admin/catalog?alert=no-photo" className="rounded-xl bg-cream-50 p-4 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">📷 Без фото</p>
            <p className="font-display text-2xl font-light text-gold-500">{noPhoto.length}</p>
          </Link>
        )}
        {noPrice.length > 0 && (
          <Link href="/admin/catalog?alert=no-price" className="rounded-xl bg-cream-50 p-4 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">💰 Без цен</p>
            <p className="font-display text-2xl font-light text-gold-500">{noPrice.length}</p>
          </Link>
        )}
        {outOfStock.length > 0 && (
          <Link href="/admin/catalog?alert=out-of-stock" className="rounded-xl bg-cream-50 p-4 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">🚫 Нет в наличии</p>
            <p className="font-display text-2xl font-light text-gold-500">{outOfStock.length}</p>
          </Link>
        )}
        {noPhoto.length === 0 && noPrice.length === 0 && outOfStock.length === 0 && (
          <p className="text-sm text-ink-300 col-span-full">Проблем не найдено 🎉</p>
        )}
      </div>

      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Топ продаж</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2">Топ товаров</p>
          {topProducts.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topProducts.map((t, i) => (
                <li key={t.label} className="flex justify-between gap-2">
                  <span className="truncate">{i + 1}. {t.label}</span>
                  <span className="text-ink-300 shrink-0">{t.qty} шт</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2">Топ брендов</p>
          {topBrands.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topBrands.map((t, i) => (
                <li key={t.label} className="flex justify-between gap-2">
                  <span className="truncate">{i + 1}. {t.label}</span>
                  <span className="text-ink-300 shrink-0">{t.qty} шт</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/orders" className="btn-outline text-sm">К заказам</Link>
        <Link href="/admin/catalog" className="btn-outline text-sm">К каталогу</Link>
      </div>
    </div>
  );
}
