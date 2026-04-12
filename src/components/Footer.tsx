import Link from 'next/link';
import { TELEGRAM_URL } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-ink-900 text-cream-300" style={{ borderTop: '1px solid #30302e' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
        {/* Brand */}
        <div>
          <p className="font-display text-3xl font-light tracking-[0.2em] text-white mb-4">
            HARUNGI
          </p>
          <p className="text-sm text-ink-300 leading-relaxed max-w-xs">
            Нишевая и селективная парфюмерия. Оригиналы и распивы от 2 мл. Только настоящие ароматы.
          </p>
        </div>

        {/* Links */}
        <div>
          <p className="label text-ink-300 mb-5">Навигация</p>
          <div className="flex flex-col gap-3">
            <Link href="/" className="text-sm text-cream-200 hover:text-white transition-colors duration-200">
              Главная
            </Link>
            <Link href="/catalog" className="text-sm text-cream-200 hover:text-white transition-colors duration-200">
              Каталог
            </Link>
            <Link href="/about" className="text-sm text-cream-200 hover:text-white transition-colors duration-200">
              О нас
            </Link>
            <Link href="/how-it-works" className="text-sm text-cream-200 hover:text-white transition-colors duration-200">
              Как мы работаем
            </Link>
            <Link href="/faq" className="text-sm text-cream-200 hover:text-white transition-colors duration-200">
              FAQ
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <p className="label text-ink-300 mb-5">Контакты</p>
          <div className="flex flex-col gap-3">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 text-white text-sm font-medium px-5 py-3 rounded-xl transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-lg w-fit"
              style={{ backgroundColor: '#2AABEE' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/>
              </svg>
              Написать нам
            </a>
            <p className="text-sm text-ink-300 leading-relaxed">
              Принимаем заявки на заказ.<br />Ставрополь и доставка по всей России.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-700 max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <p className="text-xs text-ink-500">
          © {new Date().getFullYear()} HARUNGI. Все права защищены.
        </p>
        <p className="text-xs text-ink-500">
          Только оригинальная парфюмерия
        </p>
      </div>
    </footer>
  );
}
