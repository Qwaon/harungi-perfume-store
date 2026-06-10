import { notFound } from 'next/navigation';
import { getPerfumes } from '@/data/catalog';
import { getMinPrice } from '@/data/utils';
import ProductPageClient from '@/components/ProductPageClient';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const perfumes = await getPerfumes();
  return perfumes.map((p) => ({ id: p.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const perfumes = await getPerfumes();
  const perfume = perfumes.find((p) => p.id === id);
  if (!perfume) return {};
  const minPrice = getMinPrice(perfume);
  const priceSuffix = minPrice !== null ? ` От ${minPrice.toLocaleString('ru-RU')} ₽.` : '';
  const ogPriceSuffix = minPrice !== null ? ` от ${minPrice.toLocaleString('ru-RU')} ₽.` : '.';
  return {
    title: `${perfume.name} — ${perfume.brand}`,
    description: `${perfume.description}${priceSuffix}`,
    openGraph: {
      title: `${perfume.name} — ${perfume.brand} | HARUNGI`,
      description: `${perfume.brand} ${perfume.name}. ${perfume.format === 'распив' ? 'Распивы' : 'Оригинал'}${ogPriceSuffix}`,
      images: perfume.images[0] ? [{ url: perfume.images[0], width: 800, height: 800, alt: perfume.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const perfumes = await getPerfumes();
  const perfume = perfumes.find((p) => p.id === id);
  if (!perfume) notFound();

  const related = perfumes
    .filter((p) => p.id !== perfume.id && (p.brand === perfume.brand || p.gender === perfume.gender))
    .slice(0, 3);

  return <ProductPageClient perfume={perfume} related={related} />;
}
