import { BOT_TOKEN, SITE_URL } from './config.ts';
import { getSupabaseClient } from './db.ts';
import { tryParseQuickReminder } from './utils.ts';
import { answerCallbackQuery, sendGroupMessage, getBotChatStatus } from './telegram.ts';
import { ensureTeamExists, recordTeamMember, recordTopic } from './teams.ts';
import {
  sendAuthCode,
  sendWelcome,
  sendHelp,
  handleTodayCommand,
  handleTomorrowCommand,
  handleWeekCommand,
  handleQuickReminder,
  handleUserGroupsCommand,
  handleSyncCommand,
  handleBindCommand,
  handleTopicCommand,
  handleTeamCommand,
  handleAddMemberCommand,
  handleMyChatMemberUpdate,
} from './commands.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured in Supabase secrets');
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const update = await req.json();

    // 1. Callback query handling
    if (update?.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat?.id || cq.from?.id;

      if (cq.data === 'get_code' && chatId) {
        await answerCallbackQuery(BOT_TOKEN, cq.id);
        await sendAuthCode(chatId, cq.from, BOT_TOKEN, SITE_URL);
      } else if (cq.data === 'my_groups' && chatId) {
        await answerCallbackQuery(BOT_TOKEN, cq.id);
        await handleUserGroupsCommand(chatId, BOT_TOKEN, SITE_URL);
      } else if (cq.data.startsWith('done_')) {
        const reminderId = cq.data.replace('done_', '');
        const supabase = getSupabaseClient();
        await supabase.from('reminders').update({ is_sent: true }).eq('id', reminderId);
        await answerCallbackQuery(BOT_TOKEN, cq.id, '✅ Нагадування виконано!');
      } else if (cq.data.startsWith('snooze_')) {
        const reminderId = cq.data.replace('snooze_', '');
        const supabase = getSupabaseClient();
        const snoozeDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabase
          .from('reminders')
          .update({ remind_at: snoozeDate, is_sent: false })
          .eq('id', reminderId);
        await answerCallbackQuery(BOT_TOKEN, cq.id, '💤 Відкладено на 15 хв!');
      } else {
        await answerCallbackQuery(BOT_TOKEN, cq.id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Chat member updates (new user joined group)
    if (update?.chat_member) {
      const cm = update.chat_member;
      const chat = cm.chat;
      const isGroup = chat?.type === 'group' || chat?.type === 'supergroup';
      if (isGroup && cm.new_chat_member?.user && !cm.new_chat_member.user.is_bot) {
        const supabase = getSupabaseClient();
        const teamId = await ensureTeamExists(supabase, chat, cm.from?.id);
        const status = cm.new_chat_member.status;
        if (status === 'member' || status === 'administrator' || status === 'creator') {
          await recordTeamMember(
            supabase,
            teamId,
            cm.new_chat_member.user,
            status === 'administrator' || status === 'creator'
          );
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Bot chat member status updates (bot promoted/demoted/kicked)
    if (update?.my_chat_member) {
      const mcm = update.my_chat_member;
      const chat = mcm.chat;
      const isGroup = chat?.type === 'group' || chat?.type === 'supergroup';
      if (isGroup) {
        await handleMyChatMemberUpdate(mcm, BOT_TOKEN, SITE_URL);
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = update?.message;
    if (!message || !message.chat) return new Response('OK', { status: 200 });

    const chatId = message.chat.id;
    const chatType = message.chat.type;
    const isGroupChat = chatType === 'group' || chatType === 'supergroup';
    const text = (message.text || '').trim();
    const lowerText = text.toLowerCase();
    const threadId = message.message_thread_id;

    // 4. Group Chat Processing
    if (isGroupChat) {
      const supabase = getSupabaseClient();
      const teamId = await ensureTeamExists(supabase, message.chat, message.from?.id);

      if (message.from && !message.from.is_bot) {
        await recordTeamMember(supabase, teamId, message.from);
      }

      if (Array.isArray(message.new_chat_members)) {
        for (const nm of message.new_chat_members) {
          if (!nm.is_bot) {
            await recordTeamMember(supabase, teamId, nm);
          }
        }
      }

      if (message.forum_topic_created) {
        await recordTopic(supabase, teamId, threadId, message.forum_topic_created.name);
      } else if (threadId) {
        await recordTopic(supabase, teamId, threadId, '');
      }

      if (lowerText.startsWith('/bind')) {
        await handleBindCommand(chatId, threadId, text, message.from, BOT_TOKEN, message.message_id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lowerText.startsWith('/topic')) {
        await handleTopicCommand(chatId, threadId, text, message.from, BOT_TOKEN, message.message_id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lowerText.startsWith('/sync')) {
        await handleSyncCommand(chatId, threadId, message.chat, BOT_TOKEN, SITE_URL, message.message_id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lowerText.startsWith('/addmember') || lowerText.startsWith('/додати')) {
        await handleAddMemberCommand(chatId, threadId, text, message.from, BOT_TOKEN, message.message_id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (
        lowerText.startsWith('/team') ||
        lowerText.startsWith('/calendar') ||
        lowerText.startsWith('/календар')
      ) {
        await handleTeamCommand(chatId, threadId, BOT_TOKEN, SITE_URL, message.message_id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (lowerText.startsWith('/groups') || lowerText.startsWith('/групи')) {
        const botStatus = await getBotChatStatus(BOT_TOKEN, chatId);
        const statusBadge = botStatus.isAdmin
          ? `✅ <b>Адміністратор</b> (повний доступ до тем)`
          : `⚠️ <b>Звичайний учасник</b> (призначте адміном для доступу до тем!)`;
        const reply =
          `ℹ️ <b>Статус бота в цьому чаті:</b> ${statusBadge}\n\n` +
          `📋 Щоб переглянути <b>всі ваші підключені групи</b>, перейдіть в особисті повідомлення з ботом:`;
        const keyboard = [
          [{ text: '💬 Переглянути всі мої групи', url: `https://t.me/reminderveter_bot?start=groups` }],
        ];
        await sendGroupMessage(BOT_TOKEN, chatId, reply, threadId, keyboard, message.message_id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Private Chat Commands
    // 5.1 Auth code requests
    const isCodeRequest =
      lowerText.startsWith('/code') ||
      lowerText.startsWith('/login') ||
      lowerText.startsWith('/start login') ||
      lowerText.startsWith('/start code') ||
      lowerText === 'код' ||
      text === '🔑 Код для входу';

    if (isCodeRequest) {
      await sendAuthCode(chatId, message.from, BOT_TOKEN, SITE_URL);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5.2 User groups & bot admin status check
    const isGroupsRequest =
      lowerText.startsWith('/groups') ||
      lowerText.startsWith('/teams') ||
      lowerText.startsWith('/групи') ||
      lowerText.startsWith('/команди') ||
      lowerText.startsWith('/start groups') ||
      lowerText === 'групи' ||
      lowerText === 'команди' ||
      lowerText === 'мої групи' ||
      text === '👥 Мої групи та статус бота';

    if (isGroupsRequest) {
      await handleUserGroupsCommand(chatId, BOT_TOKEN, SITE_URL);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5.3 Today command
    if (lowerText === '/today' || lowerText === '/сьогодні' || lowerText === 'сьогодні') {
      await handleTodayCommand(chatId, BOT_TOKEN, SITE_URL);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5.4 Tomorrow command
    if (lowerText === '/tomorrow' || lowerText === '/завтра' || lowerText === 'завтра') {
      await handleTomorrowCommand(chatId, BOT_TOKEN, SITE_URL);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5.5 Week schedule command
    if (lowerText === '/week' || lowerText === '/тиждень' || lowerText === 'тиждень') {
      await handleWeekCommand(chatId, BOT_TOKEN, SITE_URL);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5.6 Help command
    if (lowerText === '/help' || lowerText === '/довідка' || lowerText === 'допомога') {
      await sendHelp(chatId, BOT_TOKEN, SITE_URL);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5.7 Quick reminder parser
    const quickReminder = tryParseQuickReminder(text);
    if (quickReminder) {
      await handleQuickReminder(chatId, quickReminder, BOT_TOKEN, SITE_URL);
    } else {
      await sendWelcome(chatId, message.from, BOT_TOKEN, SITE_URL);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('OK', { status: 200 });
  }
});
