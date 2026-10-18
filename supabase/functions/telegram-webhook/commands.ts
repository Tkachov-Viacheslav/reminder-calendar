import { escapeHtml, getKyivDayRange } from './utils.ts';
import { sendBotMessage, sendGroupMessage, getBotChatStatus } from './telegram.ts';
import {
  ensureTeamExists,
  recordTopic,
  recordTeamMember,
  syncChatAdmins,
  deleteTeamData,
  getUserTeamsWithRoles,
  formatTeamStatusItem,
} from './teams.ts';
import { getSupabaseClient } from './db.ts';

export async function generateAndSaveCode(chatId: string | number, user: any) {
  const supabase = getSupabaseClient();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabase.from('auth_codes').delete().eq('telegram_id', String(chatId));

  const photoUrl = user?.username ? `https://t.me/i/userpic/320/${user.username}.jpg` : '';

  const { error } = await supabase.from('auth_codes').insert({
    code,
    telegram_id: String(chatId),
    first_name: user?.first_name || '',
    username: user?.username || '',
    photo_url: photoUrl,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Failed to insert auth code:', error);
    return null;
  }
  return code;
}

export async function sendAuthCode(chatId: string | number, user: any, botToken: string, siteUrl: string) {
  const code = await generateAndSaveCode(chatId, user);
  if (!code) {
    await sendBotMessage(
      botToken,
      chatId,
      '❌ Не вдалося створити код. Спробуйте ще раз через хвилину.',
      siteUrl
    );
    return;
  }

  const replyText =
    `🔐 <b>Ваш одноразовий код для входу:</b>\n\n` +
    `👉 <code>${code}</code> 👈\n\n` +
    `⏱ Дійсний 10 хвилин.\n` +
    `Введіть його на сайті або натисніть кнопку нижче:`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl, [
    [{ text: '🚀 Увійти на сайті в 1 клік', url: `${siteUrl}/?auth=${code}` }],
  ]);
}

export async function sendWelcome(chatId: string | number, user: any, botToken: string, siteUrl: string) {
  const name = escapeHtml(user?.first_name || 'друже');
  const replyText =
    `👋 <b>Вітаю, ${name}!</b>\n\n` +
    `Я бот для нагадувань у Календарі.\n\n` +
    `⚡ <b>Корисні команди:</b>\n` +
    `• /today — розклад на сьогодні\n` +
    `• /tomorrow — плани на завтра\n` +
    `• /week — справи на 7 днів\n` +
    `• /groups — мої групи та статус бота\n` +
    `• /code — код для входу в браузері\n\n` +
    `✍️ <b>Швидке створення:</b> напишіть мені в чат:\n` +
    `• <i>«10.11 19:00 Сходити в ДНУ»</i>\n` +
    `• <i>«Завтра о 14:30 дзвінок»</i>\n` +
    `• <i>«Купити молоко о 20:00»</i>`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl, [
    [{ text: '🔑 Отримати код для браузера', callback_data: 'get_code' }],
    [{ text: '👥 Мої групи та статус бота', callback_data: 'my_groups' }],
  ]);
}

export async function sendHelp(chatId: string | number, botToken: string, siteUrl: string) {
  const replyText =
    `💡 <b>Довідка по командах:</b>\n\n` +
    `📅 <b>/today</b> — переглянути всі справи на сьогодні\n` +
    `🌅 <b>/tomorrow</b> — справи на завтра\n` +
    `📆 <b>/week</b> — розклад на найближчі 7 днів\n` +
    `👥 <b>/groups</b> — перевірити підключені групи та статус прав бота\n` +
    `🔑 <b>/code</b> — отримати одноразовий код авторизації для ПК\n\n` +
    `⏰ <b>Створення:</b> просто пишіть текст із датою та часом:\n` +
    `• <i>Сьогодні о 19:00 тренування</i>\n` +
    `• <i>15.11 12:00 стоматолог</i>\n\n` +
    `☀️ <b>Ранковий дайджест:</b> щоранку о 09:00 бот надсилає зведення завдань.`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl, [
    [{ text: '👥 Мої групи та статус бота', callback_data: 'my_groups' }],
  ]);
}

