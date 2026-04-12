import Link from 'next/link';
import { TELEGRAM_URL } from '@/lib/constants';

export const metadata = {
  title: 'Как мы работаем',
  description: 'Пошагово: как выбрать аромат, оформить заявку, оплатить и получить заказ HARUNGI.',
  openGraph: {
    title: 'Как мы работаем — HARUNGI',
    description: 'Понятный процесс заказа: выбор аромата, заявка, подтверждение, оплата и доставка.',
  },
};

const steps = [
  {
    title: '1. Выбираете аромат и формат',
    text: 'В каталоге можно начать с распива 2, 5 или 10 мл, либо выбрать полный флакон, если аромат уже знаком.',
  },
  {
    title: '2. Оставляете заявку',
    text: 'На карточке товара выбираете объём, указываете имя и Telegram или телефон. Это ещё не оплата.',
  },
  {
    title: '3. Мы подтверждаем детали',
    text: 'Пишем в Telegram, подтверждаем наличие, объём, стоимость, способ оплаты и формат доставки.',
  },
  {
    title: '4. Отправляем заказ',
    text: 'Упаковываем флакон или атомайзер, подписываем распив и передаём в доставку или на самовывоз.',
  },
];

const questions = [
  'Если сомневаетесь в оригинальности, покажем фото флакона, упаковки и батч-код.',
  'Если нужного аромата нет, можно написать напрямую и уточнить возможность привоза под заказ.',
  'Если аромат новый для вас, лучше начинать с 2 или 5 мл, чтобы спокойно поносить его несколько дней.',
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen pt-28 md:pt-36">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl mb-16 md:mb-20">
          <p className="label text-gold-500 mb-4">Процесс заказа</p>
          <h1 className="section-title mb-6">Как проходит заказ в HARUNGI</h1>
          <p className="text-base md:text-lg text-ink-500 leading-relaxed">
            Мы держим процесс максимально простым: помочь выбрать аромат, быстро подтвердить заявку и
            отправить заказ без лишней бюрократии.
          </p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20 md:mb-24">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl bg-cream-50 p-8"
              style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
            >
              <h2 className="font-display text-2xl font-light text-ink-900 mb-3">{step.title}</h2>
              <p className="text-sm text-ink-500 leading-relaxed">{step.text}</p>
            </article>
          ))}
        </section>

        <section className="mb-20 md:mb-24">
          <p className="label text-gold-500 mb-3">Важно знать</p>
          <h2 className="section-title text-2xl sm:text-3xl mb-8">Что мы уточняем перед отправкой</h2>
          <div className="flex flex-col gap-4">
            {questions.map((item) => (
              <div key={item} className="flex gap-4 items-start">
                <div className="w-2 h-2 bg-gold-500 rounded-full mt-1.5 shrink-0" />
                <p className="text-sm text-ink-500 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-cream-200 pt-12 pb-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-3xl font-light text-ink-900 mb-2">Готовы выбрать аромат?</h2>
            <p className="text-sm text-ink-500">Начните с каталога или напишите нам напрямую в Telegram.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/catalog" className="btn-primary">Смотреть каталог</Link>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-outline">
              Написать в Telegram
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
