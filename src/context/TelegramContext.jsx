import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  initTelegramWebApp,
  triggerHaptic,
  setClosingConfirmation,
  setupBackButton,
} from '../services/telegramWebApp';
import {
  getStoredUser,
  saveStoredUser,
  clearStoredAuth,
  formatTelegramUser,
  verifyAuthCodeWithApi,
  healTelegramUserId,
} from '../services/authService';

const TelegramContext = createContext(null);

export function TelegramProvider({ children }) {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());

  const loginWithTelegram = useCallback((authResult) => {
    const formattedUser = formatTelegramUser(authResult);
    if (!formattedUser) {
      return { success: false, error: authResult?.error || 'ID користувача відсутній' };
    }

    setUser(formattedUser);
    saveStoredUser(formattedUser);
    triggerHaptic('success');
    return { success: true, user: formattedUser };
  }, []);

  const loginWithCode = useCallback(async (code) => {
    triggerHaptic('light');
    try {
      const result = await verifyAuthCodeWithApi(code);
      if (result.success && result.user) {
        setUser(result.user);
        saveStoredUser(result.user);
        triggerHaptic('success');
        return result;
      }
      triggerHaptic('error');
      return result;
    } catch {
      triggerHaptic('error');
      return { success: false, error: 'Помилка мережі при перевірці коду' };
    }
  }, []);

  const logout = useCallback(() => {
    triggerHaptic('medium');
    setUser(null);
    clearStoredAuth();
  }, []);

  // 1. Initialise Telegram WebApp or parse magic link auth parameter
  useEffect(() => {
    const tmaUser = initTelegramWebApp();
    if (tmaUser) {
      setIsInTelegram(true);
      setUser(tmaUser);
      saveStoredUser(tmaUser);
      return;
    }

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

  // 2. Heal user ID if it is a long temporary ID
  useEffect(() => {
    if (!user) return;
    healTelegramUserId(user).then((healed) => {
      if (healed) {
        setUser(healed);
        saveStoredUser(healed);
      }
    });
  }, [user]);

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
        setupBackButton,
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
