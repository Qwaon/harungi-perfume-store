import { notFound } from 'next/navigation';
import { perfumes } from '@/data/perfumes';
import ProductPageClient from '@/components/ProductPageClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export function generateMetadata({ params }: Props) {
  const perfume = perfumes.find((p) => p.id === params.id);
  if (!perfume) return {};
  return {
    title: `${perfume.name} — ${perfume.brand} | HARUNGI`,
    description: perfume.description,
  };
}

export default function ProductPage({ params }: Props) {
  const perfume = perfumes.find((p) => p.id === params.id);
  if (!perfume) notFound();

  const related = perfumes
    .filter((p) => p.id !== perfume.id && (p.brand === perfume.brand || p.gender === perfume.gender))
    .slice(0, 3);

  return <ProductPageClient perfume={perfume} related={related} />;
}
