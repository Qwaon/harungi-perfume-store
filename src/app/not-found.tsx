import Link from 'next/link';

export const metadata = {
  title: '404 — Страница не найдена | HARUNGI',
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="label text-gold-500 mb-4">404</p>
      <h1 className="font-display text-5xl md:text-7xl font-light text-ink-900 mb-6">
        Страница не найдена
      </h1>
      <p className="text-ink-500 text-base mb-10 max-w-sm leading-relaxed">
        Такой страницы не существует. Возможно, она была перемещена или удалена.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/" className="btn-primary">
          На главную
        </Link>
        <Link href="/catalog" className="btn-outline">
          Каталог
        </Link>
      </div>
    </div>
  );
}
