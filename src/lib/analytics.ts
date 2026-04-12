/**
 * analytics.ts
 *
 * Простая утилита для трекинга событий.
 * Сейчас логирует в console.debug — легко заменить на Plausible, Umami, PostHog или другой провайдер.
 *
 * Использование:
 *   trackEvent('cta_click', { label: 'hero_catalog' })
 *   trackEvent('product_view', { id: 'baccarat-rouge-540', brand: 'MFK' })
 *   trackEvent('volume_select', { volume: '5ml', price: 950 })
 *   trackEvent('order_open', { perfumeId: 'baccarat-rouge-540' })
 *   trackEvent('order_submit', { perfumeId: 'baccarat-rouge-540', volume: '5ml' })
 *   trackEvent('order_fallback', { perfumeId: 'baccarat-rouge-540' })
 */

export type EventName =
  | 'cta_click'
  | 'product_view'
  | 'volume_select'
  | 'order_open'
  | 'order_submit'
  | 'order_fallback'
  | 'catalog_filter'
  | 'catalog_search';

export type EventProps = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: EventName, props?: EventProps): void {
  if (typeof window === 'undefined') return;

  // Логируем в dev-режиме
  if (process.env.NODE_ENV === 'development') {
    console.debug('[analytics]', name, props ?? {});
  }

  // --- Подключение провайдера ---
  // Umami:
  // if (typeof window.umami !== 'undefined') {
  //   window.umami.track(name, props);
  // }

  // Plausible:
  // if (typeof window.plausible !== 'undefined') {
  //   window.plausible(name, { props });
  // }

  // PostHog:
  // if (typeof window.posthog !== 'undefined') {
  //   window.posthog.capture(name, props);
  // }
}
