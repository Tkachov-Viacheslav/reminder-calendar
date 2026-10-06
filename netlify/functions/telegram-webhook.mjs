export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return new Response('Bot token missing', { status: 200 });
  }

  try {
    const update = await req.json();
    const message = update?.message;

    if (!message || !message.chat) {
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text || '';
    const siteUrl = process.env.URL || 'https://app.netlify.com';

    if (text.startsWith('/start') || text.startsWith('/help')) {
      const replyText =
        `👋 <b>Вітаю, ${message.from?.first_name || 'друже'}!</b>\n\n` +
        `Я бот для нагадувань у Календарі.\n` +
        `Твій Chat ID: <code>${chatId}</code>\n\n` +
        `Натисни кнопку нижче, щоб відкрити календар та створити нові нагадування!`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📅 Відкрити Календар',
                  web_app: { url: siteUrl }
                }
              ]
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
