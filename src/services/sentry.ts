import * as Sentry from '@sentry/react';

export const DEFAULT_SENTRY_DSN =
  'https://a42e147c09623a08e739b75addce6227@o4512286173626368.ingest.de.sentry.io/4512286175461456';

export function initSentry(): void {
  const dsn =
    import.meta.env.VITE_SENTRY_DSN ||
    import.meta.env.SENTRY_DSN ||
    import.meta.env.NEXT_PUBLIC_SENTRY_DSN ||
    DEFAULT_SENTRY_DSN;

  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
        Sentry.consoleLoggingIntegration({
          levels: ['log', 'info', 'warn', 'error'],
        }),
      ],
      tracesSampleRate: 0.3,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE || 'production',
    });

    // Відправляємо структурований лог для верифікації пайплайну Sentry Logs
    Sentry.logger.info('Календар-нагадування успішно ініціалізовано', {
      app: 'reminder-calendar',
      version: '1.0.1',
    });
  } catch (err) {
    console.warn('Failed to initialize Sentry:', err);
  }
}

export function captureClientError(error: unknown, errorInfo?: unknown): void {
  try {
    Sentry.captureException(error, { extra: errorInfo as Record<string, unknown> });
  } catch {}
}

export function recordMetric(
  type: 'count' | 'gauge' | 'distribution',
  name: string,
  value = 1
): void {
  try {
    if (Sentry.metrics && typeof Sentry.metrics[type] === 'function') {
      Sentry.metrics[type](name, value);
    }
  } catch {}
}

export function logInfo(message: string, attributes?: Record<string, unknown>): void {
  try {
    Sentry.logger.info(message, attributes);
  } catch {}
}

export function logWarn(message: string, attributes?: Record<string, unknown>): void {
  try {
    Sentry.logger.warn(message, attributes);
  } catch {}
}

export function logError(message: string, attributes?: Record<string, unknown>): void {
  try {
    Sentry.logger.error(message, attributes);
  } catch {}
}
