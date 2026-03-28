'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Perfume } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';

interface Props {
  perfume: Perfume;
  index?: number;
}

export default function ProductCard({ perfume, index = 0 }: Props) {
  const minPrice = Math.min(...Object.values(perfume.prices));
  const { toggle, isFavorite } = useFavorites();
  const liked = isFavorite(perfume.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="group relative">
        {/* Favorite button */}
        <button
          onClick={(e) => { e.preventDefault(); toggle(perfume.id); }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white hover:scale-110 transition-all duration-200"
          aria-label={liked ? 'Убрать из избранного' : 'В избранное'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? '#0A0A0A' : 'none'} stroke="#0A0A0A" strokeWidth="1.5">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>

        <Link href={`/product/${perfume.id}`} className="block">
          {/* Image */}
          <div className="relative overflow-hidden bg-cream-200 aspect-[3/4] rounded-xl">
            <Image
              src={perfume.images[0]}
              alt={`${perfume.name} — ${perfume.brand}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/8 transition-colors duration-500 rounded-xl" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              {perfume.newArrival && (
                <span className="bg-ink-900 text-white text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md">
                  Новинка
                </span>
              )}
              {perfume.format === 'распив' && (
                <span className="bg-white/90 text-ink-900 text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md backdrop-blur-sm">
                  Распив
                </span>
              )}
            </div>

            {/* Quick order overlay */}
            <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out px-3 pb-3">
              <div className="bg-ink-900 text-white text-center py-3 text-xs tracking-widest uppercase font-medium rounded-lg shadow-lg">
                Выбрать объём
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="pt-3.5 pb-2">
            <p className="label text-ink-300 mb-1">{perfume.brand}</p>
            <h3 className="font-display text-xl font-medium text-ink-900 group-hover:text-ink-500 transition-colors duration-200 leading-tight">
              {perfume.name}
            </h3>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-ink-500">
                от <span className="text-ink-900 font-semibold">{minPrice.toLocaleString('ru-RU')} ₽</span>
              </p>
              <p className="text-xs text-ink-300 capitalize">{perfume.gender}</p>
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
