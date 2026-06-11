import Link from 'next/link';
import type { ComponentType } from 'react';
import { countOrdersByStatus, selectPerfumes, selectAllOrderItems } from '@/lib/admin/supabase-server';
import {
  ClipboardDocumentListIcon, SparklesIcon, CheckCircleIcon, TruckIcon,
  CheckBadgeIcon, XCircleIcon, Squares2X2Icon, PhotoIcon, BanknotesIcon,
  NoSymbolIcon, TrophyIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новые', accepted: 'Принят', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён',
};

const STATUS_ICON_COMPONENTS: Record<string, ComponentType<{ className?: string }>> = {
  total: ClipboardDocumentListIcon,
  new: SparklesIcon,
  accepted: CheckCircleIcon,
  shipped: TruckIcon,
  done: CheckBadgeIcon,
  canceled: XCircleIcon,
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
        <div className="rounded-xl bg-cream-50 p-4 flex flex-col gap-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <span className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
            <ClipboardDocumentListIcon className="w-5 h-5 text-gold-500" />
          </span>
          <div>
            <p className="label text-ink-300">Всего заказов</p>
            <p className="font-display text-3xl font-light text-gold-500">{counts.total ?? 0}</p>
          </div>
        </div>
        {['new', 'accepted', 'shipped', 'done', 'canceled'].map((s) => {
          const Icon = STATUS_ICON_COMPONENTS[s];
          return (
            <div key={s} className="rounded-xl bg-cream-50 p-4 flex flex-col gap-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
              <span className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-gold-500" />
              </span>
              <div>
                <p className="label text-ink-300">{STATUS_LABELS[s]}</p>
                <p className="font-display text-3xl font-light text-ink-900">{counts[s] ?? 0}</p>
              </div>
            </div>
          );
        })}
        <div className="rounded-xl bg-cream-50 p-4 flex flex-col gap-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <span className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
            <Squares2X2Icon className="w-5 h-5 text-gold-500" />
          </span>
          <div>
            <p className="label text-ink-300">Товаров</p>
            <p className="font-display text-3xl font-light text-ink-900">{perfumes.length}</p>
          </div>
        </div>
      </div>

      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Требует внимания</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {noPhoto.length > 0 && (
          <Link href="/admin/catalog?alert=no-photo" className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <PhotoIcon className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <p className="label text-ink-300">Без фото</p>
              <p className="font-display text-2xl font-light text-ink-900">{noPhoto.length}</p>
            </div>
          </Link>
        )}
        {noPrice.length > 0 && (
          <Link href="/admin/catalog?alert=no-price" className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <BanknotesIcon className="w-5 h-5 text-amber-600" />
            </span>
            <div>
              <p className="label text-ink-300">Без цен</p>
              <p className="font-display text-2xl font-light text-ink-900">{noPrice.length}</p>
            </div>
          </Link>
        )}
        {outOfStock.length > 0 && (
          <Link href="/admin/catalog?alert=out-of-stock" className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 hover:bg-cream-200 transition-colors" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <NoSymbolIcon className="w-5 h-5 text-red-600" />
            </span>
            <div>
              <p className="label text-ink-300">Нет в наличии</p>
              <p className="font-display text-2xl font-light text-ink-900">{outOfStock.length}</p>
            </div>
          </Link>
        )}
        {noPhoto.length === 0 && noPrice.length === 0 && outOfStock.length === 0 && (
          <div className="rounded-xl bg-cream-50 p-4 flex items-center gap-3 col-span-full" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <span className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </span>
            <p className="text-sm text-ink-500">Проблем не найдено</p>
          </div>
        )}
      </div>

      <h2 className="font-display text-lg font-light text-ink-900 mb-3">Топ продаж</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2 flex items-center gap-1.5">
            <TrophyIcon className="w-4 h-4 text-gold-500" />
            Топ товаров
          </p>
          {topProducts.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topProducts.map((t, i) => (
                <li key={t.label} className="flex items-center gap-2">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    i === 0 ? 'bg-gold-500 text-cream-50' : i < 3 ? 'bg-gold-400/40 text-ink-900' : 'text-ink-300'
                  }`}>{i + 1}</span>
                  <span className="truncate flex-1">{t.label}</span>
                  <span className="text-ink-300 shrink-0">{t.qty} шт</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300 mb-2 flex items-center gap-1.5">
            <ChartBarIcon className="w-4 h-4 text-gold-500" />
            Топ брендов
          </p>
          {topBrands.length === 0 ? <p className="text-sm text-ink-300">Пока нет данных</p> : (
            <ol className="text-sm text-ink-900 flex flex-col gap-1">
              {topBrands.map((t, i) => (
                <li key={t.label} className="flex items-center gap-2">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    i === 0 ? 'bg-gold-500 text-cream-50' : i < 3 ? 'bg-gold-400/40 text-ink-900' : 'text-ink-300'
                  }`}>{i + 1}</span>
                  <span className="truncate flex-1">{t.label}</span>
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
