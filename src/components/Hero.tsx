'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';

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
      {/* Фоновое видео: blur + scale (чтобы размытые края не открывали фон) */}
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ filter: 'blur(6px)', transform: 'scale(1.1)' }}
        autoPlay
        loop
        muted
        playsInline
        poster="/hero-poster.jpg"
        aria-hidden="true"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Затемнение для читаемости текста */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-24 w-full">
        <motion.h1
          className="font-display text-[3rem] sm:text-6xl md:text-7xl xl:text-[7rem] font-light leading-[1.05] text-white mb-10 max-w-3xl text-balance"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0}
        >
          Найди аромат,<br />
          <span className="italic text-cream-300">который запомнят</span>
        </motion.h1>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
        >
          <Link
            href="/catalog"
            onClick={() => trackEvent('cta_click', { label: 'hero_catalog' })}
            className="inline-flex items-center justify-center gap-2 bg-cream-50 text-ink-900 px-8 py-3.5 text-sm tracking-widest uppercase font-medium rounded-full transition-all duration-200 hover:bg-white hover:-translate-y-px cursor-pointer"
            style={{ boxShadow: '0px 0px 0px 1px rgba(209,207,197,0.3)' }}
          >
            Перейти в каталог
          </Link>
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
