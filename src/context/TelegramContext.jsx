import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  initTelegramWebApp,
  getTelegramInitData,
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
  verifyInitDataWithApi,
  verifyTelegramAuthWithApi,
  healTelegramUserId,
} from '../services/authService';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const TelegramContext = createContext(null);

export function TelegramProvider({ children }) {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [hasSession, setHasSession] = useState(() => {
    if (!isSupabaseConfigured() || !supabase) return true;
    return false;
  });

  const loginWithTelegram = useCallback(async (authResult) => {
    triggerHaptic('light');
    try {
      const result = await verifyTelegramAuthWithApi(authResult);
      if (result.success && result.user) {
        setUser(result.user);
        saveStoredUser(result.user);
        setHasSession(true);
        triggerHaptic('success');
        return result;
      }

      const formattedUser = formatTelegramUser(authResult);
      if (formattedUser) {
        setUser(formattedUser);
        saveStoredUser(formattedUser);
      }
      triggerHaptic('error');
      return result;
    } catch {
      triggerHaptic('error');
      return { success: false, error: 'Помилка мережі при перевірці Telegram авторизації' };
    }
  }, []);

  const loginWithCode = useCallback(async (code) => {
    triggerHaptic('light');
    try {
      const result = await verifyAuthCodeWithApi(code);
      if (result.success && result.user) {
        setUser(result.user);
        saveStoredUser(result.user);
        setHasSession(true);
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
    setHasSession(false);
    clearStoredAuth();
  }, []);

  // 1. Initialise Telegram WebApp or parse magic link auth parameter
  useEffect(() => {
    const tmaUser = initTelegramWebApp();
    if (tmaUser) {
      setIsInTelegram(true);
      setUser(tmaUser);
      saveStoredUser(tmaUser);

      // Безпечна криптографічна валідація initData на бекенді
      const rawInitData = getTelegramInitData();
      if (rawInitData) {
        verifyInitDataWithApi(rawInitData).then((res) => {
          if (res.success && res.user) {
            setUser(res.user);
            saveStoredUser(res.user);
          }
        });
      }
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

  // 3. Синхронізація сесії Supabase Auth
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setHasSession(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setHasSession(Boolean(session));
      if (event === 'SIGNED_OUT') {
        setUser(null);
        clearStoredAuth();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const activeUserId = user?.id ? String(user.id) : null;
  const isAuthenticated = Boolean(activeUserId && (isInTelegram || hasSession));

  return (
    <TelegramContext.Provider
      value={{
        isInTelegram,
        user,
        isAuthenticated,
        hasSession,
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
