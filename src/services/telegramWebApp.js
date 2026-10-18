/**
 * Telegram WebApp SDK interaction helpers
 */

export function getTelegramWebApp() {
  return window?.Telegram?.WebApp || null;
}

export function initTelegramWebApp() {
  const tg = getTelegramWebApp();
  if (!tg) return null;

  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#0f172a');
    tg.setBackgroundColor?.('#020617');

    if (tg.themeParams && typeof document !== 'undefined') {
      const root = document.documentElement;
      const tp = tg.themeParams;
      if (tp.bg_color) root.style.setProperty('--tg-theme-bg-color', tp.bg_color);
      if (tp.text_color) root.style.setProperty('--tg-theme-text-color', tp.text_color);
      if (tp.hint_color) root.style.setProperty('--tg-theme-hint-color', tp.hint_color);
      if (tp.button_color) root.style.setProperty('--tg-theme-button-color', tp.button_color);
      if (tp.button_text_color) root.style.setProperty('--tg-theme-button-text-color', tp.button_text_color);
      if (tp.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', tp.secondary_bg_color);
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
