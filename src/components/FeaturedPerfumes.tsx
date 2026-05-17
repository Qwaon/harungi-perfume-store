'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import { Perfume } from '@/types';

interface Props {
  perfumes: Perfume[];
}

export default function FeaturedPerfumes({ perfumes }: Props) {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
      <div className="flex items-baseline justify-between mb-10">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Популярное
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <Link href="/catalog" className="text-sm text-gold-500 hover:text-ink-900 transition-colors duration-200">
            Весь каталог →
          </Link>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {perfumes.map((p, i) => (
          <ProductCard key={p.id} perfume={p} index={i} />
        ))}
      </div>
    </section>
  );
}
