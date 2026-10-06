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
  } else if (repeatType === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (repeatType === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else {
    return null;
  }
  return date.toISOString();
}

async function sendTelegramAlert(botToken, chatId, reminder) {
  const timeFormatted = new Date(reminder.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });

  const categoryTag = formatCategoryTag(reminder.category);
  const repeatInfo = reminder.repeat_type && reminder.repeat_type !== 'none'
    ? `\n🔁 Повторення: <b>${reminder.repeat_type === 'daily' ? 'щодня' : reminder.repeat_type === 'weekly' ? 'щотижня' : 'щомісяця'}</b>`
    : '';

  const message = [
    `🔔 <b>Нагадування!</b>`,
    ``,
    `📌 <b>${reminder.title}</b>`,
    reminder.description ? `📝 ${reminder.description}` : '',
    `⏰ Час: <b>${timeFormatted}</b>${repeatInfo}`,
    `🏷 Категорія: #${categoryTag}`,
  ].filter(Boolean).join('\n');

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

  if (!supabaseUrl || !supabaseKey || !botToken) {
    return new Response(JSON.stringify({ message: 'Missing env vars' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();

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
