// src/app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/admin/session';

const PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.ADMIN_SESSION_SECRET;

/** Константное по времени сравнение строк. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  if (!PASSWORD || !SECRET) {
    return NextResponse.json({ ok: false, error: 'Сервер не настроен' }, { status: 500 });
  }
  let body: { password?: string };
  try { body = await req.json(); } catch { body = {}; }
  const password = String(body.password ?? '');
  if (!timingSafeEqual(password, PASSWORD)) {
    return NextResponse.json({ ok: false, error: 'Неверный пароль' }, { status: 401 });
  }
  const token = await signSession(SECRET, SESSION_TTL_SECONDS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
