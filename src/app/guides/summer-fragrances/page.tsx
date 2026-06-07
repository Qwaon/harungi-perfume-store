import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { getPerfumes } from '@/data/catalog';

export const revalidate = 60;

export const metadata = {
  title: 'Лучшие ароматы на лето',
  description: 'Свежие и лёгкие ароматы на лето: что попробовать в жару и для повседневного ношения.',
  openGraph: {
    title: 'Лучшие ароматы на лето — HARUNGI',
    description: 'Подборка свежих ароматов на лето и каждый день.',
  },
};

export default async function SummerFragrancesPage() {
  const perfumes = await getPerfumes();
  const picks = perfumes.filter((item) => item.season.includes('лето') || item.scentType === 'свежий').slice(0, 6);

  return (
    <div className="min-h-dvh pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mb-14">
          <p className="label text-gold-500 mb-3">Гид</p>
          <h1 className="section-title mb-6">Лучшие ароматы на лето</h1>
          <p className="text-base text-ink-500 leading-relaxed">
            Летом особенно хорошо работают свежие, прозрачные и не слишком тяжёлые композиции. Ниже —
            ароматы, которые удобно носить днём, в дороге и в жаркую погоду.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="rounded-2xl bg-cream-50 p-6" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <h2 className="font-display text-2xl font-light text-ink-900 mb-3">Что искать летом</h2>
            <p className="text-sm text-ink-500 leading-relaxed">Цитрусы, чистые древесные аккорды, зелёные ноты и мягкие мускусы.</p>
          </div>
          <div className="rounded-2xl bg-cream-50 p-6" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <h2 className="font-display text-2xl font-light text-ink-900 mb-3">С чего начать</h2>
            <p className="text-sm text-ink-500 leading-relaxed">Оптимальный формат для знакомства — 2 или 5 мл, чтобы поносить аромат в разную погоду.</p>
          </div>
          <div className="rounded-2xl bg-cream-50 p-6" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
            <h2 className="font-display text-2xl font-light text-ink-900 mb-3">Когда не стоит спешить</h2>
            <p className="text-sm text-ink-500 leading-relaxed">Очень густые гурманские и тяжёлые восточные ароматы летом часто раскрываются агрессивнее, чем хочется.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-20">
          {picks.map((perfume, index) => (
            <ProductCard key={perfume.id} perfume={perfume} index={index} />
          ))}
        </div>

        <Link href="/catalog" className="btn-outline">Открыть весь каталог</Link>
      </div>
    </div>
  );
}
