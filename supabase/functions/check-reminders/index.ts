import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  BOT_TOKEN,
  CRON_SECRET,
  SITE_URL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from './config.ts';
import { getNextRepeatDate, sleep } from './utils.ts';
import { sendTelegramAlert, sendTeamReminderAlert } from './alerts.ts';
import { handleMorningDigests } from './digests.ts';

async function processScheduledReminder(
  supabase: any,
  reminder: any
): Promise<boolean> {
  let ok = false;
  if (reminder.team_id) {
    ok = await sendTeamReminderAlert(supabase, BOT_TOKEN, SITE_URL, reminder);
  } else if (reminder.user_id && reminder.user_id !== 'guest') {
    ok = await sendTelegramAlert(BOT_TOKEN, reminder.user_id, reminder);
  }

  if (ok) {
    const nextDate = getNextRepeatDate(reminder.remind_at, reminder.repeat_type);
    if (nextDate) {
      await supabase
        .from('reminders')
        .update({ remind_at: nextDate, is_sent: false })
        .eq('id', reminder.id);
    } else {
      await supabase.from('reminders').update({ is_sent: true }).eq('id', reminder.id);
    }
  }
  return ok;
}

async function cleanupEphemeralMessages(supabase: any, botToken: string) {
  try {
    const now = new Date().toISOString();
    const { data: messages } = await supabase
      .from('bot_ephemeral_messages')
      .select('id, chat_id, message_id')
      .lte('delete_at', now)
      .limit(60);

    if (!messages || messages.length === 0) return;

    for (const msg of messages) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: msg.chat_id,
            message_id: Number(msg.message_id),
          }),
        });
      } catch (err) {
        console.warn(`Failed to delete message ${msg.message_id}:`, err);
      }
    }

    const ids = messages.map((m: any) => m.id);
    await supabase.from('bot_ephemeral_messages').delete().in('id', ids);
  } catch (err) {
    console.error('Failed to cleanup ephemeral messages:', err);
  }
}

Deno.serve(async (req: Request) => {
  const secretHeader = req.headers.get('x-cron-secret');
  if (CRON_SECRET && secretHeader !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured in Supabase secrets');
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

  // 1. Morning Digest for users
  await handleMorningDigests(supabase, BOT_TOKEN, SITE_URL);

  // 2. Cleanup ephemeral service messages in group chats
  await cleanupEphemeralMessages(supabase, BOT_TOKEN);

  // 3. Scheduled Reminders
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_sent', false)
    .lte('remind_at', now);

  if (error || !reminders || reminders.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sentCount = 0;
  for (const item of reminders) {
    const ok = await processScheduledReminder(supabase, item);
    if (ok) sentCount++;
    await sleep(40);
  }

  return new Response(JSON.stringify({ processed: sentCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
