const TRUST_ITEMS = [
  'Оригиналы с гарантией',
  'Распивы от 5 мл',
  'Доставка по России',
  'Заказ через Telegram',
];

export default function TrustStrip() {
  return (
    <div className="bg-cream-100 border-t border-cream-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {TRUST_ITEMS.map((item) => (
          <span key={item} className="flex items-center gap-2 text-xs text-ink-500 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
