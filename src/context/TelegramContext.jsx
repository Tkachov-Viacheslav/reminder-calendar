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
    const tg = window?.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'success' || type === 'error' || type === 'warning') {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  };

  const loginWithCode = useCallback(async (code) => {
    triggerHaptic('light');
    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: String(code).trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.user) {
        setUser(data.user);
        localStorage.setItem(LOCAL_STORAGE_USER, JSON.stringify(data.user));
        triggerHaptic('success');
        return { success: true, user: data.user };
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

  useEffect(() => {
    // 1. Check if running inside Telegram Mini App
    const tg = window?.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      setIsInTelegram(true);
      tg.ready();
      tg.expand();
      const tgU = tg.initDataUnsafe.user;
      const tmaUser = { id: String(tgU.id), first_name: tgU.first_name, username: tgU.username };
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
        logout,
        triggerHaptic,
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
