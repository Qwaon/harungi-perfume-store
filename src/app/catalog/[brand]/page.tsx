import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CatalogClient from '@/components/CatalogClient';
import { brandEntries, getPerfumesByBrandSlug } from '@/data/perfumes';

interface Props {
  params: { brand: string };
}

export function generateStaticParams() {
  return brandEntries.map((entry) => ({ brand: entry.slug }));
}

export function generateMetadata({ params }: Props) {
  const entry = brandEntries.find((item) => item.slug === params.brand);
  if (!entry) return {};

  return {
    title: `${entry.name}`,
    description: `Каталог ${entry.name} в HARUNGI: оригиналы и распивы от 2 мл.`,
    openGraph: {
      title: `${entry.name} — HARUNGI`,
      description: `Ароматы ${entry.name}: распивы и оригиналы в наличии.`,
    },
  };
}

export default function BrandCatalogPage({ params }: Props) {
  const entry = brandEntries.find((item) => item.slug === params.brand);
  if (!entry) notFound();

  const brandPerfumes = getPerfumesByBrandSlug(params.brand);
  if (brandPerfumes.length === 0) notFound();

  return (
    <div className="min-h-screen pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12 md:mb-16">
          <p className="label text-gold-500 mb-3">Брендовая подборка</p>
          <h1 className="section-title mb-4">{entry.name}</h1>
          <p className="text-sm md:text-base text-ink-500 max-w-2xl leading-relaxed">
            Отобранные ароматы {entry.name}: распивы для знакомства и оригиналы для тех, кто уже нашёл свой флакон.
          </p>
        </div>

        <Suspense>
          <CatalogClient perfumes={brandPerfumes} />
        </Suspense>
      </div>
    </div>
  );
}
