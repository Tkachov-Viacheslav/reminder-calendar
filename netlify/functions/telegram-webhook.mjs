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
    `📱 <b>Вхід у Telegram:</b> натисніть «📅 Календар» у меню або кнопку нижче.\n` +
    `💻 <b>Вхід з браузера:</b> надішліть команду /code для отримання коду входу.`;

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
          [{ text: '🔑 Отримати код для входу в браузері', callback_data: 'get_code' }],
        ],
      },
    }),
  });
}

async function answerCallbackQuery(botToken, queryId) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: queryId }),
    });
  } catch (err) {
    console.error('Failed to answer callback query:', err);
  }
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
      await answerCallbackQuery(botToken, cq.id);

      if (cq.data === 'get_code' && chatId) {
        await sendAuthCode(chatId, cq.from, botToken, siteUrl);
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
