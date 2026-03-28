import { Suspense } from 'react';
import CatalogClient from '@/components/CatalogClient';
import { perfumes } from '@/data/perfumes';

export const metadata = {
  title: 'Каталог — HARUNGI',
  description: 'Вся коллекция нишевой и селективной парфюмерии. Оригиналы и распивы.',
};

export default function CatalogPage() {
  return (
    <div className="min-h-screen pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12 md:mb-16">
          <p className="label text-gold-500 mb-3">Вся коллекция</p>
          <h1 className="section-title">Каталог</h1>
        </div>

        <Suspense>
          <CatalogClient perfumes={perfumes} />
        </Suspense>
      </div>
    </div>
  );
}
