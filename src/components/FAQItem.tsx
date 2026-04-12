'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  q: string;
  a: string;
  index: number;
}

export default function FAQItem({ q, a, index }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className="border-b border-cream-200"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start justify-between gap-4 w-full py-6 text-left group"
      >
        <span className="font-display text-lg sm:text-xl font-light text-ink-900 group-hover:text-ink-500 transition-colors leading-snug">
          {q}
        </span>
        <motion.div
          className="w-6 h-6 rounded-full bg-cream-200 flex items-center justify-center shrink-0 mt-0.5"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="#141413" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-ink-500 leading-relaxed pb-6 max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
