'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { trackEvent } from '@/lib/analytics';
import { TELEGRAM_URL, VOLUME_LABELS } from '@/lib/constants';
import Link from 'next/link';
import ImageGallery from '@/components/ImageGallery';
import VolumeSelector from '@/components/VolumeSelector';
import OrderModal from '@/components/OrderModal';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { Perfume, Volume } from '@/types';

interface Props {
  perfume: Perfume;
  related: Perfume[];
}

export default function ProductPageClient({ perfume, related }: Props) {
  const [selectedVolume, setSelectedVolume] = useState<Volume>(perfume.availableVolumes[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const { addItem, openCart, isOpen: cartOpen } = useCart();

  useEffect(() => {
    trackEvent('product_view', { id: perfume.id, brand: perfume.brand });
  }, [perfume.id, perfume.brand]);

  const price = perfume.prices[selectedVolume] ?? 0;
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(perfume.id);

  const getVolumeLabel = () => {
    if (selectedVolume === 'original' && perfume.originalVolumeMl) {
      return `${perfume.originalVolumeMl} мл`;
    }
    return VOLUME_LABELS[selectedVolume];
  };

  const handleAddToCart = () => {
    addItem({
      perfumeId: perfume.id,
      perfumeName: perfume.name,
      brand: perfume.brand,
      volume: selectedVolume,
      volumeLabel: getVolumeLabel(),
      price,
      quantity: 1,
      imageUrl: perfume.images[0],
    });
    openCart();
  };

  return (
    <>
      <div className="min-h-dvh pt-24 md:pt-32 pb-36 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-ink-300 mb-6 md:mb-10">
            <Link href="/" className="hover:text-ink-700 transition-colors">Главная</Link>
            <span>/</span>
            <Link href="/catalog" className="hover:text-ink-700 transition-colors">Каталог</Link>
            <span>/</span>
            <span className="text-ink-700">{perfume.name}</span>
          </nav>

          {/* Product layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:sticky lg:top-28"
            >
              <ImageGallery images={perfume.images} name={perfume.name} />
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="flex flex-col gap-8"
            >
              {/* Title */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="label text-gold-500">{perfume.brand}</p>
                  {perfume.bestseller && (
                    <span
                      className="text-cream-50 text-[10px] tracking-widest uppercase px-2 py-0.5 rounded"
                      style={{ backgroundColor: '#8a5a44' }}
                    >
                      Хит
                    </span>
                  )}
                  {perfume.newArrival && (
                    <span className="bg-gold-500 text-cream-50 text-[10px] tracking-widest uppercase px-2 py-0.5 rounded">
                      Новинка
                    </span>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h1 className="font-display text-4xl md:text-5xl font-light text-ink-900 leading-tight">
                    {perfume.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => toggle(perfume.id)}
                    className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-cream-200 transition-colors flex-shrink-0"
                    aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
                    aria-pressed={fav}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill={fav ? '#5c6b3f' : 'none'} stroke="#5c6b3f" strokeWidth="1.8">
                      <path d="M12 21s-7.5-4.6-10-9.2C.6 9 1.6 5.5 5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.4 0 4.4 3.5 3 6.3C19.5 16.4 12 21 12 21Z" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="label text-ink-300 capitalize">{perfume.gender}</span>
                  <span className="w-1 h-1 bg-ink-300 rounded-full" />
                  <span className="label text-ink-300 capitalize">{perfume.scentType}</span>
                  <span className="w-1 h-1 bg-ink-300 rounded-full" />
                  <span className="label text-ink-300 capitalize">{perfume.format}</span>
                </div>
              </div>

              {/* Volume selector */}
              <div className="border-t border-cream-200 pt-8">
                <p className="label text-gold-500 mb-5">Выберите объём</p>
                <VolumeSelector
                  availableVolumes={perfume.availableVolumes}
                  prices={perfume.prices}
                  selected={selectedVolume}
                  onChange={setSelectedVolume}
                  originalVolumeMl={perfume.originalVolumeMl}
                />
              </div>

              {/* Price + CTA (desktop) */}
              <div className="hidden md:flex border-t border-cream-200 pt-8 flex-col gap-6">
                <div>
                  <p className="label text-ink-300 mb-1">Цена</p>
                  <motion.p
                    key={price}
                    className="font-display text-4xl font-light text-ink-900"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {price.toLocaleString('ru-RU')} ₽
                  </motion.p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handleAddToCart} className="btn-primary flex-shrink-0">
                    В корзину
                  </button>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="btn-outline flex-shrink-0"
                  >
                    Заказать сразу
                  </button>
                  <a
                    href={TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline flex-shrink-0 inline-flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                    </svg>
                    Задать вопрос
                  </a>
                </div>
                <p className="text-xs text-ink-300 leading-relaxed">
                  Заявка — не оплата. Мы свяжемся с вами для подтверждения заказа через Telegram или по телефону.
                </p>
              </div>

              {/* Description */}
              <div className="border-t border-cream-200 pt-8">
                <p className="text-ink-500 leading-relaxed text-base">{perfume.description}</p>
              </div>

              {/* Notes pyramid — only render columns that have notes; hide section entirely when empty */}
              {(() => {
                const pyramid = [
                  { label: 'Верхние', notes: perfume.notes.top },
                  { label: 'Сердце', notes: perfume.notes.middle },
                  { label: 'База', notes: perfume.notes.base },
                ].filter(({ notes }) => notes.length > 0);

                if (pyramid.length === 0) return null;

                return (
                  <div className="border-t border-cream-200 pt-8">
                    <p className="label text-gold-500 mb-5">Пирамида аромата</p>
                    <div className="grid grid-cols-3 gap-3 sm:gap-6">
                      {pyramid.map(({ label, notes }) => (
                        <div key={label}>
                          <p className="label text-ink-300 mb-3">{label}</p>
                          <ul className="flex flex-col gap-1">
                            {notes.map((note) => (
                              <li key={note} className="text-sm text-ink-700">
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="border-t border-cream-200 pt-8">
                <p className="label text-gold-500 mb-5">Когда носить</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {perfume.occasion.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-lg bg-ink-900 text-white px-4 py-2 text-sm capitalize"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {perfume.season.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center rounded-lg bg-cream-200 text-ink-700 px-4 py-2 text-sm capitalize"
                    >
                      {item}
                    </span>
                  ))}
                  <span className="inline-flex items-center rounded-lg bg-cream-200 text-ink-700 px-4 py-2 text-sm capitalize">
                    {perfume.intensity}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Related products */}
          {related.length > 0 && (
            <div className="mt-24 md:mt-32 border-t border-cream-200 pt-16 pb-16">
              <p className="label text-gold-500 mb-3">Вам также может понравиться</p>
              <h2 className="section-title mb-10">Похожие ароматы</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
                {related.map((p, i) => (
                  <ProductCard key={p.id} perfume={p} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky mobile CTA bar — sits above BottomNav, hidden when cart is open */}
      <div
        className={`fixed left-0 right-0 z-40 md:hidden bg-cream-50 border-t border-cream-200 px-4 py-3 transition-transform duration-300 ${cartOpen ? 'translate-y-full' : 'translate-y-0'}`}
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <motion.p
              key={price}
              className="font-display text-2xl font-light text-ink-900"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {price.toLocaleString('ru-RU')} ₽
            </motion.p>
            <p className="text-xs text-ink-300 truncate">{perfume.name}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleAddToCart} className="btn-primary py-3 px-5 text-sm">
              В корзину
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-outline py-3 px-4 text-sm"
            >
              Заказать
            </button>
          </div>
        </div>
      </div>

      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        perfumeName={perfume.name}
        perfumeId={perfume.id}
        brand={perfume.brand}
        volume={selectedVolume}
        volumeLabel={getVolumeLabel()}
        price={price}
      />
    </>
  );
}
