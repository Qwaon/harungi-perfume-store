import CatalogClient from '@/components/CatalogClient';
import { perfumes } from '@/data/perfumes';

interface Props {
  searchParams: { format?: string };
}

export const metadata = {
  title: 'Каталог — HARUNGI',
  description: 'Вся коллекция нишевой и селективной парфюмерии. Оригиналы и распивы.',
};

export default function CatalogPage({ searchParams }: Props) {
  const initialFormat = searchParams.format ?? '';

  return (
    <div className="min-h-screen pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Page header */}
        <div className="mb-12 md:mb-16">
          <p className="label text-gold-500 mb-3">
            {initialFormat === 'распив' ? 'Распивы от 2 мл' : 'Вся коллекция'}
          </p>
          <h1 className="section-title">
            {initialFormat === 'распив' ? 'Распивы' : 'Каталог'}
          </h1>
          {initialFormat === 'распив' && (
            <p className="text-ink-500 text-base mt-4 max-w-lg leading-relaxed">
              Разливаем из оригинальных флаконов. Идеально для знакомства с ароматом перед покупкой полной версии.
            </p>
          )}
        </div>

        <CatalogClient perfumes={perfumes} initialFormat={initialFormat} />
      </div>
    </div>
  );
}
