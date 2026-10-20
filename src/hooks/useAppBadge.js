import { useEffect } from 'react';
import { isToday } from '../utils/dateUtils';

/**
 * Modern Web App Badging API hook.
 * Synchronizes browser PWA badge with pending reminders count for today.
 */
export function useAppBadge(reminders = []) {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) {
      return;
    }

    try {
      const pendingTodayCount = (reminders || []).filter(
        (r) => r?.remind_at && isToday(r.remind_at) && !r.is_sent
      ).length;

      if (pendingTodayCount > 0) {
        navigator.setAppBadge(pendingTodayCount).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    } catch (err) {
      console.warn('App badging error:', err);
    }
  }, [reminders]);
}
