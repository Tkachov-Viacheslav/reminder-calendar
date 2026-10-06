import { createClient } from '@supabase/supabase-js';

async function generateAndSaveCode(chatId, user) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Clear previous codes for this user
  await supabase.from('auth_codes').delete().eq('telegram_id', String(chatId));

  await supabase.from('auth_codes').insert({
    code,
    telegram_id: String(chatId),
    first_name: user?.first_name || '',
    username: user?.username || '',
    expires_at: expiresAt
  });

  return code;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return new Response('Bot token missing', { status: 200 });

  try {
    const update = await req.json();
    const message = update?.message;
    if (!message || !message.chat) return new Response('OK', { status: 200 });

    const chatId = message.chat.id;
    const text = message.text || '';
    const siteUrl = process.env.URL || 'https://reminder-calendar-tg.netlify.app';

    if (text.startsWith('/code') || text.startsWith('/login') || text === '🔑 Код для входу') {
      const code = await generateAndSaveCode(chatId, message.from);
      if (code) {
        const replyText =
          `🔐 <b>Ваш одноразовий код для входу:</b>\n\n` +
          `👉 <code>${code}</code> 👈\n\n` +
          `⏱ Дійсний 10 хвилин.\n` +
          `Введіть його на сайті у вікні авторизації, або натисніть кнопку нижче:`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🚀 Увійти на сайті в 1 клік', url: `${siteUrl}/?auth=${code}` }]
              ]
            }
          })
        });
      }
    } else if (text.startsWith('/start') || text.startsWith('/help')) {
      const replyText =
        `👋 <b>Вітаю, ${message.from?.first_name || 'друже'}!</b>\n\n` +
        `Я бот для нагадувань у Календарі.\n\n` +
        `📱 <b>Вхід у Telegram:</b> натисніть кнопку нижче або «📅 Календар» у меню.\n` +
        `💻 <b>Вхід з комп'ютера/браузера:</b> надішліть /code для отримання коду входу.`;

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
              [{ text: '🔑 Отримати код для входу в браузері', callback_data: 'get_code' }]
            ]
          }
        })
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('OK', { status: 200 });
  }
};
