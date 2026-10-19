import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useTelegram } from '../context/TelegramContext';
import { useToast } from '../context/ToastContext';

export function useTeamTopics(activeTeamId) {
  const { triggerHaptic } = useTelegram();
  const { showToast } = useToast();

  const [teamTopics, setTeamTopics] = useState([]);
  const [categoryTopics, setCategoryTopics] = useState({});

  const resetTopics = useCallback(() => {
    setTeamTopics([]);
    setCategoryTopics({});
  }, []);

  const fetchTopicsAndMappings = useCallback(async (teamId = activeTeamId) => {
    if (!teamId || !supabase) {
      resetTopics();
      return;
    }

    try {
      // 1. Fetch team topics
      const { data: topics } = await supabase
        .from('team_topics')
        .select('*')
        .eq('team_id', teamId)
        .order('name', { ascending: true });

      setTeamTopics(topics || []);

      // 2. Fetch category topics mapping
      const { data: mappings } = await supabase
        .from('team_category_topics')
        .select('*')
        .eq('team_id', teamId);

      const mapObj = {};
      (mappings || []).forEach((m) => {
        mapObj[m.category] = m.thread_id;
      });

      setCategoryTopics((prev) => {
        const prevKeys = Object.keys(prev || {});
        const newKeys = Object.keys(mapObj);
        if (prevKeys.length !== newKeys.length) return mapObj;
        for (const k of newKeys) {
          if (prev[k] !== mapObj[k]) return mapObj;
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to fetch team topics and mappings:', err);
    }
  }, [activeTeamId, resetTopics]);

  const setCategoryTopicMapping = useCallback(
    async (category, threadId) => {
      if (!activeTeamId || !supabase) return;
      triggerHaptic('light');
      const cleanCat = String(category).toLowerCase().trim();
      const isGeneral = !threadId || threadId === '0' || Number(threadId) === 0;

      try {
        if (isGeneral) {
          await supabase
            .from('team_category_topics')
            .delete()
            .eq('team_id', activeTeamId)
            .eq('category', cleanCat);

          setCategoryTopics((prev) => {
            const next = { ...prev };
            delete next[cleanCat];
            return next;
          });
        } else {
          await supabase.from('team_category_topics').upsert(
            {
              team_id: activeTeamId,
              category: cleanCat,
              thread_id: Number(threadId),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'team_id,category' }
          );
          setCategoryTopics((prev) => ({ ...prev, [cleanCat]: Number(threadId) }));
        }
        showToast('Прив’язку теми збережено', 'success');
      } catch (err) {
        console.error('Failed to set category topic mapping:', err);
        showToast('Помилка збереження теми', 'error');
      }
    },
    [activeTeamId, triggerHaptic, showToast]
  );

  const addTeamTopic = useCallback(
    async (name, threadId) => {
      if (!activeTeamId || !supabase) return;
      triggerHaptic('light');

      try {
        const { data, error } = await supabase
          .from('team_topics')
          .upsert(
            {
              team_id: activeTeamId,
              thread_id: Number(threadId),
              name: name.trim(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'team_id,thread_id' }
          )
          .select()
          .single();

        if (error) throw error;

        setTeamTopics((prev) => {
          const filtered = prev.filter((t) => t.thread_id !== Number(threadId));
          return [...filtered, data].sort((a, b) => a.name.localeCompare(b.name));
        });
        showToast('Тему додано', 'success');
      } catch (err) {
        console.error('Failed to add team topic:', err);
        showToast('Помилка додавання теми', 'error');
      }
    },
    [activeTeamId, triggerHaptic, showToast]
  );

  const deleteTeamTopic = useCallback(
    async (topicId) => {
      if (!activeTeamId || !supabase) return;
      triggerHaptic('light');

      try {
        const { error } = await supabase.from('team_topics').delete().eq('id', topicId);
        if (error) throw error;
        setTeamTopics((prev) => prev.filter((t) => t.id !== topicId));
        showToast('Тему видалено', 'info');
      } catch (err) {
        console.error('Failed to delete team topic:', err);
        showToast('Помилка видалення теми', 'error');
      }
    },
    [activeTeamId, triggerHaptic, showToast]
  );

  return {
    teamTopics,
    categoryTopics,
    fetchTopicsAndMappings,
    setCategoryTopicMapping,
    addTeamTopic,
    deleteTeamTopic,
    resetTopics,
  };
}
