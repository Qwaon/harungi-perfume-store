const TRUST_ITEMS = [
  {
    label: 'Оригиналы с гарантией',
    icon: (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: 'Распивы от 5 мл',
    icon: (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" />
        <circle cx="12" cy="9" r="2" />
      </svg>
    ),
  },
  {
    label: 'Доставка по России',
    icon: (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    label: 'Заказ через Telegram',
    icon: (
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <div className="bg-cream-100 border-t border-cream-200">
      {/* На узких экранах — ровная сетка 2×2 (иначе flex-wrap даёт рваные,
          по-разному центрированные ряды). С sm — единый ряд по центру. */}
      <div className="trust-strip max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:gap-y-2">
        {TRUST_ITEMS.map((item) => (
          <span key={item.label} className="flex items-center gap-2 text-xs text-ink-500 tracking-wide">
            <span className="text-gold-500 shrink-0">{item.icon}</span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