async function getRemindersForRange(chatId: string | number, startIso: string, endIso: string) {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', String(chatId))
    .gte('remind_at', startIso)
    .lte('remind_at', endIso)
    .order('remind_at', { ascending: true });
  return data || [];
}

function formatRemindersList(reminders: any[], emptyMessage: string) {
  if (!reminders || reminders.length === 0) {
    return emptyMessage;
  }
  return reminders
    .map((r) => {
      const time = new Date(r.remind_at).toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Kyiv',
      });
      const check = r.is_sent ? '✅' : '⏳';
      return `${check} <b>${time}</b> — ${escapeHtml(r.title)}`;
    })
    .join('\n');
}

export async function handleTodayCommand(chatId: string | number, botToken: string, siteUrl: string) {
  const { startIso, endIso, formattedDate } = getKyivDayRange(0);
  const reminders = await getRemindersForRange(chatId, startIso, endIso);
  const list = formatRemindersList(
    reminders,
    '🎉 <i>На сьогодні нагадувань немає! Можна відпочити або додати нове.</i>'
  );

  const replyText =
    `📅 <b>Ваш розклад на сьогодні (${formattedDate}):</b>\n\n` +
    list +
    `\n\n💡 <i>Щоб додати нагадування, напишіть, наприклад:</i>\n«Сьогодні о 19:30 тренування»`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl);
}

export async function handleTomorrowCommand(chatId: string | number, botToken: string, siteUrl: string) {
  const { startIso, endIso, formattedDate } = getKyivDayRange(1);
  const reminders = await getRemindersForRange(chatId, startIso, endIso);
  const list = formatRemindersList(
    reminders,
    '✨ <i>На завтра планів поки що немає. Чудовий привід запланувати щось корисне!</i>'
  );

  const replyText =
    `🌅 <b>Ваші плани на завтра (${formattedDate}):</b>\n\n` +
    list +
    `\n\n💡 <i>Щоб додати нагадування, напишіть, наприклад:</i>\n«Завтра о 10:00 зустріч»`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl);
}

export async function handleWeekCommand(chatId: string | number, botToken: string, siteUrl: string) {
  const todayRange = getKyivDayRange(0);
  const weekEndRange = getKyivDayRange(6);
  const reminders = await getRemindersForRange(chatId, todayRange.startIso, weekEndRange.endIso);

  if (!reminders || reminders.length === 0) {
    const emptyText =
      `📆 <b>Розклад на найближчі 7 днів:</b>\n\n` +
      `🌿 <i>На найближчий тиждень завдань не заплановано.</i>\n\n` +
      `Спробуйте написати боту, щоб додати нагадування:\n«15.11 12:00 стоматолог»`;
    await sendBotMessage(botToken, chatId, emptyText, siteUrl);
    return;
  }

  const byDate: Record<string, any[]> = {};
  for (const r of reminders) {
    const dStr = new Date(r.remind_at).toLocaleDateString('uk-UA', {
      timeZone: 'Europe/Kyiv',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    if (!byDate[dStr]) byDate[dStr] = [];
    byDate[dStr].push(r);
  }

  let text = `📆 <b>Ваш розклад на тиждень:</b>\n\n`;
  for (const [dateStr, list] of Object.entries(byDate)) {
    text += `📌 <b>${dateStr}</b>\n`;
    text +=
      list
        .map((r) => {
          const time = new Date(r.remind_at).toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Kyiv',
          });
          const check = r.is_sent ? '✅' : '⏳';
          return `  ${check} ${time} — ${escapeHtml(r.title)}`;
        })
        .join('\n') + '\n\n';
  }

  await sendBotMessage(botToken, chatId, text.trim(), siteUrl);
}

