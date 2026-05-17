import Hero from '@/components/Hero';
import FeaturedPerfumes from '@/components/FeaturedPerfumes';
import TrustStrip from '@/components/TrustStrip';
import { perfumes } from '@/data/perfumes';

export default function HomePage() {
  const featured = perfumes.filter((p) => p.featured && p.inStock).slice(0, 4);

  return (
    <>
      <Hero />
      <FeaturedPerfumes perfumes={featured} />
      <TrustStrip />
    </>
  );
}
