import { escapeHtml } from '../utils.ts';
import { sendGroupMessage, getBotChatStatus } from '../telegram.ts';
import { getSupabaseClient } from '../db.ts';
import {
  ensureTeamExists,
  syncChatAdmins,
  deleteTeamData,
} from '../teams.ts';

export async function handleSyncCommand(
  chatId: string | number,
  threadId: number | undefined,
  chat: any,
  botToken: string,
  siteUrl: string,
  incomingMessageId?: number | null
) {
  const supabase = getSupabaseClient();
  const teamId = `team_${chatId}`;
  await syncChatAdmins(supabase, botToken, chat);
  const { data: members } = await supabase
    .from('team_members')
    .select('id, first_name, username, role')
    .eq('team_id', teamId);
  const { data: topics } = await supabase
    .from('team_topics')
    .select('id, name, thread_id')
    .eq('team_id', teamId);

  const memCount = members?.length || 0;
  const topCount = topics?.length || 0;
  const botStatus = await getBotChatStatus(botToken, chatId);

  const botStatusBadge = botStatus.isAdmin
    ? `✅ <b>Адміністратор</b> (повний доступ до тем і повідомлень)`
    : `⚠️ <b>Звичайний учасник</b> (ОБМЕЖЕНИЙ ДОСТУП)`;

  const adminWarning = !botStatus.isAdmin
    ? `\n\n⚠️ <b>Увага:</b> бот не є адміністратором! Будь ласка, надайте йому права адміна в налаштуваннях групи, інакше Telegram блокує боту доступ до повідомлень у темах форуму.`
    : ``;

  const isForum = Boolean(chat.is_forum);
  const topicsSection = isForum
    ? `\n🏷️ Зафіксованих тем: <b>${topCount}</b>`
    : ``;

  const forumHelp = isForum
    ? `\n\n💡 <i>Для реєстрації тем:</i> напишіть у потрібній гілці <code>/topic Назва</code> або <code>/bind Категорія</code>.`
    : `\n\n💡 <i>Корисні команди:</i> <code>/addmember @username</code> — додати учасника, <code>/team</code> — відкрити розклад.`;

  const reply =
    `🔄 <b>Синхронізація команди «${escapeHtml(chat.title || '')}»</b>\n\n` +
    `🤖 Статус бота в групі: ${botStatusBadge}\n` +
    `👥 Відомих учасників/адмінів: <b>${memCount}</b>` +
    topicsSection +
    adminWarning +
    forumHelp;

  const keyboard = [
    [{ text: '📅 Відкрити командний календар', url: `${siteUrl}/?team=${teamId}` }],
  ];
  await sendGroupMessage(botToken, chatId, reply, threadId, keyboard, incomingMessageId);
}

export async function handleTeamCommand(
  chatId: string | number,
  threadId: number | undefined,
  botToken: string,
  siteUrl: string,
  incomingMessageId?: number | null
) {
  const teamId = `team_${chatId}`;
  const botStatus = await getBotChatStatus(botToken, chatId);
  const statusNote = botStatus.isAdmin
    ? `✅ <i>Бот має статус адміністратора чату</i>`
    : `⚠️ <b>Увага:</b> <i>Бот не є адміном! Призначте його адміністратором, щоб він бачив повідомлення в темах форуму.</i>`;

  const reply =
    `👥 <b>Командний календар</b>\n\n` +
    `${statusNote}\n\n` +
    `Натисніть кнопку нижче, щоб відкрити спільний розклад цієї команди:`;
  const keyboard = [
    [{ text: '📅 Відкрити командний календар', url: `${siteUrl}/?team=${teamId}` }],
  ];
  await sendGroupMessage(botToken, chatId, reply, threadId, keyboard, incomingMessageId);
}

