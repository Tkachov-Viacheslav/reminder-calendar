import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useTelegram } from './TelegramContext';
import { LOCAL_STORAGE_KEY, LOCAL_STORAGE_CUSTOM_CATEGORIES } from '../utils/constants';

const ReminderContext = createContext(null);

export function ReminderProvider({ children }) {
  const { activeUserId, triggerHaptic } = useTelegram();
  const [reminders, setReminders] = useState([]);
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATEGORIES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());

  const loadLocalReminders = useCallback(() => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        setReminders(JSON.parse(data));
      } else {
        const initialDate = new Date();
        initialDate.setHours(initialDate.getHours() + 1, 0, 0, 0);
        const starter = [{
          id: 'starter-1',
          user_id: activeUserId || 'guest',
          title: 'Ласкаво просимо до Календаря!',
          description: 'Підключіть Telegram бот для отримання нагадувань.',
          remind_at: initialDate.toISOString(),
          category: 'main',
          is_sent: false,
          created_at: new Date().toISOString()
        }];
        setReminders(starter);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(starter));
      }
    } catch (e) {
      console.error('Failed to load local reminders', e);
    } finally {
      setLoading(false);
    }
  }, [activeUserId]);

  const fetchCategories = useCallback(async (remList) => {
    let serverCats = [];
    if (isSupabaseConfigured() && supabase && activeUserId) {
      try {
        const { data: catRows } = await supabase
          .from('user_categories')
          .select('name')
          .eq('user_id', activeUserId);
        if (catRows) {
          serverCats = catRows.map((r) => r.name);
        }
      } catch (e) {
        console.error('Failed to fetch user categories', e);
      }
    }

    const fromReminders = (remList || [])
      .map((r) => r.category)
      .filter((c) => c && c !== 'main' && c !== 'other' && c !== 'personal' && c !== 'work');

    const merged = Array.from(new Set([...serverCats, ...fromReminders]));
    if (merged.length > 0) {
      setCustomCategories(merged);
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATEGORIES, JSON.stringify(merged));
      } catch {}
    }
  }, [activeUserId]);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured() || !supabase) {
      loadLocalReminders();
      return;
    }

    try {
      let query = supabase.from('reminders').select('*').order('remind_at', { ascending: true });
      if (activeUserId) {
        query = query.eq('user_id', activeUserId);
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
  }, [activeUserId, loadLocalReminders, fetchCategories]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const addReminder = async (item) => {
    triggerHaptic('light');
    const newReminder = {
      ...item,
      id: item.id || `rem-${Date.now()}`,
      user_id: activeUserId || 'guest',
      is_sent: false,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('reminders').insert([newReminder]).select();
        if (error) throw error;
        if (data?.[0]) {
          setReminders((prev) => [...prev, data[0]]);
          return data[0];
        }
      } catch (e) {
        console.error('Error saving to Supabase, saving locally', e);
      }
    }

    setReminders((prev) => {
      const updated = [...prev, newReminder];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    return newReminder;
  };

  const updateReminder = async (id, updates) => {
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteReminder = async (id) => {
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const addCustomCategory = async (name) => {
    const trimmed = String(name || '').trim();
    if (!trimmed || customCategories.includes(trimmed)) return;

    setCustomCategories((prev) => {
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATEGORIES, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (isSupabaseConfigured() && supabase && activeUserId) {
      try {
        await supabase.from('user_categories').insert({
          user_id: activeUserId,
          name: trimmed,
        });
      } catch (e) {
        console.error('Error inserting category into Supabase', e);
      }
    }
  };

  const deleteCustomCategory = async (name) => {
    setCustomCategories((prev) => {
      const updated = prev.filter((c) => c !== name);
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATEGORIES, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (isSupabaseConfigured() && supabase && activeUserId) {
      try {
        await supabase
          .from('user_categories')
          .delete()
          .eq('user_id', activeUserId)
          .eq('name', name);
      } catch (e) {
        console.error('Error deleting category from Supabase', e);
      }
    }
  };

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
