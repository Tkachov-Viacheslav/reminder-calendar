import { createClient } from 'jsr:@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'rem_cron_sec_9f5ccda14430a083';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://reminder-calendar-seven.vercel.app';

function formatCategoryTag(cat?: string | null): string {
  if (!cat) return 'інше';
  const raw = String(cat).trim().toLowerCase();
  if (raw === 'main' || raw === 'головне') return 'головне';
  if (raw === 'other' || raw === 'інше') return 'інше';
  if (raw === 'personal' || raw === 'особисте') return 'особисте';
  if (raw === 'work' || raw === 'робота') return 'робота';
  if (raw === 'study' || raw === 'навчання') return 'навчання';
  if (raw === 'health' || raw === 'здоров’я' || raw === 'здоровя') return 'здоровя';

  const clean = raw.replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_]/gu, '');
  return clean || 'інше';
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getNextRepeatDate(currentIso: string, repeatType: string): string | null {
  const date = new Date(currentIso);
  if (repeatType === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (repeatType === 'weekdays') {
    const day = date.getDay();
    if (day === 5) {
      date.setDate(date.getDate() + 3);
    } else if (day === 6) {
      date.setDate(date.getDate() + 2);
    } else {
      date.setDate(date.getDate() + 1);
    }
  } else if (repeatType === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (repeatType === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else {
    return null;
  }
  return date.toISOString();
}

function getKyivDateTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p: Record<string, string> = {};
  parts.forEach((x) => (p[x.type] = x.value));
  return {
    dateStr: `${p.year}-${p.month}-${p.day}`,
    hour: parseInt(p.hour === '24' ? '0' : p.hour, 10),
    minute: parseInt(p.minute, 10),
  };
}

function kyivToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
  const targetLocalTime = new Date(isoStr).getTime();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(isoStr));
  const p: Record<string, string> = {};
  parts.forEach((x) => (p[x.type] = x.value));
  const kyivAsUtc = Date.UTC(
    parseInt(p.year, 10),
    parseInt(p.month, 10) - 1,
    parseInt(p.day, 10),
    p.hour === '24' ? 0 : parseInt(p.hour, 10),
    parseInt(p.minute, 10),
    parseInt(p.second, 10)
  );
  const offsetMs = kyivAsUtc - targetLocalTime;
  return new Date(targetLocalTime - offsetMs);
}

async function sendTelegramAlert(botToken: string, chatId: string, reminder: any): Promise<boolean> {
  const timeFormatted = new Date(reminder.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });

  const categoryTag = formatCategoryTag(reminder.category);
  const repeatLabels: Record<string, string> = {
    daily: 'щодня',
    weekdays: 'щобудня (Пн–Пт)',
    weekly: 'щотижня',
    monthly: 'щомісяця',
  };
  const repeatInfo =
    reminder.repeat_type && reminder.repeat_type !== 'none'
      ? `\n🔁 Повторення: <b>${repeatLabels[reminder.repeat_type] || reminder.repeat_type}</b>`
      : '';

  let checklistText = '';
  if (Array.isArray(reminder.items) && reminder.items.length > 0) {
    const lines = reminder.items.map((it: any) => `${it.done ? '☑️' : '▫️'} ${escapeHtml(it.text)}`);
    checklistText = `\n📋 <b>Підзавдання:</b>\n` + lines.join('\n');
  }

  const message = [
    `🔔 <b>Нагадування!</b>`,
    ``,
    `📌 <b>${escapeHtml(reminder.title)}</b>`,
    reminder.description ? `📝 ${escapeHtml(reminder.description)}` : '',
    checklistText,
    `⏰ Час: <b>${timeFormatted}</b>${repeatInfo}`,
    `🏷 Категорія: #${categoryTag}`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Виконано', callback_data: `done_${reminder.id}` },
            { text: '💤 Відкласти 15 хв', callback_data: `snooze_${reminder.id}` },
          ],
        ],
      },
    }),
  });

  return response.ok;
}

async function sendPmAlert(
  botToken: string,
  chatId: string,
  text: string,
  siteUrl: string,
  teamId: string
) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Відкрити командний календар', url: `${siteUrl}/?team=${teamId}` }],
          ],
        },
      }),
    });
  } catch {
    // Ignore error if user has not started bot in private messages
  }
}

