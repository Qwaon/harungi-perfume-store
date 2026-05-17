import Link from 'next/link';

const STEPS = [
  {
    num: '01',
    title: 'Выберите аромат',
    desc: 'Откройте каталог, используйте фильтры по типу, полу или бренду.',
  },
  {
    num: '02',
    title: 'Добавьте в корзину',
    desc: 'Выберите объём — от 5 мл. Можно добавить несколько ароматов.',
  },
  {
    num: '03',
    title: 'Оставьте заявку',
    desc: 'Укажите имя и Telegram или телефон. Никакой предоплаты.',
  },
  {
    num: '04',
    title: 'Получите заказ',
    desc: 'Мы свяжемся для подтверждения. Доставка по России или самовывоз в Ставрополе.',
  },
];

export default function HowToOrder() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
      <div className="flex items-baseline justify-between mb-10">
        <h2 className="section-title">Как заказать</h2>
        <Link href="/catalog" className="text-sm text-gold-500 hover:text-ink-900 transition-colors duration-200">
          В каталог →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {STEPS.map((step) => (
          <div key={step.num} className="flex flex-col gap-3">
            <span className="font-display text-4xl font-light text-cream-300">{step.num}</span>
            <h3 className="font-medium text-ink-900 text-sm tracking-wide">{step.title}</h3>
            <p className="text-xs text-ink-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
