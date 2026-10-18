import { escapeHtml, formatCategoryTag } from './utils.ts';

export function buildReminderChecklistText(items: any[]): string {
  if (!Array.isArray(items) || items.length === 0) return '';
  const lines = items.map((it: any) => `${it.done ? '☑️' : '▫️'} ${escapeHtml(it.text)}`);
  return `\n📋 <b>Підзавдання:</b>\n` + lines.join('\n');
}

export function buildTaggedMentionsText(taggedList: any[]): string {
  if (!Array.isArray(taggedList) || taggedList.length === 0) return '';
  return taggedList
    .map((m: any) => {
      if (m.username) {
        const u = String(m.username).replace(/^@/, '');
        return `@${u}`;
      }
      if (m.id) {
        return `<a href="tg://user?id=${m.id}">${escapeHtml(m.name || 'Учасник')}</a>`;
      }
      return escapeHtml(m.name || '');
    })
    .filter(Boolean)
    .join(', ');
}

export async function sendTelegramAlert(botToken: string, chatId: string, reminder: any): Promise<boolean> {
  const timeFormatted = new Date(reminder.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });

  const categoryTag = formatCategoryTag(reminder.category);
  const repeatLabels: Record<string, string> = {
    daily: 'щодня',
    weekdays: 'щобудня (Пн–Пт)',
    weekly: 'щотижня',
    monthly: 'щомісяця',
  };
  const repeatInfo = reminder.repeat_type && reminder.repeat_type !== 'none'
    ? `\n🔁 Повторення: <b>${repeatLabels[reminder.repeat_type] || reminder.repeat_type}</b>`
    : '';

  const checklistText = buildReminderChecklistText(reminder.items);
  const message = [
    `🔔 <b>Нагадування!</b>`,
    ``,
    `📌 <b>${escapeHtml(reminder.title)}</b>`,
    reminder.description ? `📝 ${escapeHtml(reminder.description)}` : '',
    checklistText,
    `⏰ Час: <b>${timeFormatted}</b>${repeatInfo}`,
    `🏷 Категорія: #${categoryTag}`,
  ]
    .filter(Boolean)
    .join('\n');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Виконано', callback_data: `done_${reminder.id}` },
            { text: '💤 Відкласти 15 хв', callback_data: `snooze_${reminder.id}` },
          ],
        ],
      },
    }),
  });

  return response.ok;
}

export async function sendPmAlert(
  botToken: string,
  chatId: string,
  text: string,
  siteUrl: string,
  teamId: string
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Відкрити командний календар', url: `${siteUrl}/?team=${teamId}` }],
          ],
        },
      }),
    });
  } catch {
    // Ignore error if user hasn't started the bot in DM
  }
}

export async function sendTeamReminderAlert(
  supabase: any,
  botToken: string,
  siteUrl: string,
  reminder: any
): Promise<boolean> {
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', reminder.team_id)
    .maybeSingle();

  if (!team || !team.telegram_chat_id) return false;

  const timeFormatted = new Date(reminder.remind_at).toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  });
  const categoryTag = formatCategoryTag(reminder.category);
  const checklistText = buildReminderChecklistText(reminder.items);

  let targetThreadId = reminder.thread_id;
  if (!targetThreadId && team.is_forum) {
    const { data: mapping } = await supabase
      .from('team_category_topics')
      .select('thread_id')
      .eq('team_id', reminder.team_id)
      .eq('category', categoryTag)
      .maybeSingle();
    if (mapping?.thread_id && Number(mapping.thread_id) > 0) {
      targetThreadId = mapping.thread_id;
    }
  }

  const authorName = escapeHtml(reminder.created_by_name || 'Учасник');
  const authorMention = reminder.user_id && reminder.user_id !== 'guest'
    ? `<a href="tg://user?id=${reminder.user_id}">${authorName}</a>`
    : authorName;

  const taggedList: any[] = Array.isArray(reminder.tagged_members) ? reminder.tagged_members : [];
  const taggedMentions = buildTaggedMentionsText(taggedList);

  const groupMessage = [
    `🔔 <b>Командне нагадування!</b>`,
    ``,
    `📌 <b>${escapeHtml(reminder.title)}</b>`,
    reminder.description ? `📝 ${escapeHtml(reminder.description)}` : '',
    checklistText,
    `⏰ Час: <b>${timeFormatted}</b>`,
    `🏷 Категорія: #${categoryTag}`,
    `👤 Автор: ${authorMention}`,
    taggedMentions ? `👥 Відповідальні: ${taggedMentions}` : '',
  ].filter(Boolean).join('\n');

  const groupPayload: any = {
    chat_id: team.telegram_chat_id,
    text: groupMessage,
    parse_mode: 'HTML',
  };
  if (targetThreadId && Number(targetThreadId) > 0) {
    groupPayload.message_thread_id = Number(targetThreadId);
  }

  let groupRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupPayload),
  });

  // Захисний fallback: якщо тема форуму видалена або недоступна
  if (!groupRes.ok && groupPayload.message_thread_id) {
    delete groupPayload.message_thread_id;
    groupRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupPayload),
    });
  }

  const pmRecipients = new Set<string>();
  if (reminder.user_id && reminder.user_id !== 'guest') {
    pmRecipients.add(String(reminder.user_id));
  }
  for (const tm of taggedList) {
    if (tm.id && String(tm.id).match(/^\d+$/)) {
      pmRecipients.add(String(tm.id));
    }
  }

  const pmMessage = [
    `👥 <b>Нагадування з команди «${escapeHtml(team.title || 'Команда')}»:</b>`,
    ``,
    `📌 <b>${escapeHtml(reminder.title)}</b>`,
    reminder.description ? `📝 ${escapeHtml(reminder.description)}` : '',
    checklistText,
    `⏰ Час: <b>${timeFormatted}</b>`,
    `🏷 Категорія: #${categoryTag}`,
  ].filter(Boolean).join('\n');

  for (const pmId of pmRecipients) {
    await sendPmAlert(botToken, pmId, pmMessage, siteUrl, team.id);
  }

  return groupRes.ok;
}
