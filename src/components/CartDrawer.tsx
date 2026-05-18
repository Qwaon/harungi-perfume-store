'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import CartCheckoutModal from '@/components/CartCheckoutModal';
export default function CartDrawer() {
  const { items, removeItem, clearCart, total, count, isOpen, closeCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeCart]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Scrim — 50% opacity per UX guidelines (40–60% for modal isolation) */}
            <motion.div
              className="fixed inset-0 z-50 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeCart}
            />

            {/* Modal — centered on desktop, bottom sheet on mobile */}
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 pointer-events-none">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Корзина"
                className="pointer-events-auto w-full sm:max-w-lg bg-cream-50 rounded-t-3xl sm:rounded-2xl flex flex-col"
                style={{
                  maxHeight: '88dvh',
                  boxShadow: '0 0 0 1px #e8e6dc, 0 32px 64px -12px rgba(0,0,0,0.22)',
                }}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              >
                {/* Drag handle — mobile only */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-9 h-1 rounded-full bg-cream-300" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-4 pb-4 sm:pt-6 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-2xl font-light text-ink-900">Корзина</h2>
                    {count > 0 && (
                      <span className="text-xs text-ink-300 tabular-nums">
                        {count} {count === 1 ? 'позиция' : count < 5 ? 'позиции' : 'позиций'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={closeCart}
                    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors"
                    aria-label="Закрыть корзину"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1l12 12M13 1L1 13" stroke="#141413" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-cream-200 flex-shrink-0" />

                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 gap-4 text-center">
                      <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 14 12" fill="none">
                          <path d="M0 0.55C0 0.25 0.25 0 0.54 0h2.01c.65 0 .85.26.92.76l.09.65h9.41c.4 0 .64.23.64.57 0 .06-.01.16-.02.24l-.44 2.95c-.13.88-.6 1.43-1.49 1.43H4.32l.09.61c.04.3.22.5.5.5h6.69c.28 0 .52.21.52.52s-.24.51-.52.51H4.79c-.89 0-1.36-.54-1.49-1.42L2.38 1.1H.54C.25 1.1 0 .84 0 .55zm4.25 10.1c0-.57.45-1.02 1.01-1.02s1.01.45 1.01 1.01-.45 1.02-1.01 1.02-1.01-.45-1.01-1.01zm5.41 0c0-.57.46-1.02 1.02-1.02s1.04.45 1.04 1.01-.45 1.02-1.04 1.02-1.02-.45-1.02-1.01z" fill="#87867f"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-display text-xl font-light text-ink-900 mb-1">Корзина пуста</p>
                        <p className="text-sm text-ink-300">Добавьте ароматы из каталога</p>
                      </div>
                      <Link
                        href="/catalog"
                        onClick={closeCart}
                        className="btn-outline mt-2 py-3 px-6 text-xs"
                      >
                        Перейти в каталог
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {items.map((item) => {
                        return (
                          <div
                            key={`${item.perfumeId}-${item.volume}`}
                            className="flex items-center gap-4 py-3 border-b border-cream-200 last:border-0"
                          >
                            {/* Thumbnail */}
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-cream-200 flex-shrink-0">
                              {item.imageUrl && (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.perfumeName}
                                  fill
                                  sizes="64px"
                                  className="object-cover"
                                />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-ink-300 mb-0.5">{item.brand}</p>
                              <p className="font-display text-base font-light text-ink-900 leading-snug truncate">
                                {item.perfumeName}
                              </p>
                              <div className="flex items-baseline gap-2 mt-1">
                                <p className="font-display text-base font-light text-ink-900 tabular-nums">
                                  {item.price.toLocaleString('ru-RU')} ₽
                                </p>
                                <span className="text-xs text-ink-300">{item.volumeLabel}</span>
                              </div>
                            </div>

                            {/* Remove — min 44px touch target */}
                            <button
                              onClick={() => removeItem(item.perfumeId, item.volume)}
                              className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors flex-shrink-0"
                              aria-label={`Удалить ${item.perfumeName}`}
                            >
                              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                                <path d="M1 1l12 12M13 1L1 13" stroke="#87867f" strokeWidth="1.6" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}

                      <button
                        onClick={clearCart}
                        className="text-xs text-ink-300 hover:text-ink-500 transition-colors pt-1 text-left"
                      >
                        Очистить корзину
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer — only when items exist */}
                {items.length > 0 && (
                  <div
                    className="flex-shrink-0 border-t border-cream-200 px-6 pt-4 pb-6"
                    style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
                  >
                    {/* Total row */}
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-sm text-ink-500">Итого</span>
                      <span className="font-display text-2xl font-light text-ink-900 tabular-nums">
                        {total.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>

                    {/* Primary CTA */}
                    <button
                      onClick={() => { setCheckoutOpen(true); }}
                      className="btn-primary w-full"
                    >
                      Оформить заявку
                    </button>

                    <p className="text-xs text-ink-300 text-center mt-3 leading-relaxed">
                      Заявка — не оплата. Мы свяжемся для подтверждения.
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <CartCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={items}
        total={total}
        onSuccess={() => {
          setCheckoutOpen(false);
          clearCart();
          closeCart();
        }}
      />
    </>
  );
}
