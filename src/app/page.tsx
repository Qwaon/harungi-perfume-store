import Hero from '@/components/Hero';
import FeaturedPerfumes from '@/components/FeaturedPerfumes';
import DecantsBanner from '@/components/DecantsBanner';
import TrustSection from '@/components/TrustSection';
import SocialProofSection from '@/components/SocialProofSection';
import GuaranteesSection from '@/components/GuaranteesSection';
import FinalCTA from '@/components/FinalCTA';
import { perfumes } from '@/data/perfumes';

export default function HomePage() {
  const featured = perfumes.filter((p) => p.featured).slice(0, 3);

  return (
    <>
      <Hero />
      <FeaturedPerfumes perfumes={featured} />
      <DecantsBanner />
      <TrustSection />
      <SocialProofSection />
      <GuaranteesSection />
      <FinalCTA />
    </>
  );
}
