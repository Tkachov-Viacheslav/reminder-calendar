/**
 * Telegram WebApp SDK interaction helpers
 */

export function getTelegramWebApp() {
  return window?.Telegram?.WebApp || null;
}

let isThemeListenerRegistered = false;

export function applyTelegramTheme() {
  const tg = getTelegramWebApp();
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark = tg?.colorScheme === 'dark';

  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  if (tg) {
    try {
      const isVersionAtLeast =
        typeof tg.isVersionAtLeast === 'function' ? tg.isVersionAtLeast.bind(tg) : null;

      if (isVersionAtLeast && isVersionAtLeast('6.9')) {
        tg.setHeaderColor?.(isDark ? '#0f172a' : '#ffffff');
        tg.setBackgroundColor?.(isDark ? '#020617' : '#f8fafc');
      } else if (isVersionAtLeast && isVersionAtLeast('6.1')) {
        tg.setHeaderColor?.('secondary_bg_color');
        tg.setBackgroundColor?.('bg_color');
      }
    } catch {
      // Non-critical if header/background color is unsupported
    }

    if (tg.themeParams) {
      const tp = tg.themeParams;
      if (tp.bg_color) root.style.setProperty('--tg-theme-bg-color', tp.bg_color);
      if (tp.text_color) root.style.setProperty('--tg-theme-text-color', tp.text_color);
      if (tp.hint_color) root.style.setProperty('--tg-theme-hint-color', tp.hint_color);
      if (tp.button_color) root.style.setProperty('--tg-theme-button-color', tp.button_color);
      if (tp.button_text_color) root.style.setProperty('--tg-theme-button-text-color', tp.button_text_color);
      if (tp.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', tp.secondary_bg_color);
    }
  }
}

export function initTelegramWebApp() {
  const tg = getTelegramWebApp();
  if (!tg) return null;

  try {
    tg.ready();
    tg.expand();
    applyTelegramTheme();

    if (!isThemeListenerRegistered && typeof tg.onEvent === 'function') {
      tg.onEvent('themeChanged', applyTelegramTheme);
      isThemeListenerRegistered = true;
    }
  } catch {
    // Non-critical if theme configuration fails
  }

  const tgUser = tg.initDataUnsafe?.user;
  if (!tgUser) return null;

  const username = tgUser.username || '';
  const photoUrl = tgUser.photo_url || (username ? `https://t.me/i/userpic/320/${username}.jpg` : '');

  return {
    id: String(tgUser.id),
    first_name: tgUser.first_name || '',
    username,
    photo_url: photoUrl,
  };
}

export function triggerHaptic(type = 'light') {
  try {
    const tg = getTelegramWebApp();
    if (tg?.isVersionAtLeast?.('6.1') && tg?.HapticFeedback) {
      if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  } catch {
    // Haptic feedback not supported on this device/version
  }
}

export function setClosingConfirmation(enabled) {
  try {
    const tg = getTelegramWebApp();
    if (tg?.isVersionAtLeast?.('6.2')) {
      if (enabled) {
        tg.enableClosingConfirmation();
      } else {
        tg.disableClosingConfirmation();
      }
    }
  } catch {
    // Closing confirmation not supported
  }
}

export function setupBackButton(onBack) {
  try {
    const tg = getTelegramWebApp();
    if (tg?.BackButton && tg?.isVersionAtLeast?.('6.1')) {
      tg.BackButton.show();
      const handler = () => {
        triggerHaptic('light');
        onBack();
      };
      tg.BackButton.onClick(handler);
      return () => {
        tg.BackButton.offClick(handler);
        tg.BackButton.hide();
      };
    }
  } catch {}
  return () => {};
}
