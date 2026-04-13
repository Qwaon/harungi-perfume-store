'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TELEGRAM_URL } from '@/lib/constants';

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

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-24 w-full">
        <motion.p
          className="label text-cream-300/40 mb-6 tracking-[0.32em]"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
        >
          Нишевая · Оригиналы · Распивы
        </motion.p>

        <motion.h1
          className="font-display text-[3rem] sm:text-6xl md:text-7xl xl:text-[7rem] font-light leading-[1.02] text-white mb-7 max-w-3xl text-balance"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
        >
          Не соглашайтесь<br />
          на <span className="italic text-cream-300">меньшее</span>
        </motion.h1>

        <motion.p
          className="text-base md:text-lg text-cream-300/65 leading-relaxed max-w-lg mb-10 text-pretty"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={2}
        >
          Оригинальная нишевая парфюмерия. Распивы от 2 мл — пробуйте прежде, чем вкладывать в полный флакон.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 mb-20"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={3}
        >
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 bg-cream-50 text-ink-900 px-8 py-3.5 text-sm tracking-widest uppercase font-medium rounded-full transition-all duration-200 hover:bg-white hover:-translate-y-px cursor-pointer"
            style={{ boxShadow: '0px 0px 0px 1px rgba(209,207,197,0.3)' }}
          >
            Смотреть каталог
          </Link>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 text-white text-sm tracking-widest uppercase font-medium px-8 py-3.5 rounded-full transition-all duration-200 hover:opacity-90 hover:-translate-y-px cursor-pointer"
            style={{ backgroundColor: '#2AABEE', boxShadow: '0px 0px 0px 1px rgba(42,171,238,0.3)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
            </svg>
            Написать в Telegram
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="flex gap-8 sm:gap-12 border-t border-white/10 pt-8"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={4}
        >
          {[
            { value: '50+', label: 'Ароматов' },
            { value: '20+', label: 'Брендов' },
            { value: 'от 2 мл', label: 'Распивы' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-3xl sm:text-4xl font-light text-white tabular-nums">{stat.value}</p>
              <p className="label text-cream-300/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator — animated chevron */}
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
