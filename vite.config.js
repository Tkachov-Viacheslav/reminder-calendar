import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-api-handler',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/send-test' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { userId, message } = JSON.parse(body);
                  const botToken = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
                  if (!botToken) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN не вказано' }));
                  }

                  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: userId,
                      text: message || '🔔 Тестове сповіщення від Календаря!',
                      parse_mode: 'HTML',
                    }),
                  });

                  const data = await tgRes.json();
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                } catch (e) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
              return;
            }
            next();
          });
        },
      },
      sentryVitePlugin({
        org: env.SENTRY_ORG || process.env.SENTRY_ORG || 'veter-26',
        project: env.SENTRY_PROJECT || process.env.SENTRY_PROJECT || 'sentry-byzantine-park',
        authToken: env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        disable: !env.SENTRY_AUTH_TOKEN && !process.env.SENTRY_AUTH_TOKEN,
      }),
    ],
    server: {
      port: 3000,
      headers: {
        'Document-Policy': 'js-profiling',
      },
    },
    envPrefix: ['VITE_', 'SENTRY_', 'NEXT_PUBLIC_'],
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('react')) return 'vendor';
            }
          },
        },
      },
    },
  };
});
