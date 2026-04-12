import Link from 'next/link';
import { TELEGRAM_URL } from '@/lib/constants';

export const metadata = {
  title: 'О нас',
  description: 'Кто мы такие, как работаем и почему нам можно доверять. Доставка, оплата, гарантии оригинальности.',
  openGraph: {
    title: 'О нас — HARUNGI',
    description: 'Нишевая парфюмерия в Ставрополе. Только оригиналы. Доставка, оплата, гарантии.',
  },
};

const reasons = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3L4 7v5c0 4.418 3.371 8.132 8 9 4.629-.868 8-4.582 8-9V7L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Только оригиналы',
    desc: 'Работаем исключительно с оригинальной парфюмерией. Никаких реплик, подделок и «аналогов».',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M9 3v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="15" r="2" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
    title: 'Честные распивы',
    desc: 'Разливаем из запечатанных оригинальных флаконов в чистые атомайзеры.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Без переплат',
    desc: 'Мы — небольшой магазин без аренды и большого штата. Цены честные, без накрутки.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Живая поддержка',
    desc: 'Отвечаем в Telegram быстро. Поможем с выбором, расскажем про стойкость.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Выбираете аромат',
    desc: 'Найдите понравившийся парфюм в каталоге. Читайте описание, ноты пирамиды, смотрите формат.',
  },
  {
    num: '02',
    title: 'Оставляете заявку',
    desc: 'Нажмите «Оформить заявку», укажите имя и способ связи. Никакой предоплаты.',
  },
  {
    num: '03',
    title: 'Мы связываемся',
    desc: 'Напишем вам в Telegram или позвоним, уточним детали, договоримся об оплате и доставке.',
  },
  {
    num: '04',
    title: 'Получаете заказ',
    desc: 'Отправляем по всей России. Надёжная упаковка — флакон доедет в целости.',
  },
];

const delivery = [
  {
    title: 'Ставрополь',
    desc: 'Личная доставка или самовывоз. Бесплатно.',
  },
  {
    title: 'По России',
    desc: 'Почта России или СДЭК. Стоимость зависит от региона и способа доставки.',
  },
  {
    title: 'Упаковка',
    desc: 'Каждый флакон оборачивается в пупырчатую плёнку и помещается в жёсткую коробку.',
  },
];

const payment = [
  {
    title: 'Перевод на карту',
    desc: 'Сбербанк, Тинькофф, СБП — по номеру телефона или реквизитам.',
  },
  {
    title: 'Без предоплаты',
    desc: 'На первый заказ предоплата не требуется — оплата после подтверждения.',
  },
  {
    title: 'Гарантии',
    desc: 'Если сомневаетесь в оригинальности — покажем чеки и сертификаты.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-28 md:pt-36">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Hero */}
        <div className="mb-20 md:mb-28 max-w-2xl">
          <p className="label text-gold-500 mb-4">О нас</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-light text-ink-900 leading-tight mb-6">
            Парфюмерия,<br />
            <span className="italic text-ink-500">которой можно доверять</span>
          </h1>
          <p className="text-ink-500 text-base md:text-lg leading-relaxed">
            Мы — небольшой магазин нишевой и селективной парфюмерии в Ставрополе. Продаём оригиналы и делаем распивы из оригинальных флаконов, чтобы вы могли попробовать аромат перед покупкой полной версии.
          </p>
        </div>

        {/* Reasons */}
        <section className="mb-24 md:mb-32">
          <p className="label text-gold-500 mb-3">Почему мы</p>
          <h2 className="section-title mb-12">Наши принципы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reasons.map((r) => (
              <div
                key={r.title}
                className="flex gap-5 p-8 bg-cream-50 rounded-2xl transition-all duration-200"
                style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}
              >
                <div className="w-10 h-10 rounded-xl bg-cream-200 flex items-center justify-center shrink-0 text-ink-700">
                  {r.icon}
                </div>
                <div>
                  <h3 className="font-display text-xl font-light text-ink-900 mb-2">{r.title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-24 md:mb-32">
          <p className="label text-gold-500 mb-3">Процесс</p>
          <h2 className="section-title mb-12">Как это работает</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.num}>
                <p className="font-display text-5xl font-light text-cream-300 mb-4">{s.num}</p>
                <h3 className="font-display text-xl font-light text-ink-900 mb-2">{s.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery & Payment */}
        <section className="mb-24 md:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Delivery */}
          <div>
            <p className="label text-gold-500 mb-3">Логистика</p>
            <h2 className="section-title text-2xl sm:text-3xl mb-8">Доставка</h2>
            <div className="flex flex-col gap-5">
              {delivery.map((d) => (
                <div key={d.title} className="flex gap-4 items-start">
                  <div className="w-2 h-2 bg-gold-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <h3 className="text-sm text-ink-900 mb-1">{d.title}</h3>
                    <p className="text-sm text-ink-500 leading-relaxed">{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="label text-gold-500 mb-3">Финансы</p>
            <h2 className="section-title text-2xl sm:text-3xl mb-8">Оплата и гарантии</h2>
            <div className="flex flex-col gap-5">
              {payment.map((p) => (
                <div key={p.title} className="flex gap-4 items-start">
                  <div className="w-2 h-2 bg-gold-500 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <h3 className="text-sm text-ink-900 mb-1">{p.title}</h3>
                    <p className="text-sm text-ink-500 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-cream-200 pt-16 pb-20 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-light text-ink-900 mb-2">
              Готовы попробовать?
            </h2>
            <p className="text-ink-500 text-sm">Распивы от 2 мл — минимальный риск, максимальное удовольствие.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <Link href="/catalog" className="btn-primary">
              Смотреть каталог
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 text-white text-sm font-medium px-8 py-3.5 rounded-lg transition-all duration-200 hover:opacity-90 hover:-translate-y-px tracking-widest uppercase"
              style={{ backgroundColor: '#2AABEE' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              Написать в Telegram
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
