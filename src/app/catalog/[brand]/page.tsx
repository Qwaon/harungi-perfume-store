import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CatalogClient from '@/components/CatalogClient';
import { getBrandEntries, getPerfumesByBrandSlug, getBrands } from '@/data/catalog';

export const revalidate = 60;
export const dynamicParams = true;

interface Props {
  params: { brand: string };
}

export async function generateStaticParams() {
  return (await getBrandEntries()).map((entry) => ({ brand: entry.slug }));
}

export async function generateMetadata({ params }: Props) {
  const entry = (await getBrandEntries()).find((item) => item.slug === params.brand);
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

export default async function BrandCatalogPage({ params }: Props) {
  const entries = await getBrandEntries();
  const entry = entries.find((item) => item.slug === params.brand);
  if (!entry) notFound();

  const brandPerfumes = await getPerfumesByBrandSlug(params.brand);
  if (brandPerfumes.length === 0) notFound();

  const brands = await getBrands();

  return (
    <div className="min-h-dvh pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-12 md:mb-16">
          <p className="label text-gold-500 mb-3">Брендовая подборка</p>
          <h1 className="section-title mb-4">{entry.name}</h1>
          <p className="text-sm md:text-base text-ink-500 max-w-2xl leading-relaxed">
            Отобранные ароматы {entry.name}: распивы для знакомства и оригиналы для тех, кто уже нашёл свой флакон.
          </p>
        </div>

        <Suspense>
          <CatalogClient perfumes={brandPerfumes} brands={brands} />
        </Suspense>
      </div>
    </div>
  );
}
