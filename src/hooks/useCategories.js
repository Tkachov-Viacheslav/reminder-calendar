import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useCategories(activeTeamId, activeUserId) {
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
        .filter((c) => c && !['main', 'other', 'personal', 'work'].includes(c));

      const merged = Array.from(new Set([...serverCats, ...fromReminders]));
      setCustomCategories(merged);
      try {
        localStorage.setItem(categoryStorageKey, JSON.stringify(merged));
      } catch {}
    },
    [activeUserId, activeTeamId, categoryStorageKey]
  );

  const addCustomCategory = useCallback(
    async (name) => {
      const cleanName = (name || '').trim();
      if (!cleanName) return;

      setCustomCategories((prev) => {
        if (prev.includes(cleanName)) return prev;
        const updated = [...prev, cleanName];
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
              name: cleanName,
            });
          } else if (activeUserId) {
            await supabase.from('user_categories').insert({
              user_id: activeUserId,
              name: cleanName,
            });
          }
        } catch (e) {
          console.error('Failed to save category to Supabase', e);
        }
      }
    },
    [activeTeamId, activeUserId, categoryStorageKey]
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
          } else if (activeUserId) {
            await supabase
              .from('user_categories')
              .delete()
              .eq('user_id', activeUserId)
              .eq('name', name);
          }
        } catch (e) {
          console.error('Failed to delete category from Supabase', e);
        }
      }
    },
    [activeTeamId, activeUserId, categoryStorageKey]
  );

  return {
    customCategories,
    fetchCategories,
    addCustomCategory,
    deleteCustomCategory,
  };
}
