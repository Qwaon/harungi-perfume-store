'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Perfume, Volume, CartItem } from '@/types';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { VOLUME_LABELS } from '@/lib/constants';
import { useCart } from '@/contexts/CartContext';
import { trackEvent } from '@/lib/analytics';

interface Props {
  perfume: Perfume | null;
  onClose: () => void;
}

export default function QuickAddSheet({ perfume, onClose }: Props) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Volume | null>(null);
  const [added, setAdded] = useState(false);
  // Synchronous guard against rapid double/triple-taps: the `added` state
  // disables the button, but React hasn't re-rendered between same-tick clicks,
  // so a fast multi-tap would call addItem multiple times. This ref blocks it.
  const addingRef = useRef(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Pre-select the first available volume (like the product page) so the
    // "Добавить" CTA is immediately actionable instead of starting disabled.
    setSelected(perfume?.availableVolumes[0] ?? null);
    setAdded(false);
    addingRef.current = false;
  }, [perfume?.id]);

  useEffect(() => {
    if (!perfume) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Move focus into the sheet on open (keyboard/SR users land inside it).
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      clearTimeout(t);
    };
  }, [perfume, onClose]);

  const handleAdd = () => {
    if (!selected || !perfume || addingRef.current) return;
    const price = perfume.prices[selected];
    if (price === undefined) return;
    addingRef.current = true;
    const item: CartItem = {
      perfumeId: perfume.id,
      perfumeName: perfume.name,
      brand: perfume.brand,
      volume: selected,
      volumeLabel: VOLUME_LABELS[selected],
      price,
      quantity: 1,
      imageUrl: perfume.images[0],
    };
    addItem(item);
    trackEvent('add_to_cart', { perfumeId: perfume.id, volume: selected, price, source: 'quick_add' });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setSelected(null);
      addingRef.current = false;
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence onExitComplete={() => setSelected(null)}>
      {perfume && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet: on mobile sits above BottomNav (56px), on md+ floats bottom-right */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Выбор объёма — ${perfume.name}`}
            className="quick-add-sheet fixed left-0 right-0 z-50 bg-cream-50 rounded-t-2xl p-6 md:rounded-2xl md:max-w-md"
            style={{ paddingBottom: '1.5rem' }}

            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-cream-200 rounded-full mx-auto mb-5 md:hidden" />

            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="label text-ink-300 mb-1">{perfume.brand}</p>
                <h3 className="font-display text-xl font-light text-ink-900">{perfume.name}</h3>
              </div>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                className="w-11 h-11 rounded-full bg-cream-100 flex items-center justify-center hover:bg-cream-200 transition-colors shrink-0 ml-4"
                aria-label="Закрыть"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="#141413" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Volume options */}
            <div className="flex flex-wrap gap-2 mb-6">
              {perfume.availableVolumes.map((vol) => {
                const price = perfume.prices[vol];
                if (price === undefined) return null;
                const active = selected === vol;
                return (
                  <button
                    key={vol}
                    onClick={() => setSelected(vol)}
                    className={`px-4 py-3 rounded-xl border text-sm transition-all duration-150 ${
                      active
                        ? 'bg-ink-900 text-white border-ink-900'
                        : 'bg-cream-50 text-ink-700 border-cream-200 hover:border-ink-500'
                    }`}
                  >
                    <span className="font-medium">{VOLUME_LABELS[vol]}</span>
                    <span className={`ml-2 text-xs ${active ? 'text-white/70' : 'text-ink-300'}`}>
                      {price.toLocaleString('ru-RU')} ₽
                    </span>
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <button
              onClick={handleAdd}
              disabled={!selected || added}
              className="btn-primary w-full py-3.5 disabled:opacity-40 disabled:translate-y-0"
            >
              {added ? '✓ Добавлено в корзину' : 'Добавить в корзину'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
