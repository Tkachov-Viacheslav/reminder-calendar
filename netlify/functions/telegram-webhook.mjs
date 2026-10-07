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

async function sendBotMessage(botToken, chatId, text, siteUrl, extraRows = []) {
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

async function sendAuthCode(chatId, user, botToken, siteUrl) {
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

async function sendWelcome(chatId, user, botToken, siteUrl) {
  const name = user?.first_name || 'друже';
  const replyText =
    `👋 <b>Вітаю, ${name}!</b>\n\n` +
    `Я бот для нагадувань у Календарі.\n\n` +
    `⚡ <b>Корисні команди:</b>\n` +
    `• /today — розклад на сьогодні\n` +
    `• /tomorrow — плани на завтра\n` +
    `• /week — справи на 7 днів\n` +
    `• /code — код для входу в браузері\n\n` +
    `✍️ <b>Швидке створення:</b> напишіть мені в чат:\n` +
    `• <i>«10.11 19:00 Сходити в ДНУ»</i>\n` +
    `• <i>«Завтра о 14:30 дзвінок»</i>\n` +
    `• <i>«Купити молоко о 20:00»</i>`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl, [
    [{ text: '🔑 Отримати код для браузера', callback_data: 'get_code' }],
  ]);
}

async function sendHelp(chatId, botToken, siteUrl) {
  const replyText =
    `💡 <b>Довідка по командах:</b>\n\n` +
    `📅 <b>/today</b> — переглянути всі справи на сьогодні\n` +
    `🌅 <b>/tomorrow</b> — справи на завтра\n` +
    `📆 <b>/week</b> — розклад на найближчі 7 днів\n` +
    `🔑 <b>/code</b> — отримати одноразовий код авторизації для ПК\n\n` +
    `⏰ <b>Створення:</b> просто пишіть текст із датою та часом:\n` +
    `• <i>Сьогодні о 19:00 тренування</i>\n` +
    `• <i>15.11 12:00 стоматолог</i>\n\n` +
    `☀️ <b>Ранковий дайджест:</b> щоранку о 09:00 бот надсилає зведення завдань.`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl);
}

async function answerCallbackQuery(botToken, queryId, text) {
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

function getNowInKyiv() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p = {};
  parts.forEach((x) => (p[x.type] = x.value));
  return {
    year: parseInt(p.year, 10),
    month: parseInt(p.month, 10),
    day: parseInt(p.day, 10),
    hour: parseInt(p.hour === '24' ? '0' : p.hour, 10),
    minute: parseInt(p.minute, 10),
  };
}

function kyivToUtc(year, month, day, hour, minute) {
  const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
  const targetLocalTime = new Date(isoStr).getTime();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(isoStr));
  const p = {};
  parts.forEach((x) => (p[x.type] = x.value));
  const kyivAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour === '24' ? 0 : p.hour,
    p.minute,
    p.second
  );
  const offsetMs = kyivAsUtc - targetLocalTime;
  return new Date(targetLocalTime - offsetMs);
}

function getKyivDayRange(dayOffset = 0) {
  const now = getNowInKyiv();
  const d = new Date(Date.UTC(now.year, now.month - 1, now.day + dayOffset));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  const startUtc = kyivToUtc(y, m, day, 0, 0);
  const endUtc = kyivToUtc(y, m, day, 23, 59);
  const formattedDate = `${String(day).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
  return { startIso: startUtc.toISOString(), endIso: endUtc.toISOString(), formattedDate };
}

async function getRemindersForRange(chatId, startIso, endIso) {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', String(chatId))
    .gte('remind_at', startIso)
    .lte('remind_at', endIso)
    .order('remind_at', { ascending: true });
  return data || [];
}

async function handleTodayCommand(chatId, botToken, siteUrl) {
  const { startIso, endIso, formattedDate } = getKyivDayRange(0);
  const list = await getRemindersForRange(chatId, startIso, endIso);

  if (list.length === 0) {
    const text =
      `📅 <b>Плани на сьогодні (${formattedDate}):</b>\n\n` +
      `🎉 <i>На сьогодні немає запланованих справ!</i>\n\n` +
      `Гарного дня! Надішліть повідомлення, якщо потрібно щось запланувати.`;
    await sendBotMessage(botToken, chatId, text, siteUrl);
    return;
  }

  const itemsText = list
    .map((r, i) => {
      const time = new Date(r.remind_at).toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Kyiv',
      });
      const status = r.is_sent ? '✅' : '⏰';
      const tag = r.category && r.category !== 'main' ? ` #${r.category}` : '';
      return `${i + 1}. ${status} <b>${time}</b> — ${r.title}${tag}`;
    })
    .join('\n');

  const text =
    `📅 <b>Ваші плани на сьогодні (${formattedDate}):</b>\n\n` +
    itemsText +
    `\n\n💡 <i>Всього справ: ${list.length}</i>`;

  await sendBotMessage(botToken, chatId, text, siteUrl);
}

