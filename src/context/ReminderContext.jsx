import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useTelegram } from './TelegramContext';
import { useTeam } from './TeamContext';
import { useToast } from './ToastContext';
import { LOCAL_STORAGE_KEY, LOCAL_STORAGE_CUSTOM_CATEGORIES } from '../utils/constants';

const ReminderContext = createContext(null);

export function ReminderProvider({ children }) {
  const { user, activeUserId, triggerHaptic } = useTelegram();
  const { activeTeamId } = useTeam();
  const { showToast } = useToast();
  const [reminders, setReminders] = useState([]);
  const storageKey = activeTeamId ? `${LOCAL_STORAGE_KEY}_${activeTeamId}` : LOCAL_STORAGE_KEY;
  const categoryStorageKey = activeTeamId
    ? `reminder_team_categories_${activeTeamId}`
    : `reminder_custom_categories_${activeUserId || 'guest'}`;

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const stored = localStorage.getItem(categoryStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(categoryStorageKey);
      setCustomCategories(stored ? JSON.parse(stored) : []);
    } catch {
      setCustomCategories([]);
    }
  }, [categoryStorageKey]);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());

  const loadLocalReminders = useCallback(() => {
    try {
      const data = localStorage.getItem(storageKey);
      if (data) {
        setReminders(JSON.parse(data));
      } else {
        const initialDate = new Date();
        initialDate.setHours(initialDate.getHours() + 1, 0, 0, 0);
        const starter = [{
          id: `starter-${Date.now()}`,
          user_id: activeUserId || 'guest',
          team_id: activeTeamId || null,
          title: activeTeamId ? 'Ласкаво просимо до командного календаря!' : 'Ласкаво просимо до Календаря!',
          description: 'Події синхронізуються через Telegram бот.',
          remind_at: initialDate.toISOString(),
          category: 'main',
          is_sent: false,
          created_at: new Date().toISOString()
        }];
        setReminders(starter);
        localStorage.setItem(storageKey, JSON.stringify(starter));
      }
    } catch (e) {
      console.error('Failed to load local reminders', e);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, activeTeamId, storageKey]);

  const fetchCategories = useCallback(
    async (remList) => {
      let serverCats = [];
      if (isSupabaseConfigured() && supabase) {
        try {
          if (activeTeamId) {
            const { data: catRows } = await supabase
              .from('team_categories')
              .select('name')
              .eq('team_id', activeTeamId);
            if (catRows) {
              serverCats = catRows.map((r) => r.name);
            }
          } else if (activeUserId) {
            const { data: catRows } = await supabase
              .from('user_categories')
              .select('name')
              .eq('user_id', activeUserId);
            if (catRows) {
              serverCats = catRows.map((r) => r.name);
            }
          }
        } catch (e) {
          console.error('Failed to fetch categories', e);
        }
      }

      const fromReminders = (remList || [])
        .map((r) => r.category)
        .filter((c) => c && c !== 'main' && c !== 'other' && c !== 'personal' && c !== 'work');

      const merged = Array.from(new Set([...serverCats, ...fromReminders]));
      setCustomCategories(merged);
      try {
        localStorage.setItem(categoryStorageKey, JSON.stringify(merged));
      } catch {}
    },
    [activeUserId, activeTeamId, categoryStorageKey]
  );

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
      fetchCategories(list);
    } catch (err) {
      console.error('Supabase fetch error, fallback to local', err);
      loadLocalReminders();
    } finally {
      setLoading(false);
    }
  }, [activeUserId, activeTeamId, loadLocalReminders, fetchCategories]);

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

  // Realtime subscription for instant sync from Telegram bot and team members
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channelName = `realtime-reminders-${activeTeamId || activeUserId || 'guest'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders' },
        (payload) => {
          const { eventType, new: newRec, old: oldRec } = payload;
          const isCurrentScope = activeTeamId
            ? newRec?.team_id === activeTeamId || oldRec?.team_id === activeTeamId
            : (!newRec?.team_id && (!activeUserId || newRec?.user_id === activeUserId)) ||
              (!oldRec?.team_id && (!activeUserId || oldRec?.user_id === activeUserId));

          if (!isCurrentScope) return;

          if (eventType === 'INSERT' && newRec) {
            setReminders((prev) => {
              if (prev.some((r) => r.id === newRec.id)) return prev;
              return [...prev, newRec].sort(
                (a, b) => new Date(a.remind_at) - new Date(b.remind_at)
              );
            });
          } else if (eventType === 'UPDATE' && newRec) {
            setReminders((prev) =>
              prev.map((r) => (r.id === newRec.id ? { ...r, ...newRec } : r))
            );
          } else if (eventType === 'DELETE' && oldRec) {
            setReminders((prev) => prev.filter((r) => r.id !== oldRec.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeamId, activeUserId]);

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

      if (isSupabaseConfigured() && supabase) {
        try {
          const { data, error } = await supabase.from('reminders').insert([newReminder]).select();
          if (error) throw error;
          if (data?.[0]) {
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
          console.error('Error saving to Supabase, saving locally', e);
          showToast('Збережено в локальному сховищі', 'info');
        }
      }

      setReminders((prev) => {
        if (prev.some((r) => r.id === newReminder.id)) return prev;
        const updated = [...prev, newReminder].sort(
          (a, b) => new Date(a.remind_at) - new Date(b.remind_at)
        );
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
      showToast('Нагадування створено', 'success');
      return newReminder;
    },
    [activeUserId, activeTeamId, user, storageKey, triggerHaptic, showToast]
  );

  const updateReminder = useCallback(
    async (id, updates) => {
      triggerHaptic('light');
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from('reminders').update(updates).eq('id', id);
          if (error) throw error;
        } catch (e) {
          console.error('Error updating in Supabase', e);
        }
      }

      setReminders((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });

      if (updates.is_sent !== undefined) {
        showToast(updates.is_sent ? 'Позначено як виконане' : 'Повернуто в активні', 'success');
      } else if (updates.remind_at) {
        showToast('Час нагадування оновлено', 'info');
      } else {
        showToast('Зміни збережено', 'success');
      }
    },
    [storageKey, triggerHaptic, showToast]
  );

  const deleteReminder = useCallback(
    async (id) => {
      triggerHaptic('medium');
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from('reminders').delete().eq('id', id);
          if (error) throw error;
        } catch (e) {
          console.error('Error deleting from Supabase', e);
        }
      }

      setReminders((prev) => {
        const updated = prev.filter((r) => r.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
      showToast('Нагадування видалено', 'info');
    },
    [storageKey, triggerHaptic, showToast]
  );

  const addCustomCategory = useCallback(
    async (name) => {
      const trimmed = String(name || '').trim();
      if (!trimmed || customCategories.includes(trimmed)) return;

      setCustomCategories((prev) => {
        const updated = [...prev, trimmed];
        try {
          localStorage.setItem(categoryStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (isSupabaseConfigured() && supabase) {
        try {
          if (activeTeamId) {
            await supabase.from('team_categories').insert({
              team_id: activeTeamId,
              name: trimmed,
            });
          } else if (activeUserId) {
            await supabase.from('user_categories').insert({
              user_id: activeUserId,
              name: trimmed,
            });
          }
        } catch (e) {
          console.error('Error inserting category into Supabase', e);
        }
      }
    },
    [customCategories, activeUserId, activeTeamId, categoryStorageKey]
  );

  const deleteCustomCategory = useCallback(
    async (name) => {
      setCustomCategories((prev) => {
        const updated = prev.filter((c) => c !== name);
        try {
          localStorage.setItem(categoryStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (isSupabaseConfigured() && supabase) {
        try {
          if (activeTeamId) {
            await supabase
              .from('team_categories')
              .delete()
              .eq('team_id', activeTeamId)
              .eq('name', name);

            await supabase
              .from('team_category_topics')
              .delete()
              .eq('team_id', activeTeamId)
              .eq('category', String(name).toLowerCase().trim());
          } else if (activeUserId) {
            await supabase
              .from('user_categories')
              .delete()
              .eq('user_id', activeUserId)
              .eq('name', name);
          }
        } catch (e) {
          console.error('Error deleting category from Supabase', e);
        }
      }
    },
    [activeUserId, activeTeamId, categoryStorageKey]
  );

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        customCategories,
        loading,
        selectedDate,
        setSelectedDate,
        viewDate,
        setViewDate,
        addReminder,
        updateReminder,
        deleteReminder,
        addCustomCategory,
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
