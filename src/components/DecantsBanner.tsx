'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function DecantsBanner() {
  return (
    <section className="bg-ink-900 overflow-hidden relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        {/* Text */}
        <div>
          <motion.p
            className="label text-ink-300 mb-5"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Распивы
          </motion.p>
          <motion.h2
            className="font-display text-5xl md:text-6xl font-light text-white leading-tight mb-6"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Попробуйте<br />
            <span className="italic text-white/70">прежде,</span><br />
            чем купить
          </motion.h2>
          <motion.p
            className="text-ink-300 text-base leading-relaxed max-w-md mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Распивы — идеальный способ познакомиться с нишевым ароматом. Разливаем из оригинальных флаконов. Объём от 2 мл.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link
              href="/catalog?format=распив"
              className="inline-flex items-center gap-2.5 bg-white text-ink-900 px-8 py-3.5 text-sm tracking-widest uppercase font-medium rounded-lg transition-all duration-200 hover:bg-cream-100 hover:shadow-lg hover:-translate-y-px active:scale-[0.98]"
            >
              Смотреть распивы
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </motion.div>
        </div>

        {/* Volume cards */}
        <motion.div
          className="grid grid-cols-3 gap-4"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {[
            { volume: '2 мл', desc: 'Знакомство', price: 'от 300 ₽' },
            { volume: '5 мл', desc: 'На неделю', price: 'от 650 ₽' },
            { volume: '10 мл', desc: 'На месяц', price: 'от 1 200 ₽' },
          ].map((item) => (
            <div
              key={item.volume}
              className="border border-white/10 rounded-xl p-3 sm:p-5 text-center hover:border-white/30 hover:bg-white/5 transition-all duration-300"
            >
              <p className="font-display text-2xl sm:text-3xl font-light text-white mb-2">{item.volume}</p>
              <p className="label text-ink-300 mb-3">{item.desc}</p>
              <p className="text-xs text-white/50 font-medium">{item.price}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
