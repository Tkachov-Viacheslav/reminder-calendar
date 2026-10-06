export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return new Response(
      JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN не налаштовано в змінних Netlify' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { userId, message } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Не передано Telegram Chat ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userId,
        text: message || '🔔 Тестове сповіщення від Календаря!',
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      return new Response(
        JSON.stringify({
          error: tgData.description || 'Помилка надсилання у Telegram. Перевірте, чи бот активований (/start).',
          ok: false,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ ok: true, data: tgData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, ok: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
