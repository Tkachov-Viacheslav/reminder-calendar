import * as Sentry from '@sentry/react';

export interface SubmitFeedbackParams {
  message: string;
  name?: string;
  contact?: string;
  file?: File | null;
}

export interface SubmitFeedbackResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Відправляє користувацький відгук або звіт про помилку до Sentry з підтримкою вкладеного зображення
 */
export async function submitUserFeedback({
  message,
  name,
  contact,
  file,
}: SubmitFeedbackParams): Promise<SubmitFeedbackResult> {
  const cleanMessage = (message || '').trim();
  if (!cleanMessage) {
    return { success: false, error: 'Повідомлення не може бути порожнім' };
  }

  try {
    let attachment: { filename: string; data: Uint8Array; contentType: string } | null = null;

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      attachment = {
        filename: file.name || 'screenshot.png',
        data: new Uint8Array(arrayBuffer),
        contentType: file.type || 'image/png',
      };
    }

    const eventId = Sentry.withScope((scope) => {
      if (attachment) {
        scope.addAttachment(attachment);
      }
      return Sentry.captureFeedback({
        message: cleanMessage,
        name: name?.trim() || undefined,
        email: contact?.trim() || undefined,
      });
    });

    await Sentry.flush(2000).catch(() => {});

    return { success: true, eventId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Не вдалося надіслати відгук';
    console.error('Failed to submit user feedback:', err);
    return { success: false, error: errorMsg };
  }
}
