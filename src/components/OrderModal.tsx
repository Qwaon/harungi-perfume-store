'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderPayload, Volume } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { TELEGRAM_URL, VOLUME_LABELS as VOL_LABELS } from '@/lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  perfumeName: string;
  perfumeId: string;
  brand: string;
  volume: Volume;
  price: number;
}

const volumeLabels = VOL_LABELS;

type Status = 'idle' | 'loading' | 'success' | 'error';

const ORDER_WEBHOOK_URL = process.env.NEXT_PUBLIC_ORDER_WEBHOOK_URL;
const TELEGRAM_DIRECT_URL = TELEGRAM_URL;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;
const MIN_CONTACT_LENGTH = 4;
const MAX_CONTACT_LENGTH = 80;
const MIN_SUBMIT_DELAY_MS = 1500;
const CLIENT_RATE_LIMIT_MS = 30_000;
const LAST_SUBMIT_KEY = 'harungi-last-order-submit-at';

function detectSource() {
  if (typeof window === 'undefined') return 'unknown';

  const params = new URLSearchParams(window.location.search);
  const rawUtm = params.get('utm_source') ?? '';
  const utmSource = rawUtm.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  if (utmSource) return `utm:${utmSource}`;

  if (document.referrer) {
    try {
      const referrerHost = new URL(document.referrer).hostname.replace(/^www\./, '');
      return `ref:${referrerHost}`;
    } catch {
      return 'ref:unknown';
    }
  }

  return 'direct';
}

function isValidName(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= MIN_NAME_LENGTH && trimmed.length <= MAX_NAME_LENGTH;
}

function isValidContact(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < MIN_CONTACT_LENGTH || trimmed.length > MAX_CONTACT_LENGTH) return false;

  const telegramLike = /^@?[a-zA-Z0-9_]{4,32}$/;
  const phoneLike = /^\+?[0-9\s\-()]{7,20}$/;
  const hasEnoughDigits = trimmed.replace(/\D/g, '').length >= 7;

  return telegramLike.test(trimmed) || (phoneLike.test(trimmed) && hasEnoughDigits);
}

function createFallbackMessage(payload: OrderPayload) {
  return [
    payload.messageType === 'consultation' ? 'Хочу консультацию:' : 'Хочу заказать:',
    `${payload.brand} — ${payload.perfumeName}`,
    `Объём: ${volumeLabels[payload.volume]}`,
    `Цена: ${payload.price.toLocaleString('ru-RU')} ₽`,
    '',
    `Имя: ${payload.name}`,
    `Контакт: ${payload.contact}`,
    `Страница: ${payload.pagePath}`,
    `Источник: ${payload.source}`,
  ].join('\n');
}

