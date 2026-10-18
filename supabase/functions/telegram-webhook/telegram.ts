export async function sendBotMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  siteUrl: string,
  extraRows: any[] = []
) {
  const keyboard = [
    [{ text: '📅 Відкрити Календар (Mini App)', web_app: { url: siteUrl } }],
    ...extraRows,
  ];
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }),
  });
}

export async function sendGroupMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  threadId?: number | null,
  extraRows: any[] = []
) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (threadId && Number(threadId) > 0) {
    body.message_thread_id = Number(threadId);
  }
  if (extraRows.length > 0) {
    body.reply_markup = { inline_keyboard: extraRows };
  }
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function answerCallbackQuery(botToken: string, queryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: queryId, text: text || '' }),
    });
  } catch (err) {
    console.error('Failed to answer callback query:', err);
  }
}

export async function getBotChatStatus(
  botToken: string,
  chatId: string | number
): Promise<{ isAdmin: boolean; status: string; isMember: boolean }> {
  try {
    const botId = botToken.split(':')[0];
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: Number(botId) }),
    });
    const data = await res.json();
    if (!data.ok) {
      const desc = (data.description || '').toLowerCase();
      if (
        data.error_code === 403 ||
        desc.includes('kicked') ||
        desc.includes('not a member') ||
        desc.includes('chat not found')
      ) {
        return { isAdmin: false, status: 'kicked', isMember: false };
      }
      return { isAdmin: false, status: 'unknown', isMember: false };
    }
    const status = data.result?.status || 'unknown';
    const isMember = status === 'administrator' || status === 'creator' || status === 'member';
    return {
      isAdmin: status === 'administrator' || status === 'creator',
      status,
      isMember,
    };
  } catch {
    return { isAdmin: false, status: 'error', isMember: false };
  }
}
