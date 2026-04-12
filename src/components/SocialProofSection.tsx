'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const reviews = [
  {
    author: 'Илья, Ставрополь',
    text: 'Взял 5 мл Aventus на пробу. Упаковка аккуратная, ответили быстро, аромат точно оригинальный.',
  },
  {
    author: 'Мария, Краснодар',
    text: 'Очень удобно, что можно начать с маленького объёма. Подобрали аромат без навязчивости и отправили на следующий день.',
  },
  {
    author: 'Арсен, Москва',
    text: 'Заказывал Tobacco Vanille и Dior Homme Intense. Всё приехало подписанным, без путаницы, стойкость как у оригинала.',
  },
];

export default function SocialProofSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14"
      >
        <div>
          <p className="label text-gold-500 mb-3">Отзывы</p>
          <h2 className="section-title">Что говорят после заказа</h2>
        </div>
        <Link href="/how-it-works" className="btn-outline py-3 px-7 text-xs w-fit">
          Как мы работаем
        </Link>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((review, index) => (
          <motion.blockquote
            key={review.author}
            className="rounded-2xl bg-cream-50 p-7 flex flex-col"
            style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
          >
            <div className="w-8 h-px bg-ink-300 mb-5" />
            <p className="text-sm text-ink-500 leading-relaxed mb-6 flex-1">{review.text}</p>
            <footer>
              <span className="text-sm font-medium text-ink-900">
                {review.author.split(', ')[0]}
              </span>
              {review.author.includes(', ') && (
                <span className="text-sm text-ink-300">{', '}{review.author.split(', ')[1]}</span>
              )}
            </footer>
          </motion.blockquote>
        ))}
      </div>
    </section>
  );
}
