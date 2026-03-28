'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <section className="relative min-h-screen flex items-center overflow-hidden bg-cream-100">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cream-200 to-transparent opacity-60" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-gold-400/5 blur-3xl" />
      </div>

      {/* Large background text */}
      <div className="absolute inset-0 flex items-center justify-end pr-6 md:pr-16 pointer-events-none select-none">
        <p className="font-display text-[12rem] md:text-[18rem] font-light tracking-tighter text-ink-900/[0.03] leading-none">
          HARUNGI
        </p>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Text */}
        <div>
          <motion.p
            className="label text-gold-500 mb-6"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={0}
          >
            Нишевая & Селективная парфюмерия
          </motion.p>

          <motion.h1
            className="font-display text-[2.75rem] sm:text-6xl md:text-7xl xl:text-8xl font-light leading-[1.05] text-ink-900 mb-6 sm:mb-8"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
          >
            Аромат —<br />
            <span className="italic text-ink-700">ваша</span><br />
            подпись
          </motion.h1>

          <motion.p
            className="text-base md:text-lg text-ink-500 leading-relaxed max-w-md mb-10"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
          >
            Оригинальная парфюмерия мировых домов в Ставрополе. Распивы от 2 мл — попробуйте прежде, чем купить.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
          >
            <Link href="/catalog" className="btn-primary">
              Смотреть каталог
            </Link>
            <Link href="/catalog?format=распив" className="btn-outline">
              Распивы от 2 мл
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-10 sm:mt-16 flex gap-6 sm:gap-10 border-t border-cream-200 pt-6 sm:pt-8"
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
                <p className="font-display text-3xl font-light text-ink-900">{stat.value}</p>
                <p className="label text-ink-300 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Visual */}
        <motion.div
          className="relative hidden lg:flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          <div className="relative w-[420px] h-[520px]">
            {/* Card stack */}
            <div className="absolute inset-0 bg-cream-200 rounded-sm transform rotate-3 translate-x-4 translate-y-4" />
            <div className="absolute inset-0 bg-cream-300 rounded-sm transform rotate-1 translate-x-2 translate-y-2" />
            <div className="relative w-full h-full overflow-hidden rounded-sm">
              <Image
                src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=840&q=80"
                alt="Baccarat Rouge 540"
                fill
                sizes="420px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/30 to-transparent" />
            </div>

            {/* Floating badge */}
            <motion.div
              className="absolute -bottom-6 -left-8 shadow-xl rounded-xl overflow-hidden"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <Link href="/product/baccarat-rouge-540" className="block bg-white p-5 hover:bg-cream-100 transition-colors duration-200 group">
                <p className="label text-ink-300 mb-1">Хит сезона</p>
                <p className="font-display text-lg font-medium text-ink-900 group-hover:text-ink-500 transition-colors">Baccarat Rouge 540</p>
                <p className="text-xs text-ink-300 mt-0.5">MFK · от 450 ₽</p>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <p className="label text-ink-300 text-[10px]">Листайте вниз</p>
        <motion.div
          className="w-px h-8 bg-gradient-to-b from-ink-300 to-transparent"
          animate={{ scaleY: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}
