import { escapeHtml } from '../utils.ts';
import { sendGroupMessage } from '../telegram.ts';
import { getSupabaseClient } from '../db.ts';
import { recordTopic, isSenderAdmin } from '../teams.ts';

export async function handleBindCommand(
  chatId: string | number,
  threadId: number | undefined,
  text: string,
  user: any,
  botToken: string,
  incomingMessageId?: number | null
) {
  const parts = text.split(/\s+/);
  const categoryRaw = parts[1]?.trim();
  const teamId = `team_${chatId}`;
  const supabase = getSupabaseClient();

  if (!categoryRaw) {
    const helpMsg =
      `💡 <b>Прив'язка теми до категорії нагадувань:</b>\n\n` +
      `Введіть <code>/bind назва_категорії</code> у потрібній гілці чату.\n\n` +
      `Наприклад: <code>/bind робота</code> або <code>/bind навчання</code>.\n` +
      `Після цього всі нагадування з цією категорією надсилатимуться сюди!`;
    await sendGroupMessage(botToken, chatId, helpMsg, threadId, [], incomingMessageId);
    return;
  }

  const isAdmin = await isSenderAdmin(supabase, teamId, user, botToken, chatId);
  if (!isAdmin) {
    await sendGroupMessage(
      botToken,
      chatId,
      '⚠️ Тільки адміністратори команди можуть прив\'язувати теми до категорій.',
      threadId,
      [],
      incomingMessageId
    );
    return;
  }

  const cleanCategory = categoryRaw.toLowerCase().replace('#', '');
  await supabase.from('team_category_topics').upsert(
    {
      team_id: teamId,
      category: cleanCategory,
      thread_id: threadId || 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'team_id,category' }
  );

  if (threadId) {
    await recordTopic(supabase, teamId, threadId, cleanCategory);
  }

  const targetTopicText = threadId ? 'цю тему' : 'головний чат';
  const reply =
    `📌 Категорію <b>#${cleanCategory}</b> успішно прив'язано до ${targetTopicText}!\n\n` +
    `Тепер усі командні нагадування цієї категорії надсилатимуться сюди.`;
  await sendGroupMessage(botToken, chatId, reply, threadId, [], incomingMessageId);
}

export async function handleTopicCommand(
  chatId: string | number,
  threadId: number | undefined,
  text: string,
  user: any,
  botToken: string,
  incomingMessageId?: number | null
) {
  if (!threadId) {
    await sendGroupMessage(
      botToken,
      chatId,
      '⚠️ Цю команду потрібно викликати всередині конкретної теми форуму!',
      threadId,
      [],
      incomingMessageId
    );
    return;
  }
  const parts = text.split(/\s+/);
  parts.shift();
  const topicName = parts.join(' ').trim();
  const teamId = `team_${chatId}`;
  const supabase = getSupabaseClient();

  const isAdmin = await isSenderAdmin(supabase, teamId, user, botToken, chatId);
  if (!isAdmin) {
    await sendGroupMessage(
      botToken,
      chatId,
      '⚠️ Тільки адміністратори команди можуть реєструвати нові теми.',
      threadId,
      [],
      incomingMessageId
    );
    return;
  }

  if (!topicName) {
    await sendGroupMessage(
      botToken,
      chatId,
      '💡 Вкажіть назву для цієї теми:\n<code>/topic Назва теми</code>',
      threadId,
      [],
      incomingMessageId
    );
    return;
  }

  await recordTopic(supabase, teamId, threadId, topicName);
  await sendGroupMessage(
    botToken,
    chatId,
    `🏷️ Тему зареєстровано як <b>«${escapeHtml(topicName)}»</b>!\nВона вже доступна для вибору в календарі.`,
    threadId,
    [],
    incomingMessageId
  );
}
