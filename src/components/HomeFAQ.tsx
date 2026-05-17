'use client';

import Link from 'next/link';
import FAQItem from './FAQItem';

const FAQS = [
  {
    q: 'Это точно оригинальная парфюмерия?',
    a: 'Да, работаем только с оригиналами. Никаких реплик или «аналогов». Каждый флакон закупается у проверенных поставщиков — по запросу можем показать чеки.',
  },
  {
    q: 'Что такое распив?',
    a: 'Распив — отливант из оригинального флакона в чистый атомайзер. Можно попробовать дорогой аромат без покупки полного флакона: от 5 мл.',
  },
  {
    q: 'Как оформить заказ?',
    a: 'Выберите аромат в каталоге, нажмите «В корзину», укажите имя и контакт. Мы свяжемся для подтверждения через Telegram. Никакой предоплаты на первый заказ.',
  },
  {
    q: 'Как происходит доставка?',
    a: 'В Ставрополе — самовывоз или личная доставка. По России — Почта России или СДЭК. Флакон надёжно упакован.',
  },
];

export default function HomeFAQ() {
  return (
    <section className="bg-cream-100 border-t border-cream-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="section-title">Частые вопросы</h2>
          <Link href="/faq" className="text-sm text-gold-500 hover:text-ink-900 transition-colors duration-200">
            Все вопросы →
          </Link>
        </div>
        <div className="mb-0">
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
