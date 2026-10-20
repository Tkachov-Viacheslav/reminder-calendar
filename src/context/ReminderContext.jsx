import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useTelegram } from './TelegramContext';
import { useTeam } from './TeamContext';
import { useToast } from './ToastContext';
import { useCategories } from '../hooks/useCategories';
import { useRemindersRealtime } from '../hooks/useRemindersRealtime';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { LOCAL_STORAGE_KEY } from '../utils/constants';
import { getStorageItem, setStorageItem } from '../services/dbStorage';
import { trackUserAction } from '../services/analytics';

const ReminderContext = createContext(null);

export function ReminderProvider({ children }) {
  const { user, activeUserId, isAuthenticated, hasSession, triggerHaptic } = useTelegram();
  const { activeTeamId } = useTeam();
  const { showToast } = useToast();
  const storageKey = activeTeamId ? `${LOCAL_STORAGE_KEY}_${activeTeamId}` : LOCAL_STORAGE_KEY;

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());

  const {
    customCategories,
    categoryColors,
    fetchCategories,
    addCustomCategory,
    updateCategoryColor,
    deleteCustomCategory,
  } = useCategories(activeTeamId, activeUserId);

  const loadLocalReminders = useCallback(async () => {
    try {
      const data = await getStorageItem(storageKey);
      if (Array.isArray(data) && data.length > 0) {
        setReminders(data);
      } else {
        const initialDate = new Date();
        initialDate.setHours(initialDate.getHours() + 1, 0, 0, 0);
        const starter = [
          {
            id: `starter-${Date.now()}`,
            user_id: activeUserId || 'guest',
            team_id: activeTeamId || null,
            title: activeTeamId
              ? 'Ласкаво просимо до командного календаря!'
              : 'Ласкаво просимо до Календаря!',
            description: 'Події синхронізуються через Telegram бот.',
            remind_at: initialDate.toISOString(),
            category: 'main',
            is_sent: false,
            created_at: new Date().toISOString(),
          },
        ];
        setReminders(starter);
        setStorageItem(storageKey, starter);
      }
    } catch (e) {
      console.error('Failed to load local reminders', e);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, activeTeamId, storageKey]);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured() || !supabase) {
      loadLocalReminders();
      return;
    }

    try {
      let query = supabase.from('reminders').select('*').order('remind_at', { ascending: true });
      if (activeTeamId) {
        query = query.eq('team_id', activeTeamId);
      } else {
        query = query.is('team_id', null);
        if (activeUserId) {
          query = query.eq('user_id', activeUserId);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = data || [];
      setReminders(list);
      setStorageItem(storageKey, list);
      fetchCategories(list);
    } catch (err) {
      console.error('Supabase fetch error, fallback to local', err);
      loadLocalReminders();
    } finally {
      setLoading(false);
    }
  }, [activeUserId, isAuthenticated, activeTeamId, storageKey, loadLocalReminders, fetchCategories]);

  useEffect(() => {
    fetchReminders();

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchReminders();
      }
    };

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('online', handleSync);

    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('online', handleSync);
    };
  }, [fetchReminders]);

  // Realtime handlers with deduplication
  const handleRealtimeInsert = useCallback((newRec) => {
    setReminders((prev) => {
      if (prev.some((r) => r.id === newRec.id)) return prev;
      return [...prev, newRec].sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at));
    });
  }, []);

  const handleRealtimeUpdate = useCallback((newRec) => {
    setReminders((prev) => prev.map((r) => (r.id === newRec.id ? { ...r, ...newRec } : r)));
  }, []);

  const handleRealtimeDelete = useCallback((oldId) => {
    setReminders((prev) => prev.filter((r) => r.id !== oldId));
  }, []);

  useRemindersRealtime({
    activeTeamId,
    activeUserId,
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
  });

  const { isOnline, pendingCount, enqueueMutation } = useOfflineQueue({
    activeUserId,
    hasSession,
    onSyncSuccess: fetchReminders,
  });

  const pendingDeletesRef = useRef(new Map());

  // Запобігання втраті відкладених видалень при закритті вкладки або переході
  useEffect(() => {
    const handleBeforeUnload = () => {
      pendingDeletesRef.current.forEach(({ timeoutId, executeDelete }) => {
        clearTimeout(timeoutId);
        executeDelete();
      });
      pendingDeletesRef.current.clear();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  // Modern App Badging API: update home screen badge count
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;

    try {
      const todayStr = new Date().toDateString();
      const todayPending = reminders.filter((r) => {
        if (r.is_sent) return false;
        if (!r.remind_at) return false;
        return new Date(r.remind_at).toDateString() === todayStr;
      }).length;

      const totalBadge = todayPending + (pendingCount || 0);
      if (totalBadge > 0) {
        navigator.setAppBadge(totalBadge).catch(() => {});
      } else {
        navigator.clearAppBadge().catch(() => {});
      }
    } catch {}
  }, [reminders, pendingCount]);

  const addReminder = useCallback(
    async (item) => {
      triggerHaptic('light');
      const newReminder = {
        ...item,
        id: item.id || `rem-${Date.now()}`,
        user_id: activeUserId || 'guest',
        team_id: activeTeamId || null,
        created_by_name: user?.first_name || user?.username || '',
        is_sent: false,
        created_at: new Date().toISOString(),
      };

      let savedRemotely = false;

      if (isOnline && isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.from('reminders').insert([newReminder]).select();
          if (error) throw error;
          if (data?.[0]) {
            savedRemotely = true;
            setReminders((prev) => {
              if (prev.some((r) => r.id === data[0].id)) return prev;
              return [...prev, data[0]].sort(
                (a, b) => new Date(a.remind_at) - new Date(b.remind_at)
              );
            });
            showToast('Нагадування створено', 'success');
            return data[0];
          }
        } catch (e) {
          console.warn('Network issue saving to Supabase, queuing mutation', e);
        }
      }

      // Якщо офлайн або запит не пройшов — зберігаємо в локальну чергу на синхронізацію
      if (!savedRemotely && isSupabaseConfigured()) {
        enqueueMutation('insert', newReminder);
      }

      setReminders((prev) => {
        if (prev.some((r) => r.id === newReminder.id)) return prev;
        const updated = [...prev, newReminder].sort(
          (a, b) => new Date(a.remind_at) - new Date(b.remind_at)
        );
        setStorageItem(storageKey, updated);
        return updated;
      });

      showToast(
        !isOnline ? 'Збережено офлайн (синхронізується в мережі)' : 'Нагадування створено',
        !isOnline ? 'info' : 'success'
      );
      trackUserAction('reminder_created', {
        is_team: Boolean(activeTeamId),
        category: newReminder.category || 'main',
        is_offline: !isOnline,
      });
      return newReminder;
    },
    [activeUserId, activeTeamId, user, storageKey, isOnline, enqueueMutation, triggerHaptic, showToast]
  );

  const updateReminder = useCallback(
    async (id, updates) => {
      triggerHaptic('light');
      let updatedRemotely = false;

      if (isOnline && isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from('reminders').update(updates).eq('id', id);
          if (error) throw error;
          updatedRemotely = true;
        } catch (e) {
          console.warn('Network issue updating in Supabase, queuing mutation', e);
        }
      }

      if (!updatedRemotely && isSupabaseConfigured()) {
        enqueueMutation('update', { id, updates });
      }

      setReminders((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        setStorageItem(storageKey, updated);
        return updated;
      });

      if (updates.is_sent !== undefined) {
        showToast(updates.is_sent ? 'Позначено як виконане' : 'Повернуто в активні', 'success');
      } else if (updates.remind_at) {
        showToast('Час нагадування оновлено', 'info');
      } else {
        showToast('Зміни збережено', 'success');
      }

      trackUserAction('reminder_updated', {
        is_team: Boolean(activeTeamId),
        is_completed: updates.is_sent === true,
      });
    },
    [storageKey, isOnline, enqueueMutation, triggerHaptic, showToast]
  );

  const deleteReminder = useCallback(
    async (id) => {
      triggerHaptic('medium');
      const targetReminder = reminders.find((r) => r.id === id);
      if (!targetReminder) return;

      // Оптимістично видаляємо з локального стану
      setReminders((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        setStorageItem(storageKey, updated);
        return updated;
      });

      let wasCancelled = false;
      let deleteTimeoutId = null;

      const executeDelete = async () => {
        pendingDeletesRef.current.delete(id);
        if (wasCancelled) return;
        let deletedRemotely = false;
        if (isOnline && isSupabaseConfigured() && supabase) {
          try {
            const { error } = await supabase.from('reminders').delete().eq('id', id);
            if (error) throw error;
            deletedRemotely = true;
          } catch (e) {
            console.warn('Network issue deleting from Supabase, queuing mutation', e);
          }
        }
        if (!deletedRemotely && isSupabaseConfigured()) {
          enqueueMutation('delete', { id });
        }
        trackUserAction('reminder_deleted', { is_team: Boolean(activeTeamId) });
      };

      // Даємо 5 секунд на скасування видалення (Undo)
      deleteTimeoutId = setTimeout(executeDelete, 5000);
      pendingDeletesRef.current.set(id, { timeoutId: deleteTimeoutId, executeDelete });

      showToast(
        `Нагадування «${targetReminder.title}» видалено`,
        'info',
        5000,
        {
          label: '↩️ Скасувати',
          onClick: () => {
            wasCancelled = true;
            clearTimeout(deleteTimeoutId);
            pendingDeletesRef.current.delete(id);
            triggerHaptic('success');
            setReminders((prev) => {
              if (prev.some((r) => r.id === id)) return prev;
              const restored = [...prev, targetReminder].sort(
                (a, b) => new Date(a.remind_at) - new Date(b.remind_at)
              );
              setStorageItem(storageKey, restored);
              return restored;
            });
            showToast('Нагадування відновлено', 'success');
          },
        }
      );
    },
    [reminders, storageKey, isOnline, enqueueMutation, triggerHaptic, showToast]
  );

  const clearCompletedReminders = useCallback(
    async (ids) => {
      if (!Array.isArray(ids) || ids.length === 0) return;
      triggerHaptic('medium');
      const idsSet = new Set(ids);

      setReminders((prev) => {
        const updated = prev.filter((r) => !idsSet.has(r.id));
        setStorageItem(storageKey, updated);
        return updated;
      });

      let clearedRemotely = false;
      if (isOnline && isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from('reminders').delete().in('id', ids);
          if (!error) clearedRemotely = true;
        } catch (e) {
          console.warn('Network issue clearing completed from Supabase', e);
        }
      }

      if (!clearedRemotely && isSupabaseConfigured()) {
        ids.forEach((id) => enqueueMutation('delete', { id }));
      }

      showToast(`Очищено ${ids.length} виконаних нагадувань`, 'success');
    },
    [storageKey, isOnline, enqueueMutation, triggerHaptic, showToast]
  );

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        customCategories,
        categoryColors,
        loading,
        isOnline,
        pendingSyncCount: pendingCount,
        selectedDate,
        setSelectedDate,
        viewDate,
        setViewDate,
        addReminder,
        updateReminder,
        deleteReminder,
        clearCompletedReminders,
        addCustomCategory,
        updateCategoryColor,
        deleteCustomCategory,
        refreshReminders: fetchReminders,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within ReminderProvider');
  }
  return context;
}
