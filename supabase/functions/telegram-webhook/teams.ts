import { escapeHtml } from './utils.ts';
import { getBotChatStatus } from './telegram.ts';

export async function ensureTeamExists(supabase: any, chat: any, createdBy?: string | number) {
  const teamId = `team_${chat.id}`;
  const isForum = Boolean(chat.is_forum);
  const { data: existing } = await supabase
    .from('teams')
    .select('id, is_forum, title')
    .eq('id', teamId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('teams').insert({
      id: teamId,
      telegram_chat_id: String(chat.id),
      title: chat.title || 'Команда',
      is_forum: isForum,
      created_by: createdBy ? String(createdBy) : '',
      default_role: 'editor',
    });
  } else if (existing.is_forum !== isForum || existing.title !== (chat.title || 'Команда')) {
    await supabase
      .from('teams')
      .update({ is_forum: isForum, title: chat.title || 'Команда' })
      .eq('id', teamId);
  }
  return teamId;
}

export async function recordTeamMember(supabase: any, teamId: string, user: any, forceAdmin = false) {
  if (!user || !user.id) return;
  const userId = String(user.id);
  const cleanUsername = (user.username || '').replace(/^@/, '').toLowerCase();

  let { data: existing } = await supabase
    .from('team_members')
    .select('id, role, telegram_id, first_name, username')
    .eq('team_id', teamId)
    .eq('telegram_id', userId)
    .maybeSingle();

  // Якщо користувача ще не було за ID, перевіряємо чи адмін додав його за @username
  if (!existing && cleanUsername) {
    const { data: placeholder } = await supabase
      .from('team_members')
      .select('id, role, telegram_id, first_name, username')
      .eq('team_id', teamId)
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (placeholder) {
      existing = placeholder;
    }
  }

  if (!existing) {
    await supabase.from('team_members').insert({
      team_id: teamId,
      telegram_id: userId,
      first_name: user.first_name || '',
      username: (user.username || '').replace(/^@/, ''),
      role: forceAdmin ? 'admin' : 'editor',
    });
  } else {
    const cleanUsername = (user.username || '').replace(/^@/, '');
    const newFirstName = user.first_name || '';
    const shouldPromoteAdmin = forceAdmin && existing.role !== 'admin';

    // Оновлюємо рядок ЛИШЕ якщо змінилося ім'я, юзернейм або роль, щоб не спамити PATCH у базу
    const hasDataChanged =
      existing.first_name !== newFirstName ||
      existing.username !== cleanUsername ||
      existing.telegram_id !== userId ||
      shouldPromoteAdmin;

    if (hasDataChanged) {
      const updates: any = {
        telegram_id: userId,
        first_name: newFirstName,
        username: cleanUsername,
        updated_at: new Date().toISOString(),
      };
      if (shouldPromoteAdmin) {
        updates.role = 'admin';
      }
      await supabase
        .from('team_members')
        .update(updates)
        .eq('id', existing.id);
    }
  }
}

