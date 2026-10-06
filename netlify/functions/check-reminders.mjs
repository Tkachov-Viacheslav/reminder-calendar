import { schedule } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

async function sendTelegramAlert(botToken, chatId, reminder) {
  const timeFormatted = new Date(reminder.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv'
  });

  const message = [
    `🔔 <b>Нагадування!</b>`,
    ``,
    `📌 <b>${reminder.title}</b>`,
    reminder.description ? `📝 ${reminder.description}` : '',
    `⏰ Час: <b>${timeFormatted}</b>`,
    `🏷 Категорія: #${reminder.category || 'інше'}`
  ].filter(Boolean).join('\n');

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    })
  });

  return response.ok;
}

const handler = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!supabaseUrl || !supabaseKey || !botToken) {
    console.log('Skipping scheduled check: missing credentials');
    return { statusCode: 200, body: JSON.stringify({ message: 'Missing env vars' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date().toISOString();

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_sent', false)
    .lte('remind_at', now);

  if (error || !reminders || reminders.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ processed: 0 }) };
  }

  let sentCount = 0;
  for (const item of reminders) {
    if (item.user_id && item.user_id !== 'guest') {
      const ok = await sendTelegramAlert(botToken, item.user_id, item);
      if (ok) {
        await supabase.from('reminders').update({ is_sent: true }).eq('id', item.id);
        sentCount++;
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ processed: sentCount }) };
};

// Runs every minute in Netlify Scheduled Functions
export default schedule('* * * * *', handler);
