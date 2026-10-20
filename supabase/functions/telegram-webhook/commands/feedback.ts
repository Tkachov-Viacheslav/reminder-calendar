import { sendBotMessage } from '../telegram.ts';

const SENTRY_DSN_KEY = 'a42e147c09623a08e739b75addce6227';
const SENTRY_PROJECT_ID = '4512286175461456';
const SENTRY_ENVELOPE_URL = `https://o4512286173626368.ingest.de.sentry.io/api/${SENTRY_PROJECT_ID}/envelope/?sentry_version=7&sentry_key=${SENTRY_DSN_KEY}`;

export async function handleBugReportCommand(
  chatId: number | string,
  message: any,
  botToken: string,
  siteUrl: string
): Promise<void> {
  const from = message.from || {};
  const text = (message.text || message.caption || '').trim();
  const photoList = message.photo;

  // Очищаємо текст від команд
  let reportText = text
    .replace(/^\/(?:bug|feedback|помилка|відгук)(?:@\w+)?/i, '')
    .trim();

  // Якщо користувач надіслав просто /bug без тексту і без фото
  if (!reportText && (!photoList || photoList.length === 0)) {
    await sendBotMessage(
      botToken,
      chatId,
      `📸 <b>Звіт про помилку або відгук</b>\n\n` +
      `Ви можете надіслати сюди будь-який <b>скріншот із коментарем</b> (наприклад, знімок консолі, меню або проблеми) або просто текст із командою <code>/bug ваш опис</code>.\n\n` +
      `Всі звіти разом зі скріншотами автоматично надсилаються розробникам у Sentry!`,
      siteUrl
    );
    return;
  }

  if (!reportText) {
    reportText = 'Скріншот без текстового опису з Telegram-бота';
  }

  try {
    const eventId = crypto.randomUUID().replace(/-/g, '');
    const sentAt = new Date().toISOString();
    const userName =
      [from.first_name, from.last_name].filter(Boolean).join(' ') ||
      from.username ||
      `User ${from.id}`;
    const userContact = from.username ? `@${from.username}` : `tg:${from.id}`;

    let photoBytes: Uint8Array | null = null;
    let photoFileName = 'telegram_screenshot.jpg';

    if (Array.isArray(photoList) && photoList.length > 0) {
      const bestPhoto = photoList[photoList.length - 1];
      const getFileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${bestPhoto.file_id}`
      );
      const fileData = await getFileRes.json();
      if (fileData?.ok && fileData.result?.file_path) {
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        const fileBuffer = await fetch(fileUrl).then((r) => r.arrayBuffer());
        photoBytes = new Uint8Array(fileBuffer);
        const ext = fileData.result.file_path.split('.').pop() || 'jpg';
        photoFileName = `telegram_${bestPhoto.file_unique_id || 'photo'}.${ext}`;
      }
    }

    const header = JSON.stringify({ event_id: eventId, sent_at: sentAt });
    const itemHeader = JSON.stringify({ type: 'feedback', content_type: 'application/json' });
    const itemPayload = JSON.stringify({
      contexts: {
        feedback: {
          message: reportText,
          name: `${userName} (Telegram Bot)`,
          contact_email: userContact,
        },
      },
      tags: {
        source: 'telegram_bot',
        telegram_id: String(from.id),
      },
    });

    const encoder = new TextEncoder();
    let bodyBytes: Uint8Array;

    if (photoBytes) {
      const attachHeader = JSON.stringify({
        type: 'attachment',
        length: photoBytes.byteLength,
        filename: photoFileName,
        content_type: 'image/jpeg',
        attachment_type: 'event.attachment',
      });

      const part1 = encoder.encode(`${header}\n${itemHeader}\n${itemPayload}\n${attachHeader}\n`);
      const part3 = encoder.encode('\n');

      bodyBytes = new Uint8Array(part1.byteLength + photoBytes.byteLength + part3.byteLength);
      bodyBytes.set(part1, 0);
      bodyBytes.set(photoBytes, part1.byteLength);
      bodyBytes.set(part3, part1.byteLength + photoBytes.byteLength);
    } else {
      bodyBytes = encoder.encode(`${header}\n${itemHeader}\n${itemPayload}\n`);
    }

    const sentryRes = await fetch(SENTRY_ENVELOPE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: bodyBytes,
    });

    if (sentryRes.ok) {
      await sendBotMessage(
        botToken,
        chatId,
        `✅ <b>Звіт про помилку успішно надіслано!</b>\n\n` +
        `📝 <b>Опис:</b> ${reportText.slice(0, 150)}${reportText.length > 150 ? '...' : ''}\n` +
        (photoBytes ? `🖼 <b>Скріншот:</b> додано (${(photoBytes.byteLength / 1024).toFixed(1)} КБ)\n` : '') +
        `🆔 <b>ID звернення:</b> <code>${eventId}</code>\n\n` +
        `Розробники повідомлені та вже розглядають проблему. Дякуємо!`,
        siteUrl
      );
    } else {
      console.error('Sentry feedback envelope error:', sentryRes.status, await sentryRes.text());
      await sendBotMessage(
        botToken,
        chatId,
        `⚠️ Не вдалося зареєструвати звіт у системі Sentry. Спробуйте пізніше.`,
        siteUrl
      );
    }
  } catch (err) {
    console.error('Failed to handle bug report:', err);
    await sendBotMessage(
      botToken,
      chatId,
      `⚠️ Сталася помилка при відправці звіту. Спробуйте пізніше.`,
      siteUrl
    );
  }
}