export async function syncChatAdmins(supabase: any, botToken: string, chat: any) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatAdministrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat.id }),
    });
    const data = await res.json();
    if (data.ok && Array.isArray(data.result)) {
      const teamId = `team_${chat.id}`;
      for (const admin of data.result) {
        if (admin.user && !admin.user.is_bot) {
          await recordTeamMember(supabase, teamId, admin.user, true);
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync chat admins:', err);
  }
}

export async function recordTopic(supabase: any, teamId: string, threadId: number, name: string) {
  if (!threadId) return;
  if (!name) {
    const { data: existing } = await supabase
      .from('team_topics')
      .select('name')
      .eq('team_id', teamId)
      .eq('thread_id', threadId)
      .maybeSingle();
    if (existing && existing.name) {
      return;
    }
  }
  await supabase.from('team_topics').upsert(
    {
      team_id: teamId,
      thread_id: threadId,
      name: name || `Тема #${threadId}`,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'team_id,thread_id' }
  );
}

export async function deleteTeamData(supabase: any, teamId: string) {
  try {
    await supabase.from('reminders').delete().eq('team_id', teamId);
    await supabase.from('team_category_topics').delete().eq('team_id', teamId);
    await supabase.from('team_topics').delete().eq('team_id', teamId);
    await supabase.from('team_members').delete().eq('team_id', teamId);
    await supabase.from('team_categories').delete().eq('team_id', teamId);
    await supabase.from('teams').delete().eq('id', teamId);
  } catch (err) {
    console.error(`Failed to delete team data for ${teamId}:`, err);
  }
}

export async function getUserTeamsWithRoles(supabase: any, userId: string) {
  const { data: memberRows } = await supabase
    .from('team_members')
    .select('team_id, role, teams(*)')
    .eq('telegram_id', userId)
    .neq('role', 'blocked');

  const { data: createdTeams } = await supabase
    .from('teams')
    .select('*')
    .eq('created_by', userId);

  const teamMap = new Map<string, { team: any; role: string }>();

  (memberRows || []).forEach((row: any) => {
    const t = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    if (t && t.id) {
      teamMap.set(t.id, { team: t, role: row.role || 'editor' });
    }
  });

  (createdTeams || []).forEach((ct: any) => {
    if (!teamMap.has(ct.id)) {
      teamMap.set(ct.id, { team: ct, role: 'admin' });
    }
  });

  return Array.from(teamMap.values());
}

export function formatTeamStatusItem(
  item: { team: any; role: string },
  chatStatus: { isAdmin: boolean; status: string },
  index: number,
  siteUrl: string
) {
  const { team, role } = item;
  const botStatusBadge = chatStatus.isAdmin
    ? `✅ <b>Адміністратор</b> <i>(все працює ідеально)</i>`
    : `⚠️ <b>Звичайний учасник</b> <i>(потрібно призначити адміном!)</i>`;

  const roleName = role === 'admin' ? 'Адмін' : role === 'editor' ? 'Редактор' : 'Переглядач';
  const forumBadge = team.is_forum ? ' 💬 <i>(форум з темами)</i>' : '';
  const warningLine = !chatStatus.isAdmin
    ? `\n   ❗ <i>Telegram приховує повідомлення від бота, доки він не стане адміном чату.</i>`
    : '';

  const line =
    `<b>${index + 1}. «${escapeHtml(team.title || 'Команда')}»</b>${forumBadge}\n` +
    `   🤖 Статус бота: ${botStatusBadge}\n` +
    `   👤 Ваша роль: <b>${roleName}</b>${warningLine}`;

  const button = [
    { text: `📅 Відкрити «${team.title || 'Команда'}»`, url: `${siteUrl}/?team=${team.id}` },
  ];

  return { line, button };
}

export async function isSenderAdmin(
  supabase: any,
  teamId: string,
  user: any,
  botToken: string,
  chatId: string | number
): Promise<boolean> {
  if (!user || !user.id) return false;
  const userId = String(user.id);

  // 1. Check in team_members table
  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('telegram_id', userId)
    .maybeSingle();

  if (member?.role === 'admin') return true;

  // 2. Check in teams.created_by
  const { data: team } = await supabase
    .from('teams')
    .select('created_by')
    .eq('id', teamId)
    .maybeSingle();

  if (team?.created_by === userId) return true;

  // 3. Fallback: check Telegram getChatMember
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: Number(userId) }),
    });
    const data = await res.json();
    if (data.ok && (data.result.status === 'administrator' || data.result.status === 'creator')) {
      await supabase
        .from('team_members')
        .upsert(
          {
            team_id: teamId,
            telegram_id: userId,
            first_name: user.first_name || '',
            username: (user.username || '').replace(/^@/, ''),
            role: 'admin',
          },
          { onConflict: 'team_id,telegram_id' }
        );
      return true;
    }
  } catch {}

  return false;
}
