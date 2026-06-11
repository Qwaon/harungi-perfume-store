'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface P { id: string; brand: string; name: string; images: string | null; inStock: boolean }

export default function CatalogListClient() {
  const router = useRouter();
  const [items, setItems] = useState<P[] | null>(null);
  const [q, setQ] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/catalog');
    const d = await res.json().catch(() => ({ perfumes: [] }));
    setItems(Array.isArray(d.perfumes) ? d.perfumes : []);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm(`Удалить «${id}»? Необратимо.`)) return;
    await fetch(`/api/admin/catalog/${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = (items ?? []).filter((p) =>
    `${p.brand} ${p.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-light text-ink-900">Каталог</h1>
        <Link href="/admin/catalog/new" className="btn-primary text-sm">➕ Добавить</Link>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по бренду/названию" className="input-base mb-4" />
      {items === null ? <p className="text-ink-300 text-sm">Загрузка…</p> : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-cream-50 px-3 py-2" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
              {p.images
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.images.split(',')[0].trim()} alt="" className="w-12 h-12 object-cover rounded-lg" />
                : <div className="w-12 h-12 rounded-lg bg-cream-200" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-900 truncate">{p.brand} — {p.name}</p>
                <p className="text-xs text-ink-300">{p.inStock ? 'в наличии' : 'нет в наличии'}</p>
              </div>
              <button onClick={() => router.push(`/admin/catalog/${p.id}`)} className="text-xs text-ink-500 hover:text-ink-900">Править</button>
              <button onClick={() => remove(p.id)} className="text-xs text-ink-500 hover:text-ink-900">Удалить</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
