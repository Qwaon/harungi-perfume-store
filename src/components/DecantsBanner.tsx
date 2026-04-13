'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

// Inline SVG bottle icons — adapted for dark background (fill="#000" → white)
function BottleIcon2ml() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 200 200" aria-hidden="true">
      <path d="m158.4 175.1c-2.27-9.89-5.72-24.55-6.22-42.79 0-17.05 1.97-29.06 5.87-46.21 0.83-3.62-0.28-8.2-2.46-10.48l-7.72-10.06c-2.17-2.88-6.38-4.62-9.48-4.62h-14.62v-2.02c0.27-4.98-3.55-8.61-7.41-8.61h-6.37v-1.73l-20.51 0.06v1.67h-6.18c-4.35 0-7.35 4.63-7.42 8.1v2.53h-15.2c-4.54 0-7.82 2.27-9.59 5.09l-7.7 9.98c-2.64 3.07-3.09 7.92-1.77 11.4 3.44 12.74 6.13 24.09 6.13 45.04-0.32 17.43-2.17 27.22-6.06 43.36-1.05 3.74 0.19 8.03 2.11 10.42l7.32 9.8c2.74 3.47 5.67 3.99 10.04 3.99h77.37c4.51 0 7.75-2.16 9.92-5.81l7.68-9.98c2.2-2.86 2.82-5.93 2.27-9.13zm-5.48 5.86c-0.33 1.41-0.98 2.51-1.68 3.32l-7.18 9.53c-1.63 2.34-3.33 2.84-6.47 2.84h-75.41c-3.27 0-5.38-0.52-7.38-3.36l-7.1-9.54c-1.52-2.17-2.13-4.69-1.52-7.34 3.44-15.35 5.48-27.51 5.48-44.1 0-15.57-1.78-30.28-5.06-46.92-0.96-2.39-0.42-5.69 1.03-7.36l7.1-9.25c1.95-2.46 3.97-2.88 5.95-2.88l30.67-0.06v1.72c-0.47 4.78 2.88 7.18 6.14 7.88v39.92h-38.96c0.47 5.47 0.65 11.37 0.58 17.02-0.07 9.93-0.92 18.53-2.7 30.98-0.93 6.71 3.97 16.45 14.07 16.45h58.57c8.64 0 14.58-8.06 14.38-14.4-0.04-1.54-0.33-3.14-0.58-4.49-1.6-11.69-2.43-20.61-2.36-30.29 0.04-4.84 0.27-10.13 0.47-15.27h-39.36v-39.87c4.28-1.14 6.18-4.76 6.18-8.28v-1.28h30.34c2.86-0.2 4.96 1.15 6.62 3.54l7.33 9.38c1.63 1.79 1.77 5.09 0.61 7.75-3.97 16-4.79 27.69-4.79 46.05 0.41 16.34 1.8 25.28 5.14 42.65 0.4 1.45 0.47 3.48-0.11 5.66z" fill="rgba(255,255,255,0.85)"/>
      <path d="m80.82 6.21c7.61-5.15 14.74-6.21 19.19-6.21 7.8 0 14.27 3.47 20.27 7.46 3.13 1.72 4.41 4.86 4 7.68l-0.41 1.89c-2.74 9.73-4.98 20.8-5.05 21.28-0.89 3.54-4.03 6.22-7.81 6.22l-21.9 0.07c-4.45 0-7.95-3.07-8.36-6.53-1.63-8.26-4.84-21.89-5.04-22.66-0.62-3.3 0.61-6.82 3.35-8.48l1.76-0.72z" fill="rgba(255,255,255,0.85)"/>
    </svg>
  );
}