async function handleTomorrowCommand(chatId, botToken, siteUrl) {
  const { startIso, endIso, formattedDate } = getKyivDayRange(1);
  const list = await getRemindersForRange(chatId, startIso, endIso);

  if (list.length === 0) {
    const text =
      `🌅 <b>Плани на завтра (${formattedDate}):</b>\n\n` +
      `🏖 <i>На завтра нагадувань не заплановано.</i>`;
    await sendBotMessage(botToken, chatId, text, siteUrl);
    return;
  }

  const itemsText = list
    .map((r, i) => {
      const time = new Date(r.remind_at).toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Kyiv',
      });
      return `${i + 1}. ⏰ <b>${time}</b> — ${r.title}`;
    })
    .join('\n');

  const text =
    `🌅 <b>Ваші плани на завтра (${formattedDate}):</b>\n\n` +
    itemsText;

  await sendBotMessage(botToken, chatId, text, siteUrl);
}

async function handleWeekCommand(chatId, botToken, siteUrl) {
  const start = getKyivDayRange(0).startIso;
  const end = getKyivDayRange(7).endIso;
  const list = await getRemindersForRange(chatId, start, end);

  if (list.length === 0) {
    const text = `📆 <b>Розклад на найближчі 7 днів:</b>\n\n🏖 <i>Запланованих справ немає.</i>`;
    await sendBotMessage(botToken, chatId, text, siteUrl);
    return;
  }

  const groups = {};
  list.forEach((r) => {
    const dStr = new Date(r.remind_at).toLocaleDateString('uk-UA', {
      timeZone: 'Europe/Kyiv',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
    if (!groups[dStr]) groups[dStr] = [];
    groups[dStr].push(r);
  });

  const lines = Object.entries(groups)
    .map(([dateLabel, items]) => {
      const subs = items
        .map((it) => {
          const time = new Date(it.remind_at).toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Kyiv',
          });
          return `  • <b>${time}</b> — ${it.title}`;
        })
        .join('\n');
      return `📌 <b>${dateLabel}:</b>\n${subs}`;
    })
    .join('\n\n');

  const text = `📆 <b>Розклад на найближчі 7 днів:</b>\n\n` + lines;
  await sendBotMessage(botToken, chatId, text, siteUrl);
}

function tryParseQuickReminder(text) {
  let workingText = text.trim();
  const now = getNowInKyiv();

  let hours, minutes;
  const colonTimeMatch = workingText.match(/(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)/);
  const wordTimeMatch =
    !colonTimeMatch &&
    workingText.match(/(?:(?<!\p{L})(?:о|об)\s+)([01]?\d|2[0-3])(?::([0-5]\d))?(?!\d)/iu);

  if (colonTimeMatch) {
    hours = parseInt(colonTimeMatch[1], 10);
    minutes = parseInt(colonTimeMatch[2], 10);
    workingText = workingText.replace(colonTimeMatch[0], ' ');
  } else if (wordTimeMatch) {
    hours = parseInt(wordTimeMatch[1], 10);
    minutes = wordTimeMatch[2] ? parseInt(wordTimeMatch[2], 10) : 0;
    workingText = workingText.replace(wordTimeMatch[0], ' ');
  }

  const fullDateMatch = workingText.match(
    /(?<!\d)(0?[1-9]|[12]\d|3[01])[./](0?[1-9]|1[0-2])[./](\d{4})(?!\d)/
  );
  const shortDateMatch =
    !fullDateMatch &&
    workingText.match(/(?<!\d)(0?[1-9]|[12]\d|3[01])[./](0?[1-9]|1[0-2])(?!\d)/);

  const isToday = /(?<!\p{L})сьогодні(?!\p{L})/iu.test(workingText);
  const isTomorrow = /(?<!\p{L})завтра(?!\p{L})/iu.test(workingText);
  const isDayAfter = /(?<!\p{L})післязавтра(?!\p{L})/iu.test(workingText);

  if (
    hours === undefined &&
    !fullDateMatch &&
    !shortDateMatch &&
    !isToday &&
    !isTomorrow &&
    !isDayAfter
  ) {
    return null;
  }

  let targetYear, targetMonth, targetDay;

  if (fullDateMatch) {
    targetDay = parseInt(fullDateMatch[1], 10);
    targetMonth = parseInt(fullDateMatch[2], 10);
    targetYear = parseInt(fullDateMatch[3], 10);
    workingText = workingText.replace(fullDateMatch[0], ' ');
  } else if (shortDateMatch) {
    targetDay = parseInt(shortDateMatch[1], 10);
    targetMonth = parseInt(shortDateMatch[2], 10);
    targetYear = now.year;
    if (targetMonth < now.month || (targetMonth === now.month && targetDay < now.day)) {
      targetYear += 1;
    }
    workingText = workingText.replace(shortDateMatch[0], ' ');
  } else if (isDayAfter) {
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day + 2));
    targetYear = d.getUTCFullYear();
    targetMonth = d.getUTCMonth() + 1;
    targetDay = d.getUTCDate();
  } else if (isTomorrow) {
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day + 1));
    targetYear = d.getUTCFullYear();
    targetMonth = d.getUTCMonth() + 1;
    targetDay = d.getUTCDate();
  } else {
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day));
    if (hours !== undefined) {
      if (hours < now.hour || (hours === now.hour && minutes <= now.minute)) {
        d.setUTCDate(d.getUTCDate() + 1);
      }
    }
    targetYear = d.getUTCFullYear();
    targetMonth = d.getUTCMonth() + 1;
    targetDay = d.getUTCDate();
  }

  if (hours === undefined) {
    hours = 10;
    minutes = 0;
  }

  let title = workingText
    .replace(/(?<!\p{L})(нагадай|нагадати|\/remind|завтра|післязавтра|сьогодні|о|об)(?!\p{L})/giu, '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!title) title = 'Швидке нагадування';

  const utcDate = kyivToUtc(targetYear, targetMonth, targetDay, hours, minutes);

  return {
    title,
    remind_at: utcDate.toISOString(),
  };
}

