// src/lib/admin/session.ts
// Подпись/проверка сессионной cookie через HMAC-SHA256 (Web Crypto — работает
// и в Node Route Handlers, и в Edge middleware). Формат токена: "<exp>.<hexsig>",
// где exp — unix-секунды протухания, sig = HMAC(secret, exp).

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Токен с протуханием через ttlSeconds от текущего момента. */
export async function signSession(secret: string, ttlSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmacHex(secret, String(exp));
  return `${exp}.${sig}`;
}

/** true, если подпись валидна и срок не истёк. Любой сбой → false. */
export async function verifySession(secret: string, token: string): Promise<boolean> {
  try {
    if (!token || !token.includes('.')) return false;
    const [expStr, sig] = token.split('.');
    const exp = Number(expStr);
    if (!Number.isFinite(exp)) return false;
    if (Math.floor(Date.now() / 1000) > exp) return false;
    const expected = await hmacHex(secret, expStr);
    // Сравнение фиксированной длины (constant-ish).
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 3600; // 7 дней
