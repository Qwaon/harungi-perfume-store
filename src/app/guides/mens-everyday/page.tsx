import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { perfumes } from '@/data/perfumes';

export const metadata = {
  title: 'Мужские ароматы на каждый день',
  description: 'Подборка мужских ароматов для офиса, повседневного ношения и спокойного уверенного шлейфа.',
  openGraph: {
    title: 'Мужские ароматы на каждый день — HARUNGI',
    description: 'Какие мужские ароматы удобно носить каждый день: офис, город, поездки.',
  },
};

export default function MensEverydayPage() {
  const picks = perfumes
    .filter((item) => item.gender !== 'женский' && item.occasion.includes('офис'))
    .slice(0, 6);

  return (
    <div className="min-h-screen pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14">
          <p className="label text-gold-500 mb-3">Подборка</p>
          <h1 className="section-title mb-6">Мужские ароматы на каждый день</h1>
          <p className="text-base text-ink-500 leading-relaxed">
            Повседневный мужской аромат не должен утомлять. Лучше работают собранные, чистые композиции,
            которые держат характер, но не кричат на расстоянии.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="rounded-2xl bg-cream-50 p-7" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <h2 className="font-display text-2xl font-light text-ink-900 mb-3">Хороший daily scent</h2>
            <p className="text-sm text-ink-500 leading-relaxed">Обычно это свежие, древесные и фужерные ароматы со средней насыщенностью и чистым стартом.</p>
          </div>
          <div className="rounded-2xl bg-cream-50 p-7" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <h2 className="font-display text-2xl font-light text-ink-900 mb-3">Безопасный путь</h2>
            <p className="text-sm text-ink-500 leading-relaxed">Сначала попробуйте 2 или 5 мл, особенно если аромат нужен на работу или в частую ротацию.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-20">
          {picks.map((perfume, index) => (
            <ProductCard key={perfume.id} perfume={perfume} index={index} />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/catalog" className="btn-primary">Смотреть каталог</Link>
          <Link href="/guides/summer-fragrances" className="btn-outline">Ещё одна подборка</Link>
        </div>
      </div>
    </div>
  );
}
