import { sendBotMessage } from '../telegram.ts';
import { getSupabaseClient } from '../db.ts';

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

export async function sendAuthCode(
  chatId: string | number,
  user: any,
  botToken: string,
  siteUrl: string
) {
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
