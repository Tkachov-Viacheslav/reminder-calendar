import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { useTelegram } from './TelegramContext';
import { useToast } from './ToastContext';
import { LOCAL_STORAGE_ACTIVE_TEAM } from '../utils/constants';

const TeamContext = createContext(null);

export function TeamProvider({ children }) {
  const { user, activeUserId, triggerHaptic } = useTelegram();
  const { showToast } = useToast();
  const [userTeams, setUserTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTeam = params.get('team');
      if (urlTeam) return urlTeam;
      return localStorage.getItem(LOCAL_STORAGE_ACTIVE_TEAM) || null;
    } catch {
      return null;
    }
  });
  const [currentTeam, setCurrentTeam] = useState(null);
  const [userRole, setUserRole] = useState('owner');
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamTopics, setTeamTopics] = useState([]);
  const [categoryTopics, setCategoryTopics] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchUserTeams = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !activeUserId) {
      setUserTeams([]);
      return;
    }
    try {
      const { data: memberRows, error } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('telegram_id', activeUserId)
        .neq('role', 'blocked');

      if (error) throw error;
      const teams = (memberRows || [])
        .map((m) => (m.teams ? { ...m.teams, userRole: m.role } : null))
        .filter(Boolean);
      setUserTeams(teams);
    } catch (err) {
      console.error('Failed to fetch user teams:', err);
    }
  }, [activeUserId]);

  const fetchCurrentTeamData = useCallback(async () => {
    if (!activeTeamId || !isSupabaseConfigured() || !supabase) {
      setCurrentTeam(null);
      setUserRole('owner');
      setTeamMembers([]);
      setTeamTopics([]);
      setCategoryTopics({});
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch team details
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', activeTeamId)
        .maybeSingle();

      if (teamData) {
        setCurrentTeam(teamData);

        // Auto-join member if logged in and not yet recorded
        if (activeUserId && user) {
          const isCreator = Boolean(
            teamData.created_by && String(teamData.created_by) === String(activeUserId)
          );
          const cleanUsername = (user.username || '').replace(/^@/, '').toLowerCase();

          let { data: existingMember } = await supabase
            .from('team_members')
            .select('id, role, telegram_id')
            .eq('team_id', activeTeamId)
            .eq('telegram_id', activeUserId)
            .maybeSingle();

          if (!existingMember && cleanUsername) {
            const { data: memberByUsername } = await supabase
              .from('team_members')
              .select('id, role, telegram_id')
              .eq('team_id', activeTeamId)
              .ilike('username', cleanUsername)
              .maybeSingle();
            if (memberByUsername) {
              existingMember = memberByUsername;
            }
          }

          if (!existingMember) {
            const role = isCreator ? 'admin' : (teamData.default_role || 'editor');
            await supabase.from('team_members').insert({
              team_id: activeTeamId,
              telegram_id: activeUserId,
              first_name: user.first_name || '',
              username: user.username || '',
              role,
            });
            setUserRole(role);
          } else {
            const effectiveRole =
              isCreator || existingMember.role === 'admin' ? 'admin' : existingMember.role;
            if (isCreator && existingMember.role !== 'admin') {
              await supabase
                .from('team_members')
                .update({ role: 'admin' })
                .eq('id', existingMember.id);
            }
            setUserRole(effectiveRole);
          }
        }
      } else {
        // Команда більше не існує (її видалили з чату)
        setCurrentTeam(null);
        setActiveTeamId(null);
        try {
          localStorage.removeItem(LOCAL_STORAGE_ACTIVE_TEAM);
        } catch {}
        setUserRole('owner');
        setTeamMembers([]);
        setTeamTopics([]);
        setCategoryTopics({});
        return;
      }

      // 2. Fetch team members with deduplication in memory
      const { data: rawMembers } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', activeTeamId)
        .order('first_name', { ascending: true });

      const uniqueList = [];
      const seen = new Map();

      for (const m of rawMembers || []) {
        const cleanUser = (m.username || '').replace(/^@/, '').toLowerCase();
        const key = cleanUser || m.telegram_id;
        if (!seen.has(key)) {
          seen.set(key, m);
          uniqueList.push(m);
        } else {
          const prev = seen.get(key);
          const isCurrReal = !String(m.telegram_id).startsWith('@') && String(m.telegram_id).length <= 12;
          const isPrevReal = !String(prev.telegram_id).startsWith('@') && String(prev.telegram_id).length <= 12;

          if ((m.role === 'admin' && prev.role !== 'admin') || (isCurrReal && !isPrevReal)) {
            const idx = uniqueList.indexOf(prev);
            if (idx !== -1) uniqueList[idx] = m;
            seen.set(key, m);
          }
        }
      }

      setTeamMembers(uniqueList);

      // 3. Fetch team topics
      const { data: topics } = await supabase
        .from('team_topics')
        .select('*')
        .eq('team_id', activeTeamId)
        .order('name', { ascending: true });
      setTeamTopics(topics || []);

      // 4. Fetch category topics mapping
      const { data: mappings } = await supabase
        .from('team_category_topics')
        .select('*')
        .eq('team_id', activeTeamId);

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
      console.error('Failed to fetch team data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTeamId, activeUserId, user]);

  useEffect(() => {
    fetchUserTeams();
    fetchCurrentTeamData();

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchUserTeams();
        fetchCurrentTeamData();
      }
    };

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('online', handleSync);

    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('online', handleSync);
    };
  }, [fetchUserTeams, fetchCurrentTeamData]);

  const activeTeamIdRef = useRef(activeTeamId);
  activeTeamIdRef.current = activeTeamId;
  const fetchUserTeamsRef = useRef(fetchUserTeams);
  fetchUserTeamsRef.current = fetchUserTeams;
  const fetchCurrentTeamDataRef = useRef(fetchCurrentTeamData);
  fetchCurrentTeamDataRef.current = fetchCurrentTeamData;

  // Realtime subscription for teams and team_members (single stable channel)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    let debounceTimer = null;
    const scheduleRefresh = (fetchTeamDetails = true) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchUserTeamsRef.current?.();
        if (fetchTeamDetails && activeTeamIdRef.current) {
          fetchCurrentTeamDataRef.current?.();
        }
      }, 1000);
    };

    const channel = supabase
      .channel('public:teams_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            setUserTeams((prev) => prev.filter((t) => t.id !== deletedId));
            if (activeTeamIdRef.current === deletedId) {
              setActiveTeamId(null);
              setCurrentTeam(null);
              try {
                localStorage.removeItem(LOCAL_STORAGE_ACTIVE_TEAM);
              } catch {}
              showToast('Команду видалено або бот покинув чат', 'info');
            }
          } else {
            scheduleRefresh(payload.new?.id === activeTeamIdRef.current);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () => {
          scheduleRefresh(true);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [showToast]);

  const switchWorkspace = useCallback(
    (teamId) => {
      triggerHaptic('light');
      setActiveTeamId(teamId);
      if (teamId) {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_TEAM, teamId);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_TEAM);
      }
    },
    [triggerHaptic]
  );

  const updateTeamSettings = useCallback(
    async (updates) => {
      if (!activeTeamId || !supabase) return;
      triggerHaptic('light');
      try {
        const { error } = await supabase.from('teams').update(updates).eq('id', activeTeamId);
        if (error) throw error;
        setCurrentTeam((prev) => (prev ? { ...prev, ...updates } : prev));
        showToast('Налаштування команди збережено', 'success');
      } catch (err) {
        console.error('Failed to update team settings:', err);
        showToast('Помилка оновлення налаштувань', 'error');
      }
    },
    [activeTeamId, triggerHaptic, showToast]
  );

  const updateMemberRole = useCallback(
    async (telegramId, newRole) => {
      if (!activeTeamId || !supabase) return;
      triggerHaptic('light');
      try {
        const { error } = await supabase
          .from('team_members')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('team_id', activeTeamId)
          .eq('telegram_id', String(telegramId));
        if (error) throw error;
        setTeamMembers((prev) =>
          prev.map((m) => (m.telegram_id === String(telegramId) ? { ...m, role: newRole } : m))
        );
        showToast('Роль учасника змінено', 'success');
      } catch (err) {
        console.error('Failed to update member role:', err);
        showToast('Помилка оновлення ролі', 'error');
      }
    },
    [activeTeamId, triggerHaptic, showToast]
  );

  const addTeamMember = useCallback(
    async (rawIdentifier, role = 'editor') => {
      if (!activeTeamId || !supabase) return;
      triggerHaptic('light');
      const clean = rawIdentifier.trim().replace(/^@/, '');
      if (!clean) return;
      const placeholderId = `@${clean.toLowerCase()}`;

      const exists = teamMembers.some(
        (m) =>
          m.telegram_id === placeholderId ||
          (m.username && m.username.toLowerCase() === clean.toLowerCase())
      );
      if (exists) {
        showToast('Учасник вже є у списку', 'warning');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('team_members')
          .insert({
            team_id: activeTeamId,
            telegram_id: placeholderId,
            username: clean,
            first_name: `@${clean}`,
            role,
          })
          .select()
          .single();
        if (error) throw error;
        setTeamMembers((prev) => [...prev, data]);
        showToast(`Учасника @${clean} успішно додано`, 'success');
      } catch (err) {
        console.error('Failed to add team member:', err);
        showToast('Помилка додавання учасника', 'error');
      }
    },
    [activeTeamId, teamMembers, triggerHaptic, showToast]
  );

  const removeTeamMember = useCallback(
    async (memberId) => {
      if (!activeTeamId || !supabase) return;
      triggerHaptic('light');
      try {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', activeTeamId)
          .eq('id', memberId);
        if (error) throw error;
        setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
        showToast('Учасника видалено зі списку', 'info');
      } catch (err) {
        console.error('Failed to remove team member:', err);
        showToast('Помилка видалення учасника', 'error');
      }
    },
    [activeTeamId, triggerHaptic, showToast]
  );

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

  const isCreator = Boolean(
    currentTeam?.created_by &&
    activeUserId &&
    String(currentTeam.created_by) === String(activeUserId)
  );
  const isTeamAdmin = userRole === 'admin' || userRole === 'owner' || isCreator;
  const canEdit = isTeamAdmin || userRole === 'editor';

  return (
    <TeamContext.Provider
      value={{
        userTeams,
        activeTeamId,
        currentTeam,
        userRole,
        isTeamAdmin,
        canEdit,
        teamMembers,
        teamTopics,
        categoryTopics,
        loadingTeams: loading,
        switchWorkspace,
        updateTeamSettings,
        updateMemberRole,
        addTeamMember,
        removeTeamMember,
        setCategoryTopicMapping,
        addTeamTopic,
        deleteTeamTopic,
        refreshTeamData: fetchCurrentTeamData,
        refreshUserTeams: fetchUserTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
}