async function sendOrder(payload: OrderPayload): Promise<boolean> {
  if (!ORDER_WEBHOOK_URL) {
    return false;
  }

  const res = await fetch(ORDER_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return res.ok;
}

export default function OrderModal({ isOpen, onClose, perfumeName, perfumeId, brand, volume, price }: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [openedAt, setOpenedAt] = useState<number | null>(null);

  const openFallback = (payload: OrderPayload) => {
    const fallbackMsg = createFallbackMessage(payload);
    window.open(`${TELEGRAM_DIRECT_URL}?text=${encodeURIComponent(fallbackMsg)}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedContact = contact.trim();

    if (website.trim() !== '') {
      setStatus('success');
      return;
    }

    if (!isValidName(trimmedName)) {
      setStatus('error');
      setErrorMsg('Укажите имя от 2 до 60 символов.');
      return;
    }

    if (!isValidContact(trimmedContact)) {
      setStatus('error');
      setErrorMsg('Укажите корректный Telegram-ник или номер телефона.');
      return;
    }

    if (openedAt && Date.now() - openedAt < MIN_SUBMIT_DELAY_MS) {
      setStatus('error');
      setErrorMsg('Форма отправлена слишком быстро. Попробуйте ещё раз через пару секунд.');
      return;
    }

    const lastSubmitAt = window.localStorage.getItem(LAST_SUBMIT_KEY);
    if (lastSubmitAt && Date.now() - Number(lastSubmitAt) < CLIENT_RATE_LIMIT_MS) {
      setStatus('error');
      setErrorMsg('Повторная отправка доступна через 30 секунд.');
      return;
    }

    const payload: OrderPayload = {
      name: trimmedName,
      contact: trimmedContact,
      perfumeId,
      perfumeName,
      brand,
      volume,
      price,
      source: detectSource(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      timestamp: new Date().toISOString(),
      messageType: 'order',
    };

    setStatus('loading');
    setErrorMsg('');

    try {
      const sent = await sendOrder(payload);

      if (sent) {
        window.localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
        trackEvent('order_submit', { perfumeId, volume, price });
        setStatus('success');
      } else {
        trackEvent('order_fallback', { perfumeId, volume });
        openFallback(payload);
        setStatus('success');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Не удалось отправить заявку. Попробуйте написать нам напрямую в Telegram.');
    }
  };

  const handleClose = () => {
    if (status === 'loading') return;
    onClose();
    setTimeout(() => {
      setStatus('idle');
      setName('');
      setContact('');
      setWebsite('');
      setErrorMsg('');
      setOpenedAt(null);
    }, 400);
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
              className="w-full sm:max-w-[480px] bg-cream-50 rounded-t-3xl sm:rounded-2xl pointer-events-auto flex flex-col"
              style={{ maxHeight: '92dvh', boxShadow: '0px 0px 0px 1px #e8e6dc, 0 25px 50px -12px rgba(0,0,0,0.25)' }}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onAnimationStart={() => {
                if (openedAt === null) {
                  setOpenedAt(Date.now());
                  trackEvent('order_open', { perfumeId });
                }
              }}
            >
              {/* Drag handle (mobile only) */}
              <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-cream-300" />
              </div>

              {/* Scrollable inner */}
              <div className="overflow-y-auto flex-1">
                {/* Close */}
                <div className="sticky top-0 bg-cream-50 z-10 flex justify-end px-6 pt-4 pb-1">
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors"
                    aria-label="Закрыть"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1l12 12M13 1L1 13" stroke="#141413" strokeWidth="1.6" strokeLinecap="round" />
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
                      <div className="w-16 h-16 rounded-full bg-gold-500 flex items-center justify-center mx-auto mb-6">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h3 className="font-display text-3xl font-light text-ink-900 mb-3">Заявка отправлена</h3>
                      <p className="text-ink-500 text-sm leading-relaxed mb-8">
                        Мы свяжемся с вами в ближайшее время через Telegram или по телефону.
                      </p>
                      <button onClick={handleClose} className="btn-primary w-full">Закрыть</button>
                    </motion.div>
                  ) : (
                    <>
                      <p className="label text-gold-500 mb-2">Оформить заявку</p>
                      <h3 className="font-display text-2xl font-light text-ink-900 mb-1">{perfumeName}</h3>
                      <p className="text-sm text-ink-300 mb-6">{brand}</p>

                      <div className="bg-cream-100 rounded-xl p-4 mb-7 flex justify-between items-center"
                        style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
                      >
                        <div>
                          <p className="label text-ink-300 mb-0.5">Объём</p>
                          <p className="text-ink-900">{volumeLabels[volume]}</p>
                        </div>
                        <div className="text-right">
                          <p className="label text-ink-300 mb-0.5">Цена</p>
                          <p className="font-display text-2xl font-light text-ink-900">{price.toLocaleString('ru-RU')} ₽</p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="hidden" aria-hidden="true">
                          <label htmlFor="website">Website</label>
                          <input
                            id="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="label text-ink-500 block mb-2">Ваше имя *</label>
                          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" className="input-base" />
                        </div>
                        <div>
                          <label className="label text-ink-500 block mb-2">Telegram или телефон *</label>
                          <input type="text" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@username или +7 900 000-00-00" className="input-base" />
                        </div>

                        {status === 'error' && (
                          <div className="text-sm bg-cream-100 rounded-xl px-4 py-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
                            <p className="text-ink-500">{errorMsg}</p>
                            <a
                              href={TELEGRAM_DIRECT_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-gold-500 hover:text-gold-600 text-sm mt-2 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
                              </svg>
                              Написать напрямую
                            </a>
                          </div>
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
                          Заявка — не оплата. Мы свяжемся для подтверждения заказа.
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
