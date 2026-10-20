import { getSupabaseClient } from './db.ts';

export async function deleteTelegramMessage(
  botToken: string,
  chatId: string | number,
  messageId: string | number
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: Number(messageId) }),
    });
    const data = await res.json();
    return !!data?.ok;
  } catch (err) {
    console.warn(`Failed to delete message ${messageId} in chat ${chatId}:`, err);
    return false;
  }
}

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
  extraRows: any[] = [],
  incomingMessageId?: number | null
): Promise<any> {
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
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data?.ok && data.result?.message_id) {
    const botMsgId = data.result.message_id;
    const delaySec = 30;

    // 1. Негайний фоновий таймер на 30 секунд для миттєвого видалення
    const scheduleImmediateDeletion = async () => {
      await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
      await deleteTelegramMessage(botToken, chatId, botMsgId);
      if (incomingMessageId) {
        await deleteTelegramMessage(botToken, chatId, incomingMessageId);
      }
    };

    // EdgeRuntime.waitUntil підтримується у середовищі Supabase / Deno Edge
    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === 'function') {
      (globalThis as any).EdgeRuntime.waitUntil(scheduleImmediateDeletion());
    } else {
      scheduleImmediateDeletion().catch((err) =>
        console.warn('Background deletion error:', err)
      );
    }

    // 2. Збереження в таблицю bot_ephemeral_messages для резервного cron-видалення
    try {
      const supabase = getSupabaseClient();
      const deleteAt = new Date(Date.now() + delaySec * 1000).toISOString();
      const inserts: any[] = [
        { chat_id: String(chatId), message_id: Number(botMsgId), delete_at: deleteAt },
      ];
      if (incomingMessageId) {
        inserts.push({
          chat_id: String(chatId),
          message_id: Number(incomingMessageId),
          delete_at: deleteAt,
        });
      }
      await supabase.from('bot_ephemeral_messages').insert(inserts);
    } catch (err) {
      console.warn('Failed to schedule ephemeral message deletion in DB:', err);
    }
  }

  return data;
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

export async function editTelegramMessage(
  botToken: string,
  chatId: string | number,
  messageId: string | number,
  text: string,
  extraRows: any[] = []
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: Number(messageId),
        text,
        parse_mode: 'HTML',
        reply_markup: extraRows.length > 0 ? { inline_keyboard: extraRows } : undefined,
      }),
    });
    const data = await res.json();
    return !!data?.ok;
  } catch (err) {
    console.warn('Failed to edit telegram message:', err);
    return false;
  }
}

