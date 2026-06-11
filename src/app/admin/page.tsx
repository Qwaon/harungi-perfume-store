import Link from 'next/link';
import { countOrdersByStatus, selectPerfumes } from '@/lib/admin/supabase-server';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новые', accepted: 'Принят', shipped: 'Отправлен', done: 'Выполнен', canceled: 'Отменён',
};

export default async function AdminDashboard() {
  let counts: Record<string, number> = {};
  let perfumeCount = 0;
  try {
    counts = await countOrdersByStatus();
    perfumeCount = (await selectPerfumes()).length;
  } catch { /* нет env/сети — покажем нули */ }

  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Дашборд</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">Всего заказов</p>
          <p className="font-display text-3xl font-light text-ink-900">{counts.total ?? 0}</p>
        </div>
        {['new', 'accepted', 'shipped', 'done', 'canceled'].map((s) => (
          <div key={s} className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <p className="label text-ink-300">{STATUS_LABELS[s]}</p>
            <p className="font-display text-3xl font-light text-ink-900">{counts[s] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-xl bg-cream-50 p-4" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
          <p className="label text-ink-300">Товаров</p>
          <p className="font-display text-3xl font-light text-ink-900">{perfumeCount}</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Link href="/admin/orders" className="btn-outline text-sm">К заказам</Link>
        <Link href="/admin/catalog" className="btn-outline text-sm">К каталогу</Link>
      </div>
    </div>
  );
}
