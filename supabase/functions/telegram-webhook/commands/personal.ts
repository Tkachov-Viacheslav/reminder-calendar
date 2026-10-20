import { escapeHtml, getKyivDayRange, kyivToUtc, getNowInKyiv, tryParseQuickReminder } from '../utils.ts';
import { sendBotMessage, getBotChatStatus } from '../telegram.ts';
import { getSupabaseClient } from '../db.ts';
import { parseTelegramReminderWithAi } from '../ai.ts';
import {
  getUserTeamsWithRoles,
  formatTeamStatusItem,
  deleteTeamData,
} from '../teams.ts';

export async function sendWelcome(
  chatId: string | number,
  user: any,
  botToken: string,
  siteUrl: string
) {
  const name = escapeHtml(user?.first_name || 'друже');
  const replyText =
    `👋 <b>Вітаю, ${name}!</b>\n\n` +
    `Я розумний бот для нагадувань у Календарі на базі ШІ.\n\n` +
    `⚡ <b>Корисні команди:</b>\n` +
    `• /today — розклад на сьогодні\n` +
    `• /tomorrow — плани на завтра\n` +
    `• /week — справи на 7 днів\n` +
    `• /groups — мої групи та статус бота\n` +
    `• /code — код для входу в браузері\n\n` +
    `🤖 <b>ШІ-створення:</b> просто напишіть мені звичайною мовою:\n` +
    `• <i>«Завтра о 15:30 зустріч із партнером»</i>\n` +
    `• <i>«У середу о 19:00 тренування, нагадай за 30 хв»</i>\n` +
    `• <i>«О 10:00 планірка, а в п'ятницю о 18:00 звіт»</i>`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl, [
    [{ text: '🔑 Отримати код для браузера', callback_data: 'get_code' }],
    [{ text: '👥 Мої групи та статус бота', callback_data: 'my_groups' }],
  ]);
}

export async function sendHelp(
  chatId: string | number,
  botToken: string,
  siteUrl: string
) {
  const replyText =
    `💡 <b>Довідка по командах:</b>\n\n` +
    `📅 <b>/today</b> — переглянути всі справи на сьогодні\n` +
    `🌅 <b>/tomorrow</b> — справи на завтра\n` +
    `📆 <b>/week</b> — розклад на найближчі 7 днів\n` +
    `👥 <b>/groups</b> — перевірити підключені групи та статус прав бота\n` +
    `🔑 <b>/code</b> — отримати одноразовий код авторизації для ПК\n\n` +
    `🤖 <b>ШІ-створення справ:</b> пишіть у чат вільним текстом або перелічуйте декілька справ:\n` +
    `• <i>«Завтра о 14:00 зум з клієнтом»</i>\n` +
    `• <i>«Сьогодні о 20:00 купити молоко і хліб»</i>\n\n` +
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

export async function handleQuickReminder(
  chatId: string | number,
  parsed: any,
  botToken: string,
  siteUrl: string
) {
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

export async function handleAiReminderMessage(
  chatId: string | number,
  text: string,
  user: any,
  botToken: string,
  siteUrl: string
) {
  const supabase = getSupabaseClient();
  const now = getNowInKyiv();
  const nowStr = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')} ${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;

  try {
    const aiResult = await parseTelegramReminderWithAi(text, {
      now: `${nowStr} (Kyiv Time, ISO: ${new Date().toISOString()})`,
    });

    if (aiResult.status === 'OUT_OF_SCOPE') {
      const reply =
        `🤖 <b>ШІ-планувальник розкладу</b>\n\n` +
        `${escapeHtml(aiResult.message || 'Я фокусуюся лише на плануванні завдань.')}\n\n` +
        `💡 <i>Напишіть звичайною мовою, що і на коли запланувати:</i>\n` +
        `• <i>«Завтра о 15:30 зустріч із партнером»</i>\n` +
        `• <i>«У середу о 19:00 тренування, нагадай за 30 хв»</i>\n` +
        `• <i>«Сьогодні о 20:00 купити молоко і хліб»</i>`;
      await sendBotMessage(botToken, chatId, reply, siteUrl);
      return;
    }

    if (
      aiResult.status === 'SUCCESS' &&
      Array.isArray(aiResult.reminders) &&
      aiResult.reminders.length > 0
    ) {
      const createdList: any[] = [];

      for (let i = 0; i < aiResult.reminders.length; i++) {
        const r = aiResult.reminders[i];
        const [year, month, day] = r.dateStr.split('-').map(Number);
        const [hour, minute] = r.timeStr.split(':').map(Number);
        const eventUtc = kyivToUtc(year, month, day, hour, minute);
        const remindBeforeMs = (r.remindBefore || 0) * 60 * 1000;
        let remindAtUtc = new Date(eventUtc.getTime() - remindBeforeMs);
        if (isNaN(remindAtUtc.getTime())) {
          remindAtUtc = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        const formattedItems = (r.items || []).map((itText, idx) => ({
          id: `it-${Date.now()}-${idx}`,
          text: String(itText),
          done: false,
        }));

        const newReminder = {
          id: `rem-${Date.now()}-${i}`,
          user_id: String(chatId),
          title: r.title,
          category: r.category || 'main',
          remind_at: remindAtUtc.toISOString(),
          remind_before: r.remindBefore || 0,
          repeat_type: r.repeatType || 'none',
          items: formattedItems,
          is_sent: false,
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase.from('reminders').insert([newReminder]);
        if (insertError) {
          console.error('Failed to insert AI reminder:', insertError);
          continue;
        }
        createdList.push({ ...newReminder, dateStr: r.dateStr, timeStr: r.timeStr });
      }

      if (createdList.length === 1) {
        const single = createdList[0];
        const checklistLines = (single.items || []).map(
          (it: any) => `  ▫️ ${escapeHtml(it.text)}`
        );
        const checklistBlock =
          checklistLines.length > 0 ? `\n📋 <b>Підзавдання:</b>\n${checklistLines.join('\n')}` : '';

        const reply =
          `✨ <b>Нагадування заплановано через ШІ!</b>\n\n` +
          `📌 <b>${escapeHtml(single.title)}</b>\n` +
          `📅 Дата: <b>${single.dateStr}</b>\n` +
          `⏰ Час: <b>${single.timeStr}</b>` +
          checklistBlock;

        const cancelBtn = [{ text: '❌ Скасувати', callback_data: `cancel_${single.id}` }];
        await sendBotMessage(botToken, chatId, reply, siteUrl, [cancelBtn]);
      } else {
        const itemsText = createdList
          .map(
            (r, idx) =>
              `${idx + 1}️⃣ <b>${escapeHtml(r.title)}</b> — <i>${r.dateStr} о ${r.timeStr}</i>`
          )
          .join('\n');

        const reply =
          `✨ <b>ШІ запланував ${createdList.length} нагадувань:</b>\n\n` +
          itemsText +
          `\n\n💡 <i>Усі завдання вже збережено у вашому календарі.</i>`;

        await sendBotMessage(botToken, chatId, reply, siteUrl);
      }
      return;
    }
  } catch (err) {
    console.warn('AI parsing failed in Telegram bot, falling back:', err);
  }

  // Fallback to legacy parser if AI failed
  const fallback = tryParseQuickReminder(text);
  if (fallback) {
    await handleQuickReminder(chatId, fallback, botToken, siteUrl);
  } else {
    await sendWelcome(chatId, user, botToken, siteUrl);
  }
}

export async function handleUserGroupsCommand(
  chatId: string | number,
  botToken: string,
  siteUrl: string
) {
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