function BottleIcon5ml() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 256 256" aria-hidden="true">
      <path d="m104.7 49.22c1.07 5.26 5.12 7.85 9.06 7.85h28.7c5.25 0 8.44-4.13 9.34-8.6l6.88-28.35c1.18-4.96-0.37-8.98-5.08-11.89-8.73-5.27-15.82-8.23-25.1-8.23-9.11 0-15.37 2.44-25.1 8.6-4.47 2.57-6.57 6.55-5.85 11.44l7.15 29.18z" fill="rgba(255,255,255,0.85)"/>
      <path d="m200.5 223.8c-9.72-37.57-7.61-76.46-0.56-112.6l0.79-3.13c1.18-5.12-0.57-9.28-3.5-12.58l-8.37-10.68c-3.11-3.48-6.76-6.47-12.13-6.43h-18.1v-3.49c0-6.17-5.51-9.82-9.65-9.82h-7.65v-2.58h-27.05v2.27h-7.65c-5.74 0-9.32 5.58-9.32 9.72v3.86l-19.58-0.01c-5.52 0-9.37 2.92-11.95 6.83l-8.93 12.04c-3.3 4.01-3.65 9.72-1.96 14.94 8.82 32.83 9.36 67.8-0.41 111.7-1.34 5.26-0.85 10.83 2.78 14.77l9.22 11.61c3.6 4.39 7.6 5.78 12.13 5.78h99.27c5.25 0 9.21-2.51 11.9-6.3l8.5-11.77c3.3-3.94 3.7-9.13 2.22-14.09zm-5.54 11-9.18 12.48c-2.44 3.45-5.45 4.8-8.66 4.8h-98.23c-3.96 0-6.9-1.85-9.85-5.86l-8.06-10.43c-2.69-3.11-2.57-7.57-0.93-12.61 10.42-38.78 7.64-76.5-0.5-114.5-1.18-3.8-0.2-6.6 1.6-9.04l9.1-11.48c2.68-2.8 5.08-3.76 7.98-3.76h38.96v1.94c0 5.93 4.04 9.38 8.23 9.9v35.08h-52.28c4.44 30.33 3.66 48.44-0.45 78.38-1.67 10.49 6.7 21.14 17.57 21.14h75.85c10.53 0 17.44-9.95 17.13-19.12-4.2-26.52-4.65-46.28-0.69-80.4h-52.59v-35.31c5.23-1.34 8.41-5.87 8.41-11.6h38.51c4.2 0 7.38 1.2 10.31 5.13l7.57 10.17c2.44 2.91 2.01 6.85 0.92 10.96-8.29 34.22-8.52 71.97-0.39 111 1.48 4.61 2.12 9.36-0.33 13.1z" fill="rgba(255,255,255,0.85)"/>
    </svg>
  );
}

function BottleIcon10ml() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 207 207" aria-hidden="true">
      <path d="m163.7 183.7c0-2.02-0.56-3.99-1.02-6.04-2.37-10.01-5.15-22.37-5.15-42.56 0-18.03 2.65-33.92 5.34-45.08 0.85-2.7 0.8-5.58-0.16-8.25-0.47-1.31-1.33-2.45-2.24-3.47-3.03-3.44-7.44-9.37-8.38-10.83-2.67-3.56-5.89-4.86-9.71-5.06h-14.24v-1.98c0.23-5.65-3.72-8.82-8.12-8.82h-6.19v-1.66h-20.93v0.61h-0.02v1.05h-6.41c-4.47 0-7.55 4.75-7.66 8.07l-0.17 2.73h-15.69c-4.08 0.39-7.27 2.12-9.38 5.49-1.23 1.85-6 8.08-8.39 10.88-1.73 2.07-2.41 4.45-2.41 7.84l0.4 2.49c3.72 12.48 6.25 21.64 6.57 44.49 0 14.48-1.8 28.38-6.12 46.3-1.14 4.75-0.8 9.08 2.81 13.28l7.2 9.53c2.39 3.3 5.15 4.29 9.72 4.29h80.1c4.56 0 7.69-1.47 9.84-4.91 2.1-3.34 5.64-7.59 7.58-9.92 1.79-2.18 2.53-5.44 2.83-8.47zm-6.12 6.53c-0.61 0.98-6.92 8.91-8.7 11.23-1.31 1.75-3.53 2.35-6.11 2.35h-78.32c-2.42 0-4.53-0.4-6.26-2.35l-8.99-11.44c-2.03-2.26-2.21-5.6-1.03-8.51 2.95-14.3 6-28.3 6-46.85 0-16.65-2.62-32.55-5.83-44.6-0.86-2.94-0.86-5.95 0.98-8.75l7.25-9.45c2.1-2.74 4.31-3.6 7.76-3.6h78.55c3.39 0 5.7 1.17 7.73 3.97l6.65 8.41c1.89 2.06 1.55 5.85 0.95 7.58-3.44 11.89-5.7 26.73-5.7 43.97-0.47 3.92-0.05 10.52 0.17 15.9 0.66 12.1 3.47 24.97 5.14 34.02 0.65 2.85 1.13 5.24-0.24 8.12z" fill="rgba(255,255,255,0.85)"/>
      <path d="m150.8 84.06c-0.67-1.66-2.47-3.57-4.1-5.62-2.16-2.75-2.7-4.36-7.61-4.64h-70.13c-2.75 0-4.6 0.97-5.94 2.88l-6.4 7.67c-1.43 2.38-1.67 4.64-1.04 6.49 2.88 10.07 5.87 23.07 5.87 47.38 0 11.49-0.97 21.51-3.04 32.06-0.46 4.47 0.45 8.48 3.25 11.57 3.39 3.9 7.01 5.38 11.13 5.27h61.78c8.46 0 14.01-7.9 14.18-14.83l-2.56-18.11c-0.69-7.04-0.8-11.46-0.06-27.84 0.69-11.72 2.85-22.83 5.17-33.22 0.8-3.2 1.2-5.7-0.5-9.06z" fill="rgba(255,255,255,0.4)"/>
      <path d="m85.11 6.21c-3.55 2.21-4.4 2.43-5.52 4.55-1.37 2.26-1.37 4.7-0.51 7.08 1.74 6.53 4.01 15.35 5.61 21.76 0.63 3.67 3.84 6.06 7.45 6.06h22.85c3.27 0 5.75-2.55 6.72-5.94 1.48-6.99 4.47-17.59 6.37-24.31 1.13-4.59-1.36-8.09-6.37-10.35-7.73-4.12-12.53-5.06-17.87-5.06-7.9 0-12.26 1.48-18.73 6.21z" fill="rgba(255,255,255,0.85)"/>
    </svg>
  );
}

