'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  perfumeName: string;
  perfumeId: string;
  brand: string;
  volume: Volume;
  price: number;
}

const volumeLabels: Record<Volume, string> = {
  '2ml': '2 мл',
  '5ml': '5 мл',
  '10ml': '10 мл',
  '50ml': '50 мл',
  '100ml': '100 мл',
};

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function OrderModal({ isOpen, onClose, perfumeName, perfumeId, brand, volume, price }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    const msg = [
      `Хочу заказать:`,
      `${brand} — ${perfumeName}`,
      `Объём: ${volumeLabels[volume]}`,
      `Цена: ${price.toLocaleString('ru-RU')} ₽`,
      ``,
      `Имя: ${name.trim()}`,
      `Контакт: ${contact.trim()}`,
    ].join('\n');
    window.open(`https://t.me/alsharkisia?text=${encodeURIComponent(msg)}`, '_blank');
    setStatus('success');
  };

  const handleClose = () => {
    if (status === 'loading') return;
    onClose();
    setTimeout(() => { setStatus('idle'); setName(''); setContact(''); setErrorMsg(''); }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Bottom sheet on mobile, centered dialog on sm+ */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
            <motion.div
              className="w-full sm:max-w-[480px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl pointer-events-auto flex flex-col"
              style={{ maxHeight: '92dvh' }}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Drag handle (mobile only) */}
              <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-cream-300" />
              </div>

              {/* Scrollable inner */}
              <div className="overflow-y-auto flex-1">
                {/* Close */}
                <div className="sticky top-0 bg-white z-10 flex justify-end px-6 pt-4 pb-1">
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream-100 transition-colors"
                    aria-label="Закрыть"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1l12 12M13 1L1 13" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 pb-8 sm:px-8 sm:pb-8 md:px-10 md:pb-10" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
                  {status === 'success' ? (
                    <motion.div
                      className="text-center py-8"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="w-16 h-16 rounded-full bg-ink-900 flex items-center justify-center mx-auto mb-6">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h3 className="font-display text-3xl font-light text-ink-900 mb-3">Заявка отправлена</h3>
                      <p className="text-ink-500 text-sm leading-relaxed mb-8">
                        Мы свяжемся с вами в ближайшее время по указанным контактам.
                      </p>
                      <button onClick={handleClose} className="btn-primary w-full">Закрыть</button>
                    </motion.div>
                  ) : (
                    <>
                      <p className="label text-ink-300 mb-2">Оформить заявку</p>
                      <h3 className="font-display text-2xl font-medium text-ink-900 mb-1">{perfumeName}</h3>
                      <p className="text-sm text-ink-300 mb-6">{brand}</p>

                      <div className="bg-cream-100 rounded-xl p-4 mb-7 flex justify-between items-center">
                        <div>
                          <p className="label text-ink-300 mb-0.5">Объём</p>
                          <p className="text-ink-900 font-semibold">{volumeLabels[volume]}</p>
                        </div>
                        <div className="text-right">
                          <p className="label text-ink-300 mb-0.5">Цена</p>
                          <p className="font-display text-2xl font-light text-ink-900">{price.toLocaleString('ru-RU')} ₽</p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                          <label className="label text-ink-500 block mb-2">Ваше имя *</label>
                          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" className="input-base" />
                        </div>
                        <div>
                          <label className="label text-ink-500 block mb-2">Telegram или телефон *</label>
                          <input type="text" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@username или +7 900 000-00-00" className="input-base" />
                        </div>

                        {status === 'error' && (
                          <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-3">{errorMsg}</p>
                        )}

                        <button type="submit" disabled={status === 'loading'} className="btn-primary w-full mt-2 disabled:opacity-50">
                          {status === 'loading' ? (
                            <span className="flex items-center gap-2">
                              <motion.span
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                              />
                              Отправляем...
                            </span>
                          ) : 'Отправить заявку'}
                        </button>

                        <p className="text-xs text-ink-300 text-center">
                          Мы свяжемся с вами через Telegram или по телефону
                        </p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
