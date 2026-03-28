export default function TrustSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-28">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 text-center md:text-left">

        {/* Оригиналы */}
        <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
          <div className="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ink-900">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3L4 7v5c0 4.418 3.371 8.132 8 9 4.629-.868 8-4.582 8-9V7L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="font-display text-xl font-medium text-ink-900 mb-2">Только оригиналы</h3>
            <p className="text-sm text-ink-500 leading-relaxed">
              Мы работаем исключительно с оригинальной парфюмерией от официальных дистрибьюторов.
            </p>
          </div>
        </div>

        {/* Распивы */}
        <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
          <div className="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ink-900">
              <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9 3v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 13h10M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h3 className="font-display text-xl font-medium text-ink-900 mb-2">Распивы от 2 мл</h3>
            <p className="text-sm text-ink-500 leading-relaxed">
              Разливаем из оригинальных флаконов в стерильные флаконы. Идеально для знакомства с ароматом.
            </p>
          </div>
        </div>

        {/* Доставка */}
        <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
          <div className="w-12 h-12 rounded-xl bg-cream-200 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ink-900">
              <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="font-display text-xl font-medium text-ink-900 mb-2">Быстрая доставка</h3>
            <p className="text-sm text-ink-500 leading-relaxed">
              Работаем в Ставрополе. Отправляем по всей России. Надёжная упаковка — доставим в целости.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
