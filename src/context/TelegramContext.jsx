import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LOCAL_STORAGE_USER } from '../utils/constants';

const TelegramContext = createContext(null);

export function TelegramProvider({ children }) {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const triggerHaptic = (type = 'light') => {
    try {
      const tg = window?.Telegram?.WebApp;
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
  };

  const loginWithTelegram = useCallback((authResult) => {
    if (!authResult) return { success: false, error: 'Дані користувача відсутні' };
    const u = authResult.user || authResult;
    const userId = u.sub || u.id;
    if (!userId) return { success: false, error: authResult.error || 'ID користувача відсутній' };

    const username = u.preferred_username || u.username || '';
    const photoUrl = u.picture || u.photo_url || (username ? `https://t.me/i/userpic/320/${username}.jpg` : '');

    const formattedUser = {
      id: String(userId),
      first_name: u.name || u.first_name || '',
      username,
      photo_url: photoUrl,
    };
    setUser(formattedUser);
    localStorage.setItem(LOCAL_STORAGE_USER, JSON.stringify(formattedUser));
    triggerHaptic('success');
    return { success: true, user: formattedUser };
  }, []);

  const loginWithCode = useCallback(async (code) => {
    triggerHaptic('light');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dwzswscabsphwprptnos.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const headers = { 'Content-Type': 'application/json' };
      if (anonKey) {
        headers['apikey'] = anonKey;
        headers['Authorization'] = `Bearer ${anonKey}`;
      }
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-code`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: String(code).trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.user) {
        const u = data.user;
        const photoUrl = u.photo_url || (u.username ? `https://t.me/i/userpic/320/${u.username}.jpg` : '');
        const formattedUser = { ...u, photo_url: photoUrl };
        setUser(formattedUser);
        localStorage.setItem(LOCAL_STORAGE_USER, JSON.stringify(formattedUser));
        triggerHaptic('success');
        return { success: true, user: formattedUser };
      }
      triggerHaptic('error');
      return { success: false, error: data.error || 'Невірний код' };
    } catch (err) {
      triggerHaptic('error');
      return { success: false, error: 'Помилка мережі при перевірці коду' };
    }
  }, []);

  const logout = () => {
    triggerHaptic('medium');
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER);
  };

  const setClosingConfirmation = useCallback((enabled) => {
    try {
      const tg = window?.Telegram?.WebApp;
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
  }, []);

  useEffect(() => {
    // 1. Check if running inside Telegram Mini App
    const tg = window?.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      setIsInTelegram(true);
      tg.ready();
      tg.expand();

      try {
        tg.setHeaderColor?.('#0f172a');
        tg.setBackgroundColor?.('#020617');
      } catch {}

      const tgU = tg.initDataUnsafe.user;
      const photoUrl =
        tgU.photo_url || (tgU.username ? `https://t.me/i/userpic/320/${tgU.username}.jpg` : '');
      const tmaUser = {
        id: String(tgU.id),
        first_name: tgU.first_name,
        username: tgU.username,
        photo_url: photoUrl,
      };
      setUser(tmaUser);
      localStorage.setItem(LOCAL_STORAGE_USER, JSON.stringify(tmaUser));
      return;
    }

    // 2. Check 1-click magic link: ?auth=123456
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get('auth');
    if (authCode) {
      loginWithCode(authCode).then((res) => {
        if (res.success) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      });
    }
  }, [loginWithCode]);

  const activeUserId = user?.id ? String(user.id) : null;

  return (
    <TelegramContext.Provider
      value={{
        isInTelegram,
        user,
        isAuthenticated: Boolean(activeUserId),
        activeUserId,
        loginWithCode,
        loginWithTelegram,
        logout,
        triggerHaptic,
        setClosingConfirmation,
      }}
    >
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
}
