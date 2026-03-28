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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
        <div>
          <motion.p
            className="label text-ink-300 mb-3"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Избранное
          </motion.p>
          <motion.h2
            className="section-title"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Популярные ароматы
          </motion.h2>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link href="/catalog" className="btn-outline py-3 px-7 text-xs">
            Весь каталог
          </Link>
        </motion.div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7">
        {perfumes.map((p, i) => (
          <ProductCard key={p.id} perfume={p} index={i} />
        ))}
      </div>
    </section>
  );
}
