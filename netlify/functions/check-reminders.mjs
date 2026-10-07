import { createClient } from '@supabase/supabase-js';

function formatCategoryTag(cat) {
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

function getNextRepeatDate(currentIso, repeatType) {
  const date = new Date(currentIso);
  if (repeatType === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (repeatType === 'weekdays') {
    const day = date.getDay();
    if (day === 5) {
      date.setDate(date.getDate() + 3); // Fri -> Mon
    } else if (day === 6) {
      date.setDate(date.getDate() + 2); // Sat -> Mon
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
  const p = {};
  parts.forEach((x) => (p[x.type] = x.value));
  return {
    dateStr: `${p.year}-${p.month}-${p.day}`,
    hour: parseInt(p.hour === '24' ? '0' : p.hour, 10),
    minute: parseInt(p.minute, 10),
  };
}

function kyivToUtc(year, month, day, hour, minute) {
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
  const p = {};
  parts.forEach((x) => (p[x.type] = x.value));
  const kyivAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour === '24' ? 0 : p.hour,
    p.minute,
    p.second
  );
  const offsetMs = kyivAsUtc - targetLocalTime;
  return new Date(targetLocalTime - offsetMs);
}

async function sendTelegramAlert(botToken, chatId, reminder) {
  const timeFormatted = new Date(reminder.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });

  const categoryTag = formatCategoryTag(reminder.category);
  const repeatLabels = {
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
    const lines = reminder.items.map(
      (it) => `${it.done ? '☑️' : '▫️'} ${it.text}`
    );
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

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
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

async function handleMorningDigests(supabase, botToken, siteUrl) {
  const kyiv = getKyivDateTime();
  if (kyiv.hour !== 9 || kyiv.minute > 10) return;

  const todayStr = kyiv.dateStr;
  const { data: usersData } = await supabase
    .from('reminders')
    .select('user_id')
    .neq('user_id', 'guest');

  if (!usersData || usersData.length === 0) return;
  const userIds = Array.from(new Set(usersData.map((u) => u.user_id).filter(Boolean)));

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
      .map((r, idx) => {
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

export default async (req) => {
  const secretHeader = req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secretHeader !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const siteUrl = process.env.URL || 'https://reminder-calendar-tg.netlify.app';

  if (!supabaseUrl || !supabaseKey || !botToken) {
    return new Response(JSON.stringify({ message: 'Missing env vars' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();

  // 1. Process morning digest if it's 09:00 Kyiv time
  await handleMorningDigests(supabase, botToken, siteUrl);

  // 2. Process active scheduled alerts
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
      const ok = await sendTelegramAlert(botToken, item.user_id, item);
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
};