export async function handleQuickReminder(chatId: string | number, parsed: any, botToken: string, siteUrl: string) {
  const supabase = getSupabaseClient();

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
  const dateFormatted = new Date(parsed.remind_at).toLocaleDateString('uk-UA', {
    timeZone: 'Europe/Kyiv',
  });

  const replyText =
    `✅ <b>Нагадування збережено!</b>\n\n` +
    `📌 <b>${escapeHtml(parsed.title)}</b>\n` +
    `📅 Дата: <b>${dateFormatted}</b>\n` +
    `⏰ Час: <b>${timeFormatted}</b>`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl);
}

export async function handleUserGroupsCommand(chatId: string | number, botToken: string, siteUrl: string) {
  const supabase = getSupabaseClient();
  const userId = String(chatId);
  const rawTeamsList = await getUserTeamsWithRoles(supabase, userId);

  const teamButtons: any[][] = [];
  const lines: string[] = [];

  for (const item of rawTeamsList) {
    const targetChatId = item.team.telegram_chat_id || item.team.id.replace('team_', '');
    const chatStatus = await getBotChatStatus(botToken, targetChatId);

    if (!chatStatus.isMember) {
      await deleteTeamData(supabase, item.team.id);
      continue;
    }

    const formatted = formatTeamStatusItem(item, chatStatus, lines.length, siteUrl);
    lines.push(formatted.line);
    teamButtons.push(formatted.button);
  }

  if (lines.length === 0) {
    const text =
      `👥 <b>Ваші групи та команди:</b>\n\n` +
      `Ви поки що не підключені до жодного командного календаря.\n\n` +
      `👉 <b>Як підключити вашу групу:</b>\n` +
      `1. Додайте бота <code>@reminderveter_bot</code> у потрібну групу Telegram.\n` +
      `2. Призначте його <b>Адміністратором</b> чату.\n` +
      `3. Бот автоматично створить командний календар і він з'явиться тут!`;
    await sendBotMessage(botToken, chatId, text, siteUrl);
    return;
  }

  const text =
    `👥 <b>Ваші підключені групи (${lines.length}):</b>\n\n` +
    lines.join('\n\n') +
    `\n\n💡 <i>Натисніть на групу нижче, щоб відкрити її календар:</i>`;

  await sendBotMessage(botToken, chatId, text, siteUrl, teamButtons);
}

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

  const reply =
    `🔄 <b>Синхронізація команди «${escapeHtml(chat.title || '')}»</b>\n\n` +
    `🤖 Статус бота в групі: ${botStatusBadge}\n` +
    `👥 Відомих учасників/адмінів: <b>${memCount}</b>\n` +
    `🏷️ Зафіксованих тем: <b>${topCount}</b>` +
    adminWarning +
    `\n\n💡 <i>Для реєстрації тем:</i> напишіть у потрібній гілці <code>/topic Назва</code> або <code>/bind Категорія</code>.`;

  const keyboard = [
    [{ text: '📅 Відкрити командний календар', url: `${siteUrl}/?team=${teamId}` }],
  ];
  await sendGroupMessage(botToken, chatId, reply, threadId, keyboard, incomingMessageId);
}

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

  const { data: member } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('telegram_id', String(user?.id))
    .maybeSingle();

  if (member && member.role === 'blocked') return;

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
  user: any,
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

  const clean = rawUsername.replace(/^@/, '');
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
    const welcome =
      `🎉 <b>Дякую! Бот отримав права Адміністратора в чаті «${title}»!</b>\n\n` +
      `✅ Повний доступ активовано.\n\n` +
      `⚙️ <b>Корисні команди:</b>\n` +
      `• <code>/sync</code> — оновити список адмінів та статус прав\n` +
      `• <code>/topic Назва</code> — зареєструвати тему форуму\n` +
      `• <code>/bind категорія</code> — прив'язати тему до категорії завдань\n` +
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
