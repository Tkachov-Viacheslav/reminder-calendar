import { useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export function useRemindersRealtime({ activeTeamId, activeUserId, onInsert, onUpdate, onDelete }) {
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
            onInsert(newRec);
          } else if (eventType === 'UPDATE' && newRec) {
            onUpdate(newRec);
          } else if (eventType === 'DELETE' && oldRec) {
            onDelete(oldRec.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeamId, activeUserId, onInsert, onUpdate, onDelete]);
}
