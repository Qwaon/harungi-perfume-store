'use client';

import { motion } from 'framer-motion';

const trust = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3L4 7v5c0 4.418 3.371 8.132 8 9 4.629-.868 8-4.582 8-9V7L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Только оригиналы',
    desc: 'Работаем исключительно с оригинальной парфюмерией от официальных дистрибьюторов. Никаких реплик.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M9 3v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="15" r="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Честные распивы',
    desc: 'Разливаем из запечатанных оригинальных флаконов в стерильные атомайзеры.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Доставка по России',
    desc: 'Работаем в Ставрополе. Отправляем по всей стране в надёжной упаковке.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Живая поддержка',
    desc: 'Отвечаем в Telegram быстро. Поможем с выбором, расскажем про стойкость.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Выберите аромат',
    desc: 'Найдите понравившийся парфюм в каталоге. Выберите объём — от 2 мл.',
  },
  {
    num: '02',
    title: 'Оставьте заявку',
    desc: 'Нажмите «Оформить заявку», укажите имя и контакт. Никакой предоплаты.',
  },
  {
    num: '03',
    title: 'Получите заказ',
    desc: 'Мы свяжемся, уточним детали и отправим. Оплата при получении или по договорённости.',
  },
];

export default function TrustSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-36">
      {/* Trust blocks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="label text-gold-500 mb-3">Почему мы</p>
        <h2 className="section-title mb-14">Наши гарантии</h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24 md:mb-36">
        {trust.map((item, i) => (
          <motion.div
            key={item.title}
            className="p-6 bg-cream-50 rounded-2xl transition-all duration-200"
            style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <div className="mb-5 text-ink-500">
              {item.icon}
            </div>
            <h3 className="font-display text-lg font-medium text-ink-900 mb-2">{item.title}</h3>
            <p className="text-sm text-ink-500 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* How to order */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="label text-gold-500 mb-3">Процесс</p>
        <h2 className="section-title mb-14">Как заказать</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <p className="font-display text-6xl font-light text-cream-300 mb-4">{step.num}</p>
            <h3 className="font-display text-xl font-medium text-ink-900 mb-2">{step.title}</h3>
            <p className="text-sm text-ink-500 leading-relaxed">{step.desc}</p>
            {i < steps.length - 1 && (
              <div className="hidden md:flex absolute top-6 -right-7 items-center justify-center text-cream-300/40">
                <svg width="28" height="16" viewBox="0 0 28 16" fill="none" aria-hidden="true">
                  <path d="M0 8h22" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2"/>
                  <path d="M20 4l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
