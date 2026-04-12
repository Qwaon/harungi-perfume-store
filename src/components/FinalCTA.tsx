'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';
import { TELEGRAM_URL } from '@/lib/constants';

export default function FinalCTA() {
  return (
    <section className="bg-ink-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <motion.p
          className="label text-gold-400 mb-5"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Остались вопросы?
        </motion.p>
        <motion.h2
          className="font-display text-3xl sm:text-4xl md:text-5xl font-light text-white leading-tight mb-4 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Не нашли нужный аромат?
        </motion.h2>
        <motion.p
          className="text-cream-300/60 text-base md:text-lg mb-10 max-w-md mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Напишите нам — подберём аромат под ваш запрос, расскажем о стойкости и характере.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('cta_click', { label: 'final_cta_telegram' })}
            className="inline-flex items-center justify-center gap-2.5 text-white text-sm tracking-widest uppercase font-medium px-8 py-3.5 rounded-full transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
            style={{ backgroundColor: '#2AABEE', boxShadow: '0px 0px 0px 1px rgba(42,171,238,0.3)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
            </svg>
            Написать в Telegram
          </a>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 bg-cream-50 text-ink-900 px-8 py-3.5 text-sm tracking-widest uppercase font-medium rounded-full transition-all duration-200 hover:bg-white hover:-translate-y-px"
            style={{ boxShadow: '0px 0px 0px 1px rgba(209,207,197,0.3)' }}
          >
            Смотреть каталог
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
