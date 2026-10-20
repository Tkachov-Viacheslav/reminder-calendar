import * as Sentry from '@sentry/react';
import { track } from '@vercel/analytics';

export interface UserContext {
  id?: string | number;
  username?: string;
  first_name?: string;
}

/**
 * Прив'язує користувача до аналітики та сесійних трейсів
 */
export function setAnalyticsUser(user: UserContext | null, platform = 'web'): void {
  try {
    if (user?.id) {
      const idStr = String(user.id);
      Sentry.setUser({
        id: idStr,
        username: user.username || undefined,
      });
      Sentry.setTag('platform', platform);
      Sentry.setTag('user_id', idStr);
    } else {
      Sentry.setUser(null);
    }
  } catch {}
}

/**
 * Відправляє кастомну подію одночасно до Vercel Analytics та Sentry
 */
export function trackUserAction(
  action: string,
  properties: Record<string, string | number | boolean> = {}
): void {
  try {
    // 1. Подія для дашборду Vercel Analytics
    track(action, properties);

    // 2. Хлібні крихти та метрики для Sentry
    Sentry.addBreadcrumb({
      category: 'user.action',
      message: action,
      data: properties,
      level: 'info',
    });

    if (Sentry.metrics && typeof Sentry.metrics.count === 'function') {
      Sentry.metrics.count(`action.${action}`, 1, {
        attributes: properties,
      });
    }
  } catch {}
}

/**
 * Фіксує час виконання критичних операцій (тривалість у мілісекундах)
 */
export function trackTiming(
  name: string,
  durationMs: number,
  attributes: Record<string, string | number | boolean> = {}
): void {
  try {
    if (Sentry.metrics && typeof Sentry.metrics.distribution === 'function') {
      Sentry.metrics.distribution(`duration.${name}`, durationMs, {
        unit: 'millisecond',
        attributes,
      });
    }
  } catch {}
}
