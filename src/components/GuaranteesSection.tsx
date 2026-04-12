import Link from 'next/link';

const guarantees = [
  'Покажем фото флакона, батч-код или сертификат по запросу.',
  'Распивы делаем только из оригинальных флаконов и подписываем каждый атомайзер.',
  'Перед отправкой подтверждаем объём, цену и контакт, чтобы не было сюрпризов.',
  'Если нужного аромата нет в наличии, честно скажем об этом и предложим альтернативу.',
];

export default function GuaranteesSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32">
      <div
        className="rounded-[2rem] bg-ink-900 text-cream-50 px-6 py-10 sm:px-10 md:px-14 md:py-14"
        style={{ boxShadow: '0px 0px 0px 1px #30302e' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-start">
          <div>
            <p className="label text-gold-500 mb-3">Гарантии</p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight mb-5">
              Спокойная покупка без лишних обещаний
            </h2>
            <p className="text-sm md:text-base text-cream-300 leading-relaxed max-w-md">
              Мы не играем в роскошь словами. Доверие строится на понятных деталях: происхождении флакона,
              аккуратном распиве, прозрачной коммуникации и быстрой связи в Telegram.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guarantees.map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/5 p-5"
                style={{ boxShadow: 'inset 0px 0px 0px 1px rgba(255,255,255,0.08)' }}
              >
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="mb-4 text-white/50" aria-hidden="true">
                  <path d="M1 7l5 6L17 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-sm text-cream-200 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/about" className="btn-outline bg-transparent text-cream-50 hover:bg-cream-50 hover:text-ink-900">
            Подробнее о магазине
          </Link>
          <Link href="/how-it-works" className="btn-primary">
            Как проходит заказ
          </Link>
        </div>
      </div>
    </section>
  );
}