const volumes = [
  {
    ml: '2 мл',
    usage: '~20 нанесений',
    desc: 'Знакомство с ароматом',
    price: 'от 300 ₽',
    icon: <BottleIcon2ml />,
  },
  {
    ml: '5 мл',
    usage: '~50 нанесений',
    desc: 'На неделю-две',
    price: 'от 650 ₽',
    icon: <BottleIcon5ml />,
  },
  {
    ml: '10 мл',
    usage: '~100 нанесений',
    desc: 'На месяц и более',
    price: 'от 1 200 ₽',
    icon: <BottleIcon10ml />,
  },
];

export default function DecantsBanner() {
  return (
    <section className="bg-ink-900 overflow-hidden relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-36">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start mb-16 md:mb-24">
          <div>
            <motion.p
              className="label text-gold-400 mb-5"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Распивы
            </motion.p>
            <motion.h2
              className="font-display text-4xl sm:text-5xl md:text-6xl font-light text-white leading-tight mb-6 text-balance"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Попробуйте<br />
              <span className="italic text-cream-300">прежде,</span> чем купить
            </motion.h2>
            <motion.p
              className="text-cream-300/70 text-base md:text-lg leading-relaxed max-w-md mb-10 text-pretty"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Распив — это отливант из оригинального запечатанного флакона в стерильный атомайзер. Вы получаете тот самый аромат, но в удобном формате для знакомства.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                href="/catalog?format=распив"
                className="inline-flex items-center gap-2.5 bg-cream-50 text-ink-900 px-8 py-3.5 text-sm tracking-widest uppercase font-medium rounded-full transition-all duration-200 hover:bg-white hover:-translate-y-px active:scale-[0.98] cursor-pointer"
                style={{ boxShadow: '0px 0px 0px 1px rgba(209,207,197,0.3)' }}
              >
                Смотреть распивы
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </motion.div>
          </div>

          {/* What is a decant — explanation */}
          <motion.div
            className="border border-white/10 rounded-2xl p-6 sm:p-8 bg-white/[0.03]"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="label text-gold-400 mb-4">Как это работает</p>
            <div className="flex flex-col gap-5">
              {[
                { num: '01', text: 'Вы выбираете аромат и нужный объём' },
                { num: '02', text: 'Мы вскрываем оригинальный флакон и разливаем в чистый атомайзер' },
                { num: '03', text: 'Отправляем в надёжной упаковке — аромат доедет в целости' },
              ].map((step) => (
                <div key={step.num} className="flex gap-4 items-start">
                  <span className="font-display text-2xl font-light text-gold-400/50 leading-none mt-0.5">{step.num}</span>
                  <p className="text-sm text-cream-300/80 leading-relaxed text-pretty">{step.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Volume comparison cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {volumes.map((item) => (
            <div
              key={item.ml}
              className="border border-white/10 rounded-2xl p-6 sm:p-8 hover:border-white/20 hover:bg-white/[0.03] transition-all duration-300 flex flex-col items-center text-center"
            >
              {/* SVG bottle icon */}
              <div className="mb-5 opacity-90">
                {item.icon}
              </div>
              <p className="font-display text-3xl sm:text-4xl font-light text-white mb-1 tabular-nums">{item.ml}</p>
              <p className="text-xs text-gold-400 mb-3">{item.usage}</p>
              <p className="text-sm text-cream-300/60 mb-4">{item.desc}</p>
              <p className="text-sm text-white font-medium">{item.price}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
