import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function generateAndSaveCode(chatId, user) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabase.from('auth_codes').delete().eq('telegram_id', String(chatId));

  const { error } = await supabase.from('auth_codes').insert({
    code,
    telegram_id: String(chatId),
    first_name: user?.first_name || '',
    username: user?.username || '',
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Failed to insert auth code:', error);
    return null;
  }
  return code;
}

async function sendAuthCode(chatId, user, botToken, siteUrl) {
  const code = await generateAndSaveCode(chatId, user);
  if (!code) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '❌ Не вдалося створити код. Спробуйте ще раз через хвилину.',
      }),
    });
    return;
  }

  const replyText =
    `🔐 <b>Ваш одноразовий код для входу:</b>\n\n` +
    `👉 <code>${code}</code> 👈\n\n` +
    `⏱ Дійсний 10 хвилин.\n` +
    `Введіть його на сайті або натисніть кнопку нижче для входу в 1 клік:`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: replyText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Увійти на сайті в 1 клік', url: `${siteUrl}/?auth=${code}` }],
        ],
      },
    }),
  });
}

async function sendWelcome(chatId, user, botToken, siteUrl) {
  const name = user?.first_name || 'друже';
  const replyText =
    `👋 <b>Вітаю, ${name}!</b>\n\n` +
    `Я бот для нагадувань у Календарі.\n\n` +
    `💡 <b>Швидке створення нагадування:</b>\n` +
    `Напишіть мені повідомлення, наприклад:\n` +
    `• <i>«Купити молоко о 19:00»</i>\n` +
    `• <i>«Завтра о 14:30 дзвінок клієнту»</i>\n\n` +
    `💻 <b>Вхід у браузері:</b> надішліть команду /code`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: replyText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Відкрити Календар (Mini App)', web_app: { url: siteUrl } }],
          [{ text: '🔑 Отримати код для браузера', callback_data: 'get_code' }],
        ],
      },
    }),
  });
}

async function answerCallbackQuery(botToken, queryId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: queryId,
        text: text || '',
      }),
    });
  } catch (err) {
    console.error('Failed to answer callback query:', err);
  }
}

function tryParseQuickReminder(text) {
  const timeMatch = text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const isTomorrow = /\bзавтра\b/i.test(text);

  const targetDate = new Date();
  if (isTomorrow) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  targetDate.setHours(hours, minutes, 0, 0);

  if (!isTomorrow && targetDate <= new Date()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  let title = text
    .replace(timeMatch[0], '')
    .replace(/\b(нагадай|нагадати|\/remind|завтра|сьогодні|о|об)\b/gi, '')
    .trim();

  if (!title) title = 'Швидке нагадування';

  return {
    title,
    remind_at: targetDate.toISOString(),
  };
}

async function handleQuickReminder(chatId, parsed, botToken, siteUrl) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const reminder = {
    id: `rem-${Date.now()}`,
    user_id: String(chatId),
    title: parsed.title,
    category: 'main',
    remind_at: parsed.remind_at,
    is_sent: false,
    created_at: new Date().toISOString(),
  };

  await supabase.from('reminders').insert([reminder]);

  const timeFormatted = new Date(parsed.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });
  const dateFormatted = new Date(parsed.remind_at).toLocaleDateString('uk-UA');

  const replyText =
    `✅ <b>Нагадування збережено!</b>\n\n` +
    `📌 <b>${parsed.title}</b>\n` +
    `📅 Дата: <b>${dateFormatted}</b>\n` +
    `⏰ Час: <b>${timeFormatted}</b>`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: replyText,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📅 Переглянути в Календарі', web_app: { url: siteUrl } }],
        ],
      },
    }),
  });
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return new Response('Bot token missing', { status: 200 });

  try {
    const update = await req.json();
    const siteUrl = process.env.URL || 'https://reminder-calendar-tg.netlify.app';

    if (update?.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id || cq.from?.id;

      if (cq.data === 'get_code' && chatId) {
        await answerCallbackQuery(botToken, cq.id);
        await sendAuthCode(chatId, cq.from, botToken, siteUrl);
      } else if (cq.data.startsWith('done_')) {
        const reminderId = cq.data.replace('done_', '');
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.from('reminders').update({ is_sent: true }).eq('id', reminderId);
        }
        await answerCallbackQuery(botToken, cq.id, '✅ Нагадування виконано!');
      } else if (cq.data.startsWith('snooze_')) {
        const reminderId = cq.data.replace('snooze_', '');
        const supabase = getSupabaseClient();
        if (supabase) {
          const snoozeDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await supabase
            .from('reminders')
            .update({ remind_at: snoozeDate, is_sent: false })
            .eq('id', reminderId);
        }
        await answerCallbackQuery(botToken, cq.id, '💤 Відкладено на 15 хв!');
      } else {
        await answerCallbackQuery(botToken, cq.id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = update?.message;
    if (!message || !message.chat) return new Response('OK', { status: 200 });

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const lowerText = text.toLowerCase();

    const isCodeRequest =
      lowerText.startsWith('/code') ||
      lowerText.startsWith('/login') ||
      lowerText.startsWith('/start login') ||
      lowerText.startsWith('/start code') ||
      lowerText === 'код' ||
      text === '🔑 Код для входу';

    if (isCodeRequest) {
      await sendAuthCode(chatId, message.from, botToken, siteUrl);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const quickReminder = tryParseQuickReminder(text);
    if (quickReminder) {
      await handleQuickReminder(chatId, quickReminder, botToken, siteUrl);
    } else {
      await sendWelcome(chatId, message.from, botToken, siteUrl);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('OK', { status: 200 });
  }
};
