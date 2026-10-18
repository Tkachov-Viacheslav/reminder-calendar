import { createClient } from 'jsr:@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8785054597:AAEnDmyEKpNqHbT1hGyKMyc9Jkt5QCPoLUk';
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
    const lines = reminder.items.map((it: any) => `${it.done ? '☑️' : '▫️'} ${it.text}`);
    checklistText = `\n📋 <b>Підзавдання:</b>\n` + lines.join('\n');
  }

  const message = [
    `🔔 <b>Нагадування!</b>`,
    ``,
    `📌 <b>${reminder.title}</b>`,
    reminder.description ? `📝 ${reminder.description}` : '',
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

async function handleMorningDigests(supabase: any, botToken: string, siteUrl: string) {
  const kyiv = getKyivDateTime();
  if (kyiv.hour !== 9 || kyiv.minute > 10) return;

  const todayStr = kyiv.dateStr;
  const { data: usersData } = await supabase
    .from('reminders')
    .select('user_id')
    .neq('user_id', 'guest');

  if (!usersData || usersData.length === 0) return;
  const userIds: string[] = Array.from(new Set(usersData.map((u: any) => u.user_id).filter(Boolean)));

  const [y, m, d] = todayStr.split('-').map(Number);
  const startOfDay = kyivToUtc(y, m, d, 0, 0).toISOString();
  const endOfDay = kyivToUtc(y, m, d, 23, 59).toISOString();

  for (const uid of userIds) {
    const { data: alreadySent } = await supabase
      .from('user_digests')
      .select('user_id')
      .eq('user_id', uid)
      .eq('digest_date', todayStr)
      .maybeSingle();

    if (alreadySent) continue;

    const { data: todayReminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', uid)
      .gte('remind_at', startOfDay)
      .lte('remind_at', endOfDay)
      .order('remind_at', { ascending: true });

    if (!todayReminders || todayReminders.length === 0) {
      await supabase.from('user_digests').insert({ user_id: uid, digest_date: todayStr });
      continue;
    }

    const itemsFormatted = todayReminders
      .map((r: any, idx: number) => {
        const time = new Date(r.remind_at).toLocaleTimeString('uk-UA', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Kyiv',
        });
        const status = r.is_sent ? '✅' : '⏰';
        return `${idx + 1}. ${status} <b>${time}</b> — ${r.title}`;
      })
      .join('\n');

    const ukDate = `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
    const digestText =
      `☀️ <b>Доброго ранку! Ваш бриф на сьогодні:</b>\n` +
      `📅 <b>${ukDate}</b>\n\n` +
      `${itemsFormatted}\n\n` +
      `Бажаємо продуктивного та легкого дня! 🚀`;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: uid,
          text: digestText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 Відкрити Календар', web_app: { url: siteUrl } }],
            ],
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
    if (item.user_id && item.user_id !== 'guest') {
      const ok = await sendTelegramAlert(BOT_TOKEN, item.user_id, item);
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
  }

  return new Response(JSON.stringify({ processed: sentCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
