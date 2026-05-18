'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import CartCheckoutModal from '@/components/CartCheckoutModal';
import { perfumes } from '@/data/perfumes';

export default function CartDrawer() {
  const { items, removeItem, clearCart, total, count, isOpen, closeCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCart}
            />

            <motion.div
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-cream-50 flex flex-col"
              style={{ boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5 border-b border-cream-200 flex-shrink-0"
                style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
              >
                <div>
                  <p className="label text-gold-500 mb-0.5">Корзина</p>
                  <p className="text-sm text-ink-300">
                    {count}{' '}
                    {count === 1 ? 'позиция' : count < 5 ? 'позиции' : 'позиций'}
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors"
                  aria-label="Закрыть корзину"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="#141413" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <p className="font-display text-2xl font-light text-ink-300">
                      Корзина пуста
                    </p>
                    <p className="text-sm text-ink-300">Добавьте ароматы из каталога</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((item) => {
                      const perfume = perfumes.find((p) => p.id === item.perfumeId);
                      const image = perfume?.images[0];
                      return (
                        <div
                          key={`${item.perfumeId}-${item.volume}`}
                          className="bg-cream-50 rounded-2xl p-3 flex items-center gap-3"
                          style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
                        >
                          {/* Thumbnail */}
                          {image ? (
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-cream-200 flex-shrink-0">
                              <Image src={image} alt={item.perfumeName} fill sizes="56px" className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-cream-200 flex-shrink-0" />
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-base font-light text-ink-900 leading-tight truncate">
                              {item.perfumeName}
                            </p>
                            <div className="flex items-baseline gap-2 mt-1">
                              <p className="font-display text-sm font-light text-ink-900">
                                {item.price.toLocaleString('ru-RU')} ₽
                              </p>
                              <p className="text-xs text-ink-300">{item.volumeLabel}</p>
                            </div>
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => removeItem(item.perfumeId, item.volume)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors flex-shrink-0"
                            aria-label="Удалить"
                          >
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                              <path d="M1 1l12 12M13 1L1 13" stroke="#87867f" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={clearCart}
                      className="text-xs text-ink-300 hover:text-ink-500 transition-colors mt-1 text-left"
                    >
                      Очистить корзину
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div
                  className="border-t border-cream-200 px-6 py-5 flex-shrink-0"
                  style={{
                    paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="label text-ink-500">Итого</p>
                    <p className="font-display text-2xl font-light text-ink-900">
                      {total.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  <button
                    onClick={() => setCheckoutOpen(true)}
                    className="btn-primary w-full"
                  >
                    Оформить заявку
                  </button>
                  <p className="text-xs text-ink-300 text-center mt-3">
                    Заявка — не оплата. Мы свяжемся для подтверждения.
                  </p>
                </div>
              )}
            </motion.div>
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
