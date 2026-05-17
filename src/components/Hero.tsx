'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Hero() {
  return (
    <section
      className="relative min-h-dvh flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1c1a17 60%, #0A0A0A 100%)' }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-24 w-full">
        <motion.h1
          className="font-display text-[3rem] sm:text-6xl md:text-7xl xl:text-[7rem] font-light leading-[1.02] text-white mb-10 max-w-3xl text-balance"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
        >
          Нишевая<br />
          <span className="italic text-cream-300">парфюмерия</span>
        </motion.h1>

        <motion.div
          className="mb-20"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
        >
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 bg-cream-50 text-ink-900 px-8 py-3.5 text-sm tracking-widest uppercase font-medium rounded-full transition-all duration-200 hover:bg-white hover:-translate-y-px cursor-pointer"
            style={{ boxShadow: '0px 0px 0px 1px rgba(209,207,197,0.3)' }}
          >
            Смотреть каталог
          </Link>
        </motion.div>

        <motion.div
          className="flex gap-8 sm:gap-12 border-t border-white/10 pt-8"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
        >
          {[
            { value: '200+', label: 'Ароматов' },
            { value: '20+', label: 'Брендов' },
            { value: 'от 5 мл', label: 'Распивы' },
            { value: '100%', label: 'Оригинал' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-3xl sm:text-4xl font-light text-white tabular-nums">{stat.value}</p>
              <p className="label text-cream-300/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        >
          <svg width="20" height="11" viewBox="0 0 20 11" fill="none" aria-hidden="true">
            <path d="M1 1l9 9 9-9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
