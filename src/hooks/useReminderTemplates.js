import { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '../context/TelegramContext';
import { supabase } from '../services/supabase';

const formatDbTemplate = (row) => ({
  id: row.id,
  name: row.name || row.title || 'Шаблон',
  title: row.title || '',
  category: row.category || 'main',
  description: row.description || '',
  remindBefore: Number(row.remind_before || 0),
  repeatType: row.repeat_type || 'none',
  items: Array.isArray(row.items) ? row.items : [],
  timeStr: row.time_str || '',
  taggedMembers: Array.isArray(row.tagged_members) ? row.tagged_members : [],
  createdBy: row.created_by || '',
  updatedAt: row.updated_at || '',
  isTeam: true,
});

export function useReminderTemplates(activeTeamId, activeUserId) {
  const { triggerHaptic } = useTelegram();
  const storageKey = activeTeamId
    ? `reminder_templates_team_${activeTeamId}`
    : `reminder_templates_${activeUserId || 'guest'}`;

  const [templates, setTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load templates from Supabase for teams, or local storage for personal
  useEffect(() => {
    let isCancelled = false;

    const loadTemplates = async () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setTemplates(JSON.parse(stored));
        }
      } catch {}

      if (!activeTeamId || !supabase) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('team_templates')
          .select('*')
          .eq('team_id', activeTeamId)
          .order('updated_at', { ascending: false });

        if (!error && data && !isCancelled) {
          const formatted = data.map(formatDbTemplate);
          setTemplates(formatted);
          try {
            localStorage.setItem(storageKey, JSON.stringify(formatted));
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load team templates:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadTemplates();

    return () => {
      isCancelled = true;
    };
  }, [activeTeamId, storageKey]);

  // Save or update (overwrite) template
  const saveTemplate = useCallback(
    async (templateData, options = {}) => {
      triggerHaptic('success');
      const nowIso = new Date().toISOString();
      const templateName = (templateData.name || templateData.title || 'Новий шаблон').trim();

      const existing = templates.find(
        (t) =>
          (options.overwriteId && t.id === options.overwriteId) ||
          (templateData.id && t.id === templateData.id) ||
          t.name.trim().toLowerCase() === templateName.toLowerCase()
      );

      const targetId = existing?.id || options.overwriteId || templateData.id || `tpl-${Date.now()}`;

      const savedTemplate = {
        id: targetId,
        name: templateName,
        title: templateData.title || '',
        category: templateData.category || 'main',
        description: templateData.description || '',
        remindBefore: Number(templateData.remindBefore || 0),
        repeatType: templateData.repeatType || 'none',
        items: Array.isArray(templateData.items) ? templateData.items : [],
        timeStr: templateData.timeStr || templateData.time || '',
        taggedMembers: Array.isArray(templateData.taggedMembers) ? templateData.taggedMembers : [],
        createdBy: existing?.createdBy || activeUserId || '',
        updatedAt: nowIso,
        isTeam: Boolean(activeTeamId),
      };

      // Optimistic update
      setTemplates((prev) => {
        const filtered = prev.filter((t) => t.id !== targetId);
        const updated = [savedTemplate, ...filtered];
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Synchronize with Supabase for team templates
      if (activeTeamId && supabase) {
        try {
          const dbPayload = {
            id: targetId,
            team_id: activeTeamId,
            name: savedTemplate.name,
            title: savedTemplate.title,
            category: savedTemplate.category,
            description: savedTemplate.description,
            remind_before: savedTemplate.remindBefore,
            repeat_type: savedTemplate.repeatType,
            items: savedTemplate.items,
            time_str: savedTemplate.timeStr,
            tagged_members: savedTemplate.taggedMembers,
            created_by: savedTemplate.createdBy,
            updated_at: nowIso,
          };

          if (existing) {
            await supabase.from('team_templates').update(dbPayload).eq('id', targetId);
          } else {
            await supabase.from('team_templates').insert(dbPayload);
          }
        } catch (err) {
          console.error('Failed to sync team template with Supabase:', err);
        }
      }

      return savedTemplate;
    },
    [activeTeamId, activeUserId, storageKey, templates, triggerHaptic]
  );

  const updateTemplate = useCallback(
    (id, templateData) => saveTemplate(templateData, { overwriteId: id }),
    [saveTemplate]
  );

  const deleteTemplate = useCallback(
    async (id) => {
      triggerHaptic('medium');
      setTemplates((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (activeTeamId && supabase) {
        try {
          await supabase.from('team_templates').delete().eq('id', id).eq('team_id', activeTeamId);
        } catch (err) {
          console.error('Failed to delete team template from Supabase:', err);
        }
      }
    },
    [activeTeamId, storageKey, triggerHaptic]
  );

  return {
    templates,
    isLoading,
    isTeamTemplates: Boolean(activeTeamId),
    saveTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
