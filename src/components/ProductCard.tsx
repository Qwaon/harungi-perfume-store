'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Perfume } from '@/types';

interface Props {
  perfume: Perfume;
  index?: number;
  onQuickAdd?: (perfume: Perfume) => void;
  priority?: boolean;
}

export default function ProductCard({ perfume, index = 0, onQuickAdd, priority = false }: Props) {
  const minPrice = Math.min(...Object.values(perfume.prices));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.36), ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="group transition-transform duration-300 ease-out hover:-translate-y-1">
        {/* Image */}
        <Link href={`/product/${perfume.id}`} className="block relative overflow-hidden bg-cream-200 aspect-[3/4] rounded-xl mb-3">
          <Image
            src={perfume.images[0]}
            alt={`${perfume.name} — ${perfume.brand}`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority={priority}
          />
          <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/5 transition-colors duration-500 rounded-xl" />

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
        </Link>

        {/* Info + CTA */}
        <div>
          <p className="label text-ink-300 group-hover:text-gold-500 transition-colors duration-300 mb-1 break-words">{perfume.brand}</p>
          <Link href={`/product/${perfume.id}`}>
            <h3 className="font-display text-lg font-light text-ink-900 hover:text-ink-500 transition-colors duration-200 leading-tight mb-2 break-words">
              {perfume.name}
            </h3>
          </Link>
          <p className="text-sm font-medium text-ink-900 mb-2">
            от {minPrice.toLocaleString('ru-RU')} ₽
          </p>
          {onQuickAdd ? (
            <button
              onClick={(e) => { e.preventDefault(); onQuickAdd(perfume); }}
              className="w-full min-h-11 text-xs font-medium text-ink-900 bg-cream-100 hover:bg-ink-900 hover:text-white border border-cream-200 hover:border-ink-900 py-2 rounded-lg transition-colors duration-150"
            >
              + В корзину
            </button>
          ) : (
            <p className="text-xs text-ink-300 capitalize">{perfume.gender}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
