'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem, CartOrderPayload } from '@/types';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { trackEvent } from '@/lib/analytics';
import { TELEGRAM_URL } from '@/lib/constants';
import { pluralizeRu, POSITION_FORMS } from '@/lib/plural';
import { useTelegram } from '@/contexts/TelegramContext';
import {
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MIN_CONTACT_LENGTH,
  MAX_CONTACT_LENGTH,
  MIN_SUBMIT_DELAY_MS,
  CLIENT_RATE_LIMIT_MS,
  LAST_SUBMIT_KEY,
  detectSource,
  isValidName,
  isValidContact,
} from '@/lib/order';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  onSuccess: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const ORDER_WEBHOOK_URL = process.env.NEXT_PUBLIC_ORDER_WEBHOOK_URL;

function buildFallbackText(
  items: CartItem[],
  total: number,
  name: string,
  contact: string
): string {
  const lines = ['Хочу заказать (корзина):'];
  items.forEach((item) => {
    const qtyPart = item.quantity > 1 ? ` ×${item.quantity}` : '';
    const linePrice = (item.price * item.quantity).toLocaleString('ru-RU');
    lines.push(
      `• ${item.brand} — ${item.perfumeName} ${item.volumeLabel}${qtyPart} — ${linePrice} ₽`
    );
  });
  lines.push(
    `Итого: ${total.toLocaleString('ru-RU')} ₽`,
    '',
    `Имя: ${name}`,
    `Контакт: ${contact}`
  );
  return lines.join('\n');
}

