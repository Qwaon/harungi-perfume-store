import Hero from '@/components/Hero';
import FeaturedPerfumes from '@/components/FeaturedPerfumes';
import HowToOrder from '@/components/HowToOrder';
import HomeFAQ from '@/components/HomeFAQ';
import TrustStrip from '@/components/TrustStrip';
import { perfumes } from '@/data/perfumes';

export default function HomePage() {
  const featured = perfumes.filter((p) => p.featured && p.inStock).slice(0, 4);

  return (
    <>
      <Hero />
      <FeaturedPerfumes perfumes={featured} />
      <HowToOrder />
      <HomeFAQ />
      <TrustStrip />
    </>
  );
}