async function handleQuickReminder(chatId, parsed, botToken, siteUrl) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

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
    `📌 <b>${parsed.title}</b>\n` +
    `📅 Дата: <b>${dateFormatted}</b>\n` +
    `⏰ Час: <b>${timeFormatted}</b>`;

  await sendBotMessage(botToken, chatId, replyText, siteUrl);
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

      if (cq.data === 'get_code' && chatId) {
        await answerCallbackQuery(botToken, cq.id);
        await sendAuthCode(chatId, cq.from, botToken, siteUrl);
      } else if (cq.data.startsWith('done_')) {
        const reminderId = cq.data.replace('done_', '');
        const supabase = getSupabaseClient();
        if (supabase) {
          await supabase.from('reminders').update({ is_sent: true }).eq('id', reminderId);
        }
        await answerCallbackQuery(botToken, cq.id, '✅ Нагадування виконано!');
      } else if (cq.data.startsWith('snooze_')) {
        const reminderId = cq.data.replace('snooze_', '');
        const supabase = getSupabaseClient();
        if (supabase) {
          const snoozeDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await supabase
            .from('reminders')
            .update({ remind_at: snoozeDate, is_sent: false })
            .eq('id', reminderId);
        }
        await answerCallbackQuery(botToken, cq.id, '💤 Відкладено на 15 хв!');
      } else {
        await answerCallbackQuery(botToken, cq.id);
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

    // 1. Auth code requests
    const isCodeRequest =
      lowerText.startsWith('/code') ||
      lowerText.startsWith('/login') ||
      lowerText.startsWith('/start login') ||
      lowerText.startsWith('/start code') ||
      lowerText === 'код' ||
      text === '🔑 Код для входу';

    if (isCodeRequest) {
      await sendAuthCode(chatId, message.from, botToken, siteUrl);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Today command
    if (lowerText === '/today' || lowerText === '/сьогодні' || lowerText === 'сьогодні') {
      await handleTodayCommand(chatId, botToken, siteUrl);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Tomorrow command
    if (lowerText === '/tomorrow' || lowerText === '/завтра' || lowerText === 'завтра') {
      await handleTomorrowCommand(chatId, botToken, siteUrl);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Week schedule command
    if (lowerText === '/week' || lowerText === '/тиждень' || lowerText === 'тиждень') {
      await handleWeekCommand(chatId, botToken, siteUrl);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Help command
    if (lowerText === '/help' || lowerText === '/довідка' || lowerText === 'допомога') {
      await sendHelp(chatId, botToken, siteUrl);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Quick reminder parser
    const quickReminder = tryParseQuickReminder(text);
    if (quickReminder) {
      await handleQuickReminder(chatId, quickReminder, botToken, siteUrl);
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