export default function CartCheckoutModal({
  isOpen,
  onClose,
  items,
  total,
  onSuccess,
}: Props) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { isTelegram, user } = useTelegram();

  // В Telegram имя — из профиля, контакт = @username, если он есть.
  const tgName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '';
  const tgUsername = user?.username ? `@${user.username}` : '';
  const tgOrder = isTelegram === true && !!user;
  const tgHasContact = tgOrder && !!tgUsername;

  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && status !== 'loading') handleClose(); };
    document.addEventListener('keydown', onKey);
    // Move focus into the dialog on open (keyboard/SR users land inside it).
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      clearTimeout(t);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, status]);

  useEffect(() => {
    if (isOpen) setOpenedAt(Date.now());
    else setOpenedAt(null);
  }, [isOpen]);

  const handleClose = () => {
    if (status === 'loading') return;
    onClose();
    setTimeout(() => {
      setStatus('idle');
      setName('');
      setContact('');
      setWebsite('');
      setErrorMsg('');
      setOrderNumber(null);
    }, 400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = (tgOrder ? tgName : name).trim();
    const trimmedContact = (tgHasContact ? tgUsername : contact).trim();

    if (website.trim() !== '') { setStatus('success'); return; }
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
      setErrorMsg('Форма отправлена слишком быстро. Попробуйте ещё раз.');
      return;
    }
    const lastSubmitAt = window.localStorage.getItem(LAST_SUBMIT_KEY);
    if (lastSubmitAt && Date.now() - Number(lastSubmitAt) < CLIENT_RATE_LIMIT_MS) {
      setStatus('error');
      setErrorMsg('Повторная отправка доступна через 30 секунд.');
      return;
    }

    const payload: CartOrderPayload = {
      name: trimmedName,
      contact: trimmedContact,
      items,
      total,
      source: detectSource(),
      pageUrl: window.location.href,
      pagePath: window.location.pathname,
      timestamp: new Date().toISOString(),
      messageType: 'cart-order',
      type: 'cart',
      tgUserId: user?.id != null ? String(user.id) : undefined,
    };

    setStatus('loading');
    setErrorMsg('');

    try {
      let sent = false;
      let receivedOrderNumber: number | null = null;
      if (ORDER_WEBHOOK_URL) {
        const res = await fetch(ORDER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        sent = res.ok;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          receivedOrderNumber = typeof data.orderNumber === 'number' ? data.orderNumber : null;
        }
      }

      if (sent) {
        window.localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
        trackEvent('order_submit', { itemCount: items.length, total });
        setOrderNumber(receivedOrderNumber);
        setStatus('success');
        onSuccess();
      } else {
        const fallbackText = buildFallbackText(items, total, trimmedName, trimmedContact);
        window.open(`${TELEGRAM_URL}?text=${encodeURIComponent(fallbackText)}`, '_blank');
        trackEvent('order_fallback', { itemCount: items.length });
        setOrderNumber(null);
        setStatus('success');
        onSuccess();
      }
    } catch {
      setStatus('error');
      setErrorMsg('Не удалось отправить заявку. Попробуйте написать нам напрямую в Telegram.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Оформление заказа"
              className="w-full sm:max-w-[480px] bg-cream-50 rounded-t-3xl sm:rounded-2xl pointer-events-auto flex flex-col"
              style={{
                maxHeight: '92dvh',
                boxShadow: '0px 0px 0px 1px #e8e6dc, 0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-cream-300" />
              </div>
              <div className="overflow-y-auto flex-1">
                <div className="sticky top-0 bg-cream-50 z-10 flex justify-end px-6 pt-4 pb-1">
                  <button
                    ref={closeBtnRef}
                    onClick={handleClose}
                    className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center hover:bg-cream-200 transition-colors"
                    aria-label="Закрыть"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 1l12 12M13 1L1 13" stroke="#141413" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div
                  className="px-6 pb-8 sm:px-8"
                  style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
                >
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
                      <h3 className="font-display text-3xl font-light text-ink-900 mb-3">
                        {orderNumber != null ? `Заявка №${orderNumber} принята` : 'Заявка отправлена'}
                      </h3>
                      <div className="text-ink-500 text-sm leading-relaxed mb-8 text-left bg-cream-100 rounded-xl px-4 py-3" style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
                        <p className="mb-2">Что дальше:</p>
                        <p className="mb-1">1. Менеджер свяжется в Telegram или по телефону для подтверждения.</p>
                        <p>2. Оплата — после подтверждения (перевод или при встрече).</p>
                      </div>
                      <a
                        href={TELEGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline w-full mb-3 inline-flex items-center justify-center"
                      >
                        Написать менеджеру
                      </a>
                      <button onClick={handleClose} className="btn-primary w-full">
                        Закрыть
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <p className="label text-gold-500 mb-2">Оформить заказ</p>
                      <h3 className="font-display text-2xl font-light text-ink-900 mb-6">
                        {items.length} {pluralizeRu(items.length, POSITION_FORMS)}
                      </h3>

                      <div className="flex flex-col gap-2 mb-6">
                        {items.map((item) => (
                          <div
                            key={`${item.perfumeId}-${item.volume}`}
                            className="bg-cream-100 rounded-xl px-4 py-3 flex justify-between items-center"
                            style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-ink-900 truncate">{item.perfumeName}</p>
                              <p className="text-xs text-ink-300 truncate">
                                {item.brand} · {item.volumeLabel}
                                {item.quantity > 1 && ` · ${item.quantity} шт`}
                              </p>
                            </div>
                            <p className="font-display text-lg font-light text-ink-900 flex-shrink-0 ml-4 tabular-nums">
                              {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-1 pt-2">
                          <p className="label text-ink-500">Итого</p>
                          <p className="font-display text-2xl font-light text-ink-900">
                            {total.toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="hidden" aria-hidden="true">
                          <input
                            id="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                          />
                        </div>
                        {tgOrder ? (
                          <div
                            className="bg-cream-100 rounded-xl px-4 py-3 flex items-center justify-between"
                            style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
                          >
                            <div>
                              <p className="label text-ink-300 mb-0.5">Получатель</p>
                              <p className="text-ink-900 text-sm">
                                {tgName}{tgUsername && <span className="text-ink-300"> · {tgUsername}</span>}
                              </p>
                            </div>
                            <span className="text-xs text-gold-500">из Telegram</span>
                          </div>
                        ) : (
                          <div>
                            <label htmlFor="cart-name" className="label text-ink-500 block mb-2">Ваше имя *</label>
                            <input
                              id="cart-name"
                              type="text"
                              required
                              autoComplete="name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Как к вам обращаться"
                              className="input-base"
                            />
                          </div>
                        )}
                        {!tgHasContact && (
                          <div>
                            <label htmlFor="cart-contact" className="label text-ink-500 block mb-2">
                              Telegram или телефон *
                            </label>
                            <input
                              id="cart-contact"
                              type="text"
                              required
                              autoComplete="tel"
                              value={contact}
                              onChange={(e) => setContact(e.target.value)}
                              placeholder="@username или +7 900 000-00-00"
                              className="input-base"
                            />
                          </div>
                        )}
                        {status === 'error' && (
                          <div
                            role="alert"
                            className="text-sm bg-cream-100 rounded-xl px-4 py-3"
                            style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
                          >
                            <p className="text-ink-500">{errorMsg}</p>
                            <a
                              href={TELEGRAM_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-gold-500 text-sm mt-2 transition-colors"
                            >
                              Написать напрямую
                            </a>
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={status === 'loading'}
                          className="btn-primary w-full mt-2 disabled:opacity-50"
                        >
                          {status === 'loading' ? (
                            <span className="flex items-center gap-2">
                              <motion.span
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                              />
                              Отправляем...
                            </span>
                          ) : (
                            tgHasContact ? 'Заказать' : 'Отправить заявку'
                          )}
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
