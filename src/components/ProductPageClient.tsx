'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ImageGallery from '@/components/ImageGallery';
import VolumeSelector from '@/components/VolumeSelector';
import OrderModal from '@/components/OrderModal';
import ProductCard from '@/components/ProductCard';
import { Perfume, Volume } from '@/types';

interface Props {
  perfume: Perfume;
  related: Perfume[];
}

export default function ProductPageClient({ perfume, related }: Props) {
  const [selectedVolume, setSelectedVolume] = useState<Volume>(perfume.availableVolumes[0]);
  const [modalOpen, setModalOpen] = useState(false);

  const price = perfume.prices[selectedVolume] ?? 0;

  return (
    <>
      <div className="min-h-screen pt-24 md:pt-32">
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
                  {perfume.newArrival && (
                    <span className="bg-gold-500 text-cream-50 text-[10px] tracking-widest uppercase px-2 py-0.5">
                      Новинка
                    </span>
                  )}
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-light text-ink-900 leading-tight mb-4">
                  {perfume.name}
                </h1>
                <div className="flex items-center gap-3">
                  <span className="label text-ink-300 capitalize">{perfume.gender}</span>
                  <span className="w-1 h-1 bg-ink-300 rounded-full" />
                  <span className="label text-ink-300 capitalize">{perfume.scentType}</span>
                  <span className="w-1 h-1 bg-ink-300 rounded-full" />
                  <span className="label text-ink-300 capitalize">{perfume.format}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-ink-600 leading-relaxed text-base">
                {perfume.description}
              </p>

              {/* Notes pyramid */}
              <div className="border-t border-cream-200 pt-8">
                <p className="label text-ink-500 mb-5">Пирамида аромата</p>
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                  {[
                    { label: 'Верхние', notes: perfume.notes.top },
                    { label: 'Сердце', notes: perfume.notes.middle },
                    { label: 'База', notes: perfume.notes.base },
                  ].map(({ label, notes }) => (
                    <div key={label}>
                      <p className="label text-gold-500 mb-3">{label}</p>
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

              {/* Volume selector */}
              <div className="border-t border-cream-200 pt-8">
                <p className="label text-ink-500 mb-5">Выберите объём</p>
                <VolumeSelector
                  availableVolumes={perfume.availableVolumes}
                  prices={perfume.prices}
                  selected={selectedVolume}
                  onChange={setSelectedVolume}
                />
              </div>

              {/* Price + CTA */}
              <div className="border-t border-cream-200 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
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
                <button
                  onClick={() => setModalOpen(true)}
                  className="btn-primary flex-shrink-0"
                >
                  Оформить заявку
                </button>
              </div>

              <p className="text-xs text-ink-300 leading-relaxed">
                Заявка — не оплата. Мы свяжемся с вами для подтверждения заказа через Telegram или по телефону.
              </p>
              <a
                href="https://t.me/alsharkisia"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gold-600 hover:text-gold-500 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                </svg>
                Или напишите напрямую в Telegram
              </a>
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

      <OrderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        perfumeName={perfume.name}
        perfumeId={perfume.id}
        brand={perfume.brand}
        volume={selectedVolume}
        price={price}
      />
    </>
  );
}
