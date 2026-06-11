// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/admin/session';

const SECRET = process.env.ADMIN_SESSION_SECRET;

// Пути, доступные без сессии (иначе не войти).
const PUBLIC_PATHS = ['/admin/login', '/api/admin/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value ?? '';
  const ok = SECRET ? await verifySession(SECRET, token) : false;
  if (ok) return NextResponse.next();

  // API → 401 JSON; страницы → редирект на логин.
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
