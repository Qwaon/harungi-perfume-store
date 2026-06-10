// src/components/account/FavoritesGrid.tsx
'use client';

import { useFavorites } from '@/contexts/FavoritesContext';
import type { Perfume } from '@/types';
import ProductCard from '@/components/ProductCard';

export default function FavoritesGrid({ perfumes }: { perfumes: Perfume[] }) {
  const { favorites, hydrated } = useFavorites();

  if (!hydrated) {
    return (
      <div className="mb-10">
        <p className="label text-ink-500 mb-3">Избранное</p>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-cream-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const items = perfumes.filter((p) => favorites.includes(p.id));

  return (
    <div className="mb-10">
      <p className="label text-ink-500 mb-3">Избранное</p>
      {items.length === 0 ? (
        <div
          className="rounded-xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-300"
          style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
        >
          Сохраняйте ароматы, нажимая ♥
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((p, i) => (
            <ProductCard key={p.id} perfume={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
