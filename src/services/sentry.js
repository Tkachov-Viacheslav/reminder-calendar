import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn =
    import.meta.env.VITE_SENTRY_DSN ||
    import.meta.env.SENTRY_DSN ||
    '';

  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.2,
      environment: import.meta.env.MODE || 'production',
    });
  } catch (err) {
    console.warn('Failed to initialize Sentry:', err);
  }
}

export function captureClientError(error, errorInfo) {
  try {
    Sentry.captureException(error, { extra: errorInfo });
  } catch {}
}
