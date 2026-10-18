import { useState, useEffect, useCallback } from 'react';
import { useTelegram } from '../context/TelegramContext';

export function useReminderTemplates(activeTeamId, activeUserId) {
  const { triggerHaptic } = useTelegram();
  const storageKey = activeTeamId
    ? `reminder_templates_${activeTeamId}`
    : `reminder_templates_${activeUserId || 'guest'}`;

  const [templates, setTemplates] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setTemplates(stored ? JSON.parse(stored) : []);
    } catch {
      setTemplates([]);
    }
  }, [storageKey]);

  const saveTemplate = useCallback(
    (templateData) => {
      triggerHaptic('success');
      const newTemplate = {
        id: `tpl-${Date.now()}`,
        name: templateData.title || 'Новий шаблон',
        title: templateData.title || '',
        category: templateData.category || 'main',
        description: templateData.description || '',
        remindBefore: Number(templateData.remindBefore || 0),
        repeatType: templateData.repeatType || 'none',
        items: Array.isArray(templateData.items) ? templateData.items : [],
      };

      setTemplates((prev) => {
        const updated = [newTemplate, ...prev.filter((t) => t.name !== newTemplate.name)];
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      return newTemplate;
    },
    [storageKey, triggerHaptic]
  );

  const deleteTemplate = useCallback(
    (id) => {
      triggerHaptic('medium');
      setTemplates((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    [storageKey, triggerHaptic]
  );

  return {
    templates,
    saveTemplate,
    deleteTemplate,
  };
}
