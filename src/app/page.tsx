import Hero from '@/components/Hero';
import FeaturedPerfumes from '@/components/FeaturedPerfumes';
import HowToOrder from '@/components/HowToOrder';
import HomeFAQ from '@/components/HomeFAQ';
import TrustStrip from '@/components/TrustStrip';
import { getPerfumes } from '@/data/catalog';

export const revalidate = 60;

export default async function HomePage() {
  const perfumes = await getPerfumes();
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