async function sendTeamReminderAlert(
  supabase: any,
  botToken: string,
  siteUrl: string,
  reminder: any
): Promise<boolean> {
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', reminder.team_id)
    .maybeSingle();

  if (!team || !team.telegram_chat_id) return false;

  const timeFormatted = new Date(reminder.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });
  const categoryTag = formatCategoryTag(reminder.category);

  let checklistText = '';
  if (Array.isArray(reminder.items) && reminder.items.length > 0) {
    const lines = reminder.items.map((it: any) => `${it.done ? '☑️' : '▫️'} ${escapeHtml(it.text)}`);
    checklistText = `\n📋 <b>Підзавдання:</b>\n` + lines.join('\n');
  }

  let targetThreadId = reminder.thread_id;
  if (!targetThreadId && team.is_forum) {
    const { data: mapping } = await supabase
      .from('team_category_topics')
      .select('thread_id')
      .eq('team_id', reminder.team_id)
      .eq('category', categoryTag)
      .maybeSingle();
    if (mapping?.thread_id && Number(mapping.thread_id) > 0) {
      targetThreadId = mapping.thread_id;
    }
  }

  const authorName = escapeHtml(reminder.created_by_name || 'Учасник');
  const authorMention =
    reminder.user_id && reminder.user_id !== 'guest'
      ? `<a href="tg://user?id=${reminder.user_id}">${authorName}</a>`
      : authorName;

  const taggedList: any[] = Array.isArray(reminder.tagged_members) ? reminder.tagged_members : [];
  const taggedMentions = taggedList
    .map((m: any) => {
      if (m.username) {
        const u = String(m.username).replace(/^@/, '');
        return `@${u}`;
      }
      if (m.id) {
        return `<a href="tg://user?id=${m.id}">${escapeHtml(m.name || 'Учасник')}</a>`;
      }
      return escapeHtml(m.name || '');
    })
    .filter(Boolean)
    .join(', ');

  const groupMessage = [
    `🔔 <b>Командне нагадування!</b>`,
    ``,
    `📌 <b>${escapeHtml(reminder.title)}</b>`,
    reminder.description ? `📝 ${escapeHtml(reminder.description)}` : '',
    checklistText,
    `⏰ Час: <b>${timeFormatted}</b>`,
    `🏷 Категорія: #${categoryTag}`,
    `👤 Автор: ${authorMention}`,
    taggedMentions ? `👥 Відповідальні: ${taggedMentions}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const groupPayload: any = {
    chat_id: team.telegram_chat_id,
    text: groupMessage,
    parse_mode: 'HTML',
  };
  if (targetThreadId && Number(targetThreadId) > 0) {
    groupPayload.message_thread_id = Number(targetThreadId);
  }

  const groupRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupPayload),
  });

  const pmRecipients = new Set<string>();
  if (reminder.user_id && reminder.user_id !== 'guest') {
    pmRecipients.add(String(reminder.user_id));
  }
  for (const tm of taggedList) {
    if (tm.id && String(tm.id).match(/^\d+$/)) {
      pmRecipients.add(String(tm.id));
    }
  }

  const pmMessage = [
    `👥 <b>Нагадування з команди «${escapeHtml(team.title || 'Команда')}»:</b>`,
    ``,
    `📌 <b>${escapeHtml(reminder.title)}</b>`,
    reminder.description ? `📝 ${escapeHtml(reminder.description)}` : '',
    checklistText,
    `⏰ Час: <b>${timeFormatted}</b>`,
    `🏷 Категорія: #${categoryTag}`,
  ]
    .filter(Boolean)
    .join('\n');

  for (const pmId of pmRecipients) {
    await sendPmAlert(botToken, pmId, pmMessage, siteUrl, team.id);
  }

  return groupRes.ok;
}

function formatDigestMessage(
  ukDate: string,
  personalReminders: any[],
  teamReminders: any[]
): string {
  let personalSection = '';
  if (personalReminders.length > 0) {
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
    personalSection = `📅 <b>Особисті справи:</b>\n${pItems}\n\n`;
  }

  let teamSection = '';
  if (teamReminders.length > 0) {
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
    teamSection = `👥 <b>Справи у ваших командах:</b>\n${tItems}\n\n`;
  }

  return (
    `☀️ <b>Доброго ранку! Ваш бриф на сьогодні:</b>\n` +
    `📅 <b>${ukDate}</b>\n\n` +
    personalSection +
    teamSection +
    `Бажаємо продуктивного та легкого дня! 🚀`
  );
}

async function fetchUserTeamReminders(supabase: any, uid: string, startIso: string, endIso: string) {
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

async function handleMorningDigests(supabase: any, botToken: string, siteUrl: string) {
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
    const { data: alreadySent } = await supabase
      .from('user_digests')
      .select('user_id')
      .eq('user_id', uid)
      .eq('digest_date', todayStr)
      .maybeSingle();

    if (alreadySent) continue;

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
      continue;
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
}

Deno.serve(async (req: Request) => {
  const secretHeader = req.headers.get('x-cron-secret');
  if (CRON_SECRET && secretHeader !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured in Supabase secrets');
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://dwzswscabsphwprptnos.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();

  // 1. Morning Digest
  await handleMorningDigests(supabase, BOT_TOKEN, SITE_URL);

  // 2. Scheduled Reminders
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_sent', false)
    .lte('remind_at', now);

  if (error || !reminders || reminders.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sentCount = 0;
  for (const item of reminders) {
    let ok = false;
    if (item.team_id) {
      ok = await sendTeamReminderAlert(supabase, BOT_TOKEN, SITE_URL, item);
    } else if (item.user_id && item.user_id !== 'guest') {
      ok = await sendTelegramAlert(BOT_TOKEN, item.user_id, item);
    }

    if (ok) {
      sentCount++;
      const nextDate = getNextRepeatDate(item.remind_at, item.repeat_type);
      if (nextDate) {
        await supabase
          .from('reminders')
          .update({ remind_at: nextDate, is_sent: false })
          .eq('id', item.id);
      } else {
        await supabase.from('reminders').update({ is_sent: true }).eq('id', item.id);
      }
    }
  }

  return new Response(JSON.stringify({ processed: sentCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
