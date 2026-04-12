import { notFound } from 'next/navigation';
import { perfumes } from '@/data/perfumes';
import ProductPageClient from '@/components/ProductPageClient';

export async function generateStaticParams() {
  return perfumes.map((p) => ({ id: p.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const perfume = perfumes.find((p) => p.id === id);
  if (!perfume) return {};
  const minPrice = Math.min(...Object.values(perfume.prices));
  return {
    title: `${perfume.name} — ${perfume.brand}`,
    description: `${perfume.description} От ${minPrice.toLocaleString('ru-RU')} ₽.`,
    openGraph: {
      title: `${perfume.name} — ${perfume.brand} | HARUNGI`,
      description: `${perfume.brand} ${perfume.name}. ${perfume.format === 'распив' ? 'Распивы' : 'Оригинал'} от ${minPrice.toLocaleString('ru-RU')} ₽.`,
      images: perfume.images[0] ? [{ url: perfume.images[0], width: 800, height: 800, alt: perfume.name }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const perfume = perfumes.find((p) => p.id === id);
  if (!perfume) notFound();

  const related = perfumes
    .filter((p) => p.id !== perfume.id && (p.brand === perfume.brand || p.gender === perfume.gender))
    .slice(0, 3);

  return <ProductPageClient perfume={perfume} related={related} />;
}
