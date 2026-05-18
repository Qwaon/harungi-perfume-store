export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 60;
export const MIN_CONTACT_LENGTH = 4;
export const MAX_CONTACT_LENGTH = 80;
export const MIN_SUBMIT_DELAY_MS = 1500;
export const CLIENT_RATE_LIMIT_MS = 30_000;
export const LAST_SUBMIT_KEY = 'harungi-last-order-submit-at';

export function detectSource(): string {
  if (typeof window === 'undefined') return 'unknown';
  const params = new URLSearchParams(window.location.search);
  const rawUtm = params.get('utm_source') ?? '';
  const utmSource = rawUtm.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  if (utmSource) return `utm:${utmSource}`;
  if (document.referrer) {
    try {
      return `ref:${new URL(document.referrer).hostname.replace(/^www\./, '')}`;
    } catch {
      return 'ref:unknown';
    }
  }
  return 'direct';
}

export function isValidName(value: string): boolean {
  const t = value.trim();
  return t.length >= MIN_NAME_LENGTH && t.length <= MAX_NAME_LENGTH;
}

export function isValidContact(value: string): boolean {
  const t = value.trim();
  if (t.length < MIN_CONTACT_LENGTH || t.length > MAX_CONTACT_LENGTH) return false;
  return (
    /^@?[a-zA-Z0-9_]{4,32}$/.test(t) ||
    (/^\+?[0-9\s\-()]{7,20}$/.test(t) && t.replace(/\D/g, '').length >= 7)
  );
}
