'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Perfume } from '@/types';

interface Props {
  perfume: Perfume;
  index?: number;
}

export default function ProductCard({ perfume, index = 0 }: Props) {
  const minPrice = Math.min(...Object.values(perfume.prices));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="group relative">
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
              {perfume.bestseller && (
                <span
                  className="text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md text-cream-50"
                  style={{ backgroundColor: '#8a5a44' }}
                >
                  Хит
                </span>
              )}
              {perfume.newArrival && (
                <span className="bg-ink-900 text-white text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md">
                  Новинка
                </span>
              )}
              {perfume.format === 'распив' && (
                <span className="bg-cream-50/90 text-ink-900 text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-md backdrop-blur-sm">
                  Распив
                </span>
              )}
            </div>

            {/* Quick order overlay */}
            <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
              <div className="bg-ink-900/95 backdrop-blur-sm px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-[10px] tracking-widest uppercase mb-0.5">от</p>
                  <p className="text-white text-base font-display font-light tabular-nums">
                    {minPrice.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <span className="text-white/70 text-[10px] tracking-widest uppercase flex items-center gap-1.5">
                  Выбрать объём
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6h8M7 2.5l3.5 3.5L7 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="pt-3.5 pb-2">
            <p className="label text-ink-300 mb-1">{perfume.brand}</p>
            <h3 className="font-display text-xl font-light text-ink-900 group-hover:text-ink-500 transition-colors duration-200 leading-tight">
              {perfume.name}
            </h3>
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-ink-500">
                от <span className="text-ink-900">{minPrice.toLocaleString('ru-RU')} ₽</span>
              </p>
              <p className="text-xs text-ink-300 capitalize">{perfume.gender}</p>
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
