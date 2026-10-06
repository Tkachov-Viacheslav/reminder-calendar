import React, { createContext, useContext, useEffect, useState } from 'react';
import { LOCAL_STORAGE_CHAT_ID } from '../utils/constants';

const TelegramContext = createContext(null);

export function TelegramProvider({ children }) {
  const [isInTelegram, setIsInTelegram] = useState(false);
  const [tgUser, setTgUser] = useState(null);
  const [manualChatId, setManualChatId] = useState(() => {
    return localStorage.getItem(LOCAL_STORAGE_CHAT_ID) || '';
  });

  useEffect(() => {
    const tg = window?.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0) {
      setIsInTelegram(true);
      tg.ready();
      tg.expand();

      if (tg.initDataUnsafe.user) {
        setTgUser(tg.initDataUnsafe.user);
      }
    }
  }, []);

  const saveManualChatId = (id) => {
    const cleanId = String(id).trim();
    setManualChatId(cleanId);
    if (cleanId) {
      localStorage.setItem(LOCAL_STORAGE_CHAT_ID, cleanId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_CHAT_ID);
    }
  };

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

  const activeUserId = tgUser?.id ? String(tgUser.id) : manualChatId;

  return (
    <TelegramContext.Provider
      value={{
        isInTelegram,
        tgUser,
        manualChatId,
        saveManualChatId,
        activeUserId,
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
