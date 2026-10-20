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
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.2,
      environment: import.meta.env.MODE || 'production',
    });

    // Emit initial verification metrics requested by Sentry setup
    if (Sentry.metrics) {
      Sentry.metrics.count('button_click', 1);
      Sentry.metrics.gauge('page_load_time', 150);
      Sentry.metrics.distribution('response_time', 200);
    }
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
