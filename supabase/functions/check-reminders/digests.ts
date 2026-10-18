import { escapeHtml, formatCategoryTag, getKyivDateTime, kyivToUtc, sleep } from './utils.ts';

function formatPersonalSection(personalReminders: any[]): string {
  if (!personalReminders || personalReminders.length === 0) return '';
  const pItems = personalReminders
    .map((r: any, idx: number) => {
      const time = new Date(r.remind_at).toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Kyiv',
      });
      const status = r.is_sent ? '✅' : '⏰';
      return `${idx + 1}. ${status} <b>${time}</b> — ${escapeHtml(r.title)}`;
    })
    .join('\n');
  return `📅 <b>Особисті справи:</b>\n${pItems}\n\n`;
}

function formatTeamSection(teamReminders: any[]): string {
  if (!teamReminders || teamReminders.length === 0) return '';
  const tItems = teamReminders
    .map((r: any) => {
      const time = new Date(r.remind_at).toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Kyiv',
      });
      const status = r.is_sent ? '✅' : '⏰';
      const cat = formatCategoryTag(r.category);
      return `• «${escapeHtml(r.teamTitle)}»: ${status} <b>${time}</b> — ${escapeHtml(r.title)} (#${cat})`;
    })
    .join('\n');
  return `👥 <b>Справи у ваших командах:</b>\n${tItems}\n\n`;
}

export function formatDigestMessage(
  ukDate: string,
  personalReminders: any[],
  teamReminders: any[]
): string {
  const personal = formatPersonalSection(personalReminders);
  const team = formatTeamSection(teamReminders);
  return (
    `☀️ <b>Доброго ранку! Ваш бриф на сьогодні:</b>\n` +
    `📅 <b>${ukDate}</b>\n\n` +
    personal +
    team +
    `Бажаємо продуктивного та легкого дня! 🚀`
  );
}

export async function fetchUserTeamReminders(
  supabase: any,
  uid: string,
  startIso: string,
  endIso: string
): Promise<any[]> {
  const { data: memberTeams } = await supabase
    .from('team_members')
    .select('team_id, role, teams(id, title)')
    .eq('telegram_id', uid)
    .neq('role', 'blocked');

  if (!memberTeams || memberTeams.length === 0) return [];
  const teamIds = memberTeams.map((mt: any) => mt.team_id);
  const { data: tRems } = await supabase
    .from('reminders')
    .select('*')
    .in('team_id', teamIds)
    .gte('remind_at', startIso)
    .lte('remind_at', endIso)
    .order('remind_at', { ascending: true });

  if (!tRems) return [];
  return tRems.map((r: any) => {
    const match = memberTeams.find((mt: any) => mt.team_id === r.team_id);
    return { ...r, teamTitle: match?.teams?.title || 'Команда' };
  });
}

async function sendSingleUserDigest(
  supabase: any,
  botToken: string,
  siteUrl: string,
  uid: string,
  todayStr: string,
  ukDate: string,
  startOfDay: string,
  endOfDay: string
): Promise<void> {
  const { data: alreadySent } = await supabase
    .from('user_digests')
    .select('user_id')
    .eq('user_id', uid)
    .eq('digest_date', todayStr)
    .maybeSingle();

  if (alreadySent) return;

  const { data: personalReminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', uid)
    .is('team_id', null)
    .gte('remind_at', startOfDay)
    .lte('remind_at', endOfDay)
    .order('remind_at', { ascending: true });

  const teamReminders = await fetchUserTeamReminders(supabase, uid, startOfDay, endOfDay);
  const hasPersonal = personalReminders && personalReminders.length > 0;
  const hasTeam = teamReminders.length > 0;

  if (!hasPersonal && !hasTeam) {
    await supabase.from('user_digests').insert({ user_id: uid, digest_date: todayStr });
    return;
  }

  const digestText = formatDigestMessage(ukDate, personalReminders || [], teamReminders);

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: uid,
        text: digestText,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '📅 Відкрити Календар', web_app: { url: siteUrl } }]],
        },
      }),
    });
    await supabase.from('user_digests').insert({ user_id: uid, digest_date: todayStr });
  } catch (e) {
    console.error('Failed to send morning digest to', uid, e);
  }
}

export async function handleMorningDigests(
  supabase: any,
  botToken: string,
  siteUrl: string
): Promise<void> {
  const kyiv = getKyivDateTime();
  if (kyiv.hour !== 9 || kyiv.minute > 10) return;

  const todayStr = kyiv.dateStr;
  const { data: usersData } = await supabase
    .from('reminders')
    .select('user_id')
    .neq('user_id', 'guest');
  const { data: teamMembersData } = await supabase
    .from('team_members')
    .select('telegram_id')
    .neq('role', 'blocked');

  const allUserIds = new Set<string>();
  (usersData || []).forEach((u: any) => u.user_id && allUserIds.add(String(u.user_id)));
  (teamMembersData || []).forEach((m: any) => m.telegram_id && allUserIds.add(String(m.telegram_id)));

  if (allUserIds.size === 0) return;

  const [y, m, d] = todayStr.split('-').map(Number);
  const startOfDay = kyivToUtc(y, m, d, 0, 0).toISOString();
  const endOfDay = kyivToUtc(y, m, d, 23, 59).toISOString();
  const ukDate = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;

  for (const uid of allUserIds) {
    await sendSingleUserDigest(
      supabase,
      botToken,
      siteUrl,
      uid,
      todayStr,
      ukDate,
      startOfDay,
      endOfDay
    );
    // Rate limit throttling: 40ms pause between recipients prevents 429
    await sleep(40);
  }
}