export async function handleAddMemberCommand(
  chatId: string | number,
  threadId: number | undefined,
  text: string,
  _user: any,
  botToken: string,
  incomingMessageId?: number | null
) {
  const parts = text.split(/\s+/);
  parts.shift();
  const rawUsername = parts[0]?.trim();
  const teamId = `team_${chatId}`;
  const supabase = getSupabaseClient();

  if (!rawUsername) {
    const helpMsg =
      `💡 <b>Додавання учасника чату до календаря:</b>\n\n` +
      `Введіть <code>/addmember @username</code> у чаті.\n\n` +
      `Після цього користувача можна буде обирати відповідальним у календарі, а бот тегатиме його в сповіщеннях!`;
    await sendGroupMessage(botToken, chatId, helpMsg, threadId, [], incomingMessageId);
    return;
  }

  const clean = rawUsername.replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '');
  if (!clean || clean.length > 32) {
    await sendGroupMessage(
      botToken,
      chatId,
      '⚠️ Некоректний username. Вкажіть дійсний Telegram username, наприклад <code>/addmember @username</code>',
      threadId,
      [],
      incomingMessageId
    );
    return;
  }
  const placeholderId = `@${clean.toLowerCase()}`;

  const { data: existing } = await supabase
    .from('team_members')
    .select('id, username')
    .eq('team_id', teamId)
    .or(`telegram_id.eq.${placeholderId},username.ilike.${clean}`)
    .maybeSingle();

  if (existing) {
    await sendGroupMessage(
      botToken,
      chatId,
      `ℹ️ Учасник <b>@${escapeHtml(clean)}</b> вже є у списку команди.`,
      threadId,
      [],
      incomingMessageId
    );
    return;
  }

  await supabase.from('team_members').insert({
    team_id: teamId,
    telegram_id: placeholderId,
    username: clean,
    first_name: `@${clean}`,
    role: 'editor',
  });

  await sendGroupMessage(
    botToken,
    chatId,
    `✅ Учасника <b>@${escapeHtml(clean)}</b> додано до команди!\nТепер його можна призначати відповідальним у розкладі, а бот тегатиме його під час нагадувань.`,
    threadId,
    [],
    incomingMessageId
  );
}

export async function handleMyChatMemberUpdate(mcm: any, botToken: string, siteUrl: string) {
  const chat = mcm.chat;
  const newStatus = mcm.new_chat_member?.status;
  const supabase = getSupabaseClient();
  const teamId = `team_${chat.id}`;

  if (newStatus === 'kicked' || newStatus === 'left') {
    await deleteTeamData(supabase, teamId);
    return;
  }

  if (newStatus !== 'member' && newStatus !== 'administrator') return;

  await ensureTeamExists(supabase, chat, mcm.from?.id);
  await syncChatAdmins(supabase, botToken, chat);
  const title = escapeHtml(chat.title || 'Команда');

  if (newStatus === 'administrator') {
    const isForum = Boolean(chat.is_forum);
    const forumCommands = isForum
      ? `• <code>/topic Назва</code> — зареєструвати тему форуму\n• <code>/bind категорія</code> — прив'язати тему до категорії завдань\n`
      : `• <code>/addmember @username</code> — додати учасника чату\n`;

    const welcome =
      `🎉 <b>Дякую! Бот отримав права Адміністратора в чаті «${title}»!</b>\n\n` +
      `✅ Повний доступ активовано.\n\n` +
      `⚙️ <b>Корисні команди:</b>\n` +
      `• <code>/sync</code> — оновити список адмінів та статус прав\n` +
      forumCommands +
      `• <code>/team</code> — відкрити командний календар`;
    const keyboard = [
      [{ text: '📅 Відкрити командний календар', url: `${siteUrl}/?team=${teamId}` }],
    ];
    await sendGroupMessage(botToken, chat.id, welcome, undefined, keyboard);
  } else if (newStatus === 'member') {
    const reminder =
      `⚠️ <b>Увага! Бот доданий як звичайний учасник у чат «${title}».</b>\n\n` +
      `❗ У звичайному режимі Telegram <b>приховує повідомлення та гілки форуму</b> від бота. Через це теми та розклад не синхронізуються.\n\n` +
      `👉 <b>Щоб календар працював повноцінно, зробіть бота Адміністратором:</b>\n` +
      `1️⃣ Відкрийте налаштування цієї групи\n` +
      `2️⃣ Розділ <b>«Адміністратори»</b> → <b>«Додати адміністратора»</b>\n` +
      `3️⃣ Оберіть бота <b>@reminderveter_bot</b> та надайте базові права\n\n` +
      `Після призначення надішліть <code>/sync</code> для оновлення статусу.`;
    const keyboard = [
      [{ text: '📅 Відкрити командний календар', url: `${siteUrl}/?team=${teamId}` }],
    ];
    await sendGroupMessage(botToken, chat.id, reminder, undefined, keyboard);
  }
}
