import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { setCustomCategoryColors } from '../utils/constants';

export function useCategories(activeTeamId, activeUserId) {
  const categoryStorageKey = activeTeamId
    ? `reminder_team_categories_${activeTeamId}`
    : `reminder_custom_categories_${activeUserId || 'guest'}`;

  const colorsStorageKey = `colors_${categoryStorageKey}`;

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const stored = localStorage.getItem(categoryStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [categoryColors, setCategoryColors] = useState(() => {
    try {
      const stored = localStorage.getItem(colorsStorageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      setCustomCategoryColors(parsed);
      return parsed;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const storedCats = localStorage.getItem(categoryStorageKey);
      setCustomCategories(storedCats ? JSON.parse(storedCats) : []);

      const storedColors = localStorage.getItem(colorsStorageKey);
      const parsedColors = storedColors ? JSON.parse(storedColors) : {};
      setCategoryColors(parsedColors);
      setCustomCategoryColors(parsedColors);
    } catch {
      setCustomCategories([]);
      setCategoryColors({});
    }
  }, [categoryStorageKey, colorsStorageKey]);

  const fetchCategories = useCallback(
    async (remList) => {
      let serverCats = [];
      const colorsMap = {};

      if (isSupabaseConfigured() && supabase) {
        try {
          if (activeTeamId) {
            const { data: catRows } = await supabase
              .from('team_categories')
              .select('name, color')
              .eq('team_id', activeTeamId);
            if (catRows) {
              serverCats = catRows.map((r) => r.name);
              catRows.forEach((r) => {
                if (r.color) colorsMap[r.name.toLowerCase().trim()] = r.color;
              });
            }
          } else if (activeUserId) {
            const { data: catRows } = await supabase
              .from('user_categories')
              .select('name, color')
              .eq('user_id', activeUserId);
            if (catRows) {
              serverCats = catRows.map((r) => r.name);
              catRows.forEach((r) => {
                if (r.color) colorsMap[r.name.toLowerCase().trim()] = r.color;
              });
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

      setCategoryColors((prev) => {
        const updated = { ...prev, ...colorsMap };
        setCustomCategoryColors(updated);
        try {
          localStorage.setItem(colorsStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        localStorage.setItem(categoryStorageKey, JSON.stringify(merged));
      } catch {}
    },
    [activeUserId, activeTeamId, categoryStorageKey, colorsStorageKey]
  );

  const addCustomCategory = useCallback(
    async (name, colorId = 'emerald') => {
      const cleanName = (name || '').trim();
      if (!cleanName) return;
      const key = cleanName.toLowerCase();

      setCustomCategories((prev) => {
        if (prev.includes(cleanName)) return prev;
        const updated = [...prev, cleanName];
        try {
          localStorage.setItem(categoryStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (colorId) {
        setCategoryColors((prev) => {
          const updated = { ...prev, [key]: colorId };
          setCustomCategoryColors(updated);
          try {
            localStorage.setItem(colorsStorageKey, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      if (isSupabaseConfigured() && supabase) {
        try {
          if (activeTeamId) {
            await supabase.from('team_categories').insert({
              team_id: activeTeamId,
              name: cleanName,
              color: colorId,
            });
          } else if (activeUserId) {
            await supabase.from('user_categories').insert({
              user_id: activeUserId,
              name: cleanName,
              color: colorId,
            });
          }
        } catch (e) {
          console.error('Failed to save category to Supabase', e);
        }
      }
    },
    [activeTeamId, activeUserId, categoryStorageKey, colorsStorageKey]
  );

  const updateCategoryColor = useCallback(
    async (name, colorId) => {
      const cleanName = (name || '').trim();
      if (!cleanName || !colorId) return;
      const key = cleanName.toLowerCase();

      setCategoryColors((prev) => {
        const updated = { ...prev, [key]: colorId };
        setCustomCategoryColors(updated);
        try {
          localStorage.setItem(colorsStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (isSupabaseConfigured() && supabase) {
        try {
          if (activeTeamId) {
            await supabase
              .from('team_categories')
              .update({ color: colorId })
              .eq('team_id', activeTeamId)
              .eq('name', cleanName);
          } else if (activeUserId) {
            await supabase
              .from('user_categories')
              .update({ color: colorId })
              .eq('user_id', activeUserId)
              .eq('name', cleanName);
          }
        } catch (e) {
          console.error('Failed to update category color in Supabase', e);
        }
      }
    },
    [activeTeamId, activeUserId, colorsStorageKey]
  );

  const deleteCustomCategory = useCallback(
    async (name) => {
      const cleanName = (name || '').trim();
      const key = cleanName.toLowerCase();

      setCustomCategories((prev) => {
        const updated = prev.filter((c) => c !== cleanName);
        try {
          localStorage.setItem(categoryStorageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setCategoryColors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        setCustomCategoryColors(updated);
        try {
          localStorage.setItem(colorsStorageKey, JSON.stringify(updated));
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
              .eq('name', cleanName);
          } else if (activeUserId) {
            await supabase
              .from('user_categories')
              .delete()
              .eq('user_id', activeUserId)
              .eq('name', cleanName);
          }
        } catch (e) {
          console.error('Failed to delete category from Supabase', e);
        }
      }
    },
    [activeTeamId, activeUserId, categoryStorageKey, colorsStorageKey]
  );

  return {
    customCategories,
    categoryColors,
    fetchCategories,
    addCustomCategory,
    updateCategoryColor,
    deleteCustomCategory,
  };
}
