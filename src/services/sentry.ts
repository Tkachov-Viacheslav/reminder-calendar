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
        Sentry.browserProfilingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
        Sentry.consoleLoggingIntegration({
          levels: ['log', 'info', 'warn', 'error'],
        }),
      ],
      tracesSampleRate: 1.0,
      tracePropagationTargets: ['localhost', /^https:\/\/dwzswscabsphwprptnos\.supabase\.co/],
      profileSessionSampleRate: 1.0,
      profileLifecycle: 'trace',
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      release: import.meta.env.VITE_SENTRY_RELEASE || 'reminder-calendar@1.0.1',
      environment: import.meta.env.MODE || 'production',
    });

    // Відправляємо структурований лог для верифікації пайплайну Sentry Logs
    Sentry.logger.info('Календар-нагадування успішно ініціалізовано', {
      app: 'reminder-calendar',
      version: '1.0.1',
    });
    Sentry.captureMessage('Sentry logging успішно підключено', 'info');
    Sentry.flush(2000).catch(() => {});

    // Автоматично запускаємо тестовий Root Span для формування першого профілю
    setTimeout(() => {
      triggerManualProfile().catch(() => {});
    }, 1500);

    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        triggerSentryProfile?: () => Promise<void>;
        triggerTestAgentTrace?: () => Promise<string>;
      };
      win.triggerSentryProfile = triggerManualProfile;
      win.triggerTestAgentTrace = triggerTestAgentTrace;
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

export function setConversationId(id: string | null): void {
  try {
    if (typeof Sentry.setConversationId === 'function') {
      Sentry.setConversationId(id);
    }
  } catch (err) {
    console.warn('Failed to set conversation ID in Sentry:', err);
  }
}

export function setSentryUser(
  user: { id?: string; username?: string; email?: string } | null
): void {
  try {
    if (user) {
      Sentry.setUser(user);
    } else {
      Sentry.setUser(null);
    }
  } catch {}
}

export interface AgentTraceParams {
  agentName: string;
  conversationId: string;
  model?: string;
  provider?: string;
  inputPrompt: string;
  systemInstruction?: string;
}

export interface AgentTraceResult {
  output?: string;
  usage?: {
    promptTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export async function traceAgentExecution<T extends AgentTraceResult>(
  params: AgentTraceParams,
  fn: () => Promise<T>
): Promise<T> {
  const {
    agentName,
    conversationId,
    model = 'gemini-2.5-flash',
    provider = 'google-genai',
    inputPrompt,
    systemInstruction,
  } = params;

  setConversationId(conversationId);

  return await Sentry.startSpan(
    {
      name: `invoke_agent ${agentName}`,
      op: 'gen_ai.invoke_agent',
      attributes: {
        'gen_ai.operation.name': 'invoke_agent',
        'gen_ai.agent.name': agentName,
        'gen_ai.conversation.id': conversationId,
      },
    },
    async (agentSpan) => {
      try {
        const inputMessages = JSON.stringify([
          {
            role: 'user',
            parts: [{ type: 'text', content: inputPrompt }],
          },
        ]);

        const result = await Sentry.startSpan(
          {
            name: `chat ${model}`,
            op: 'gen_ai.chat',
            attributes: {
              'gen_ai.operation.name': 'chat',
              'gen_ai.agent.name': agentName,
              'gen_ai.provider.name': provider,
              'gen_ai.request.model': model,
              'gen_ai.conversation.id': conversationId,
              'gen_ai.input.messages': inputMessages,
              ...(systemInstruction ? { 'gen_ai.system_instructions': systemInstruction } : {}),
            },
          },
          async (llmSpan) => {
            const res = await fn();

            const outputText =
              res?.output || (typeof res === 'string' ? res : JSON.stringify(res));
            const outputMessages = JSON.stringify([
              {
                role: 'assistant',
                parts: [{ type: 'text', content: outputText }],
              },
            ]);

            llmSpan.setAttributes({
              'gen_ai.response.model': model,
              'gen_ai.output.messages': outputMessages,
              ...(res?.usage?.promptTokens != null
                ? { 'gen_ai.usage.input_tokens': res.usage.promptTokens }
                : {}),
              ...(res?.usage?.outputTokens != null
                ? { 'gen_ai.usage.output_tokens': res.usage.outputTokens }
                : {}),
              ...(res?.usage?.totalTokens != null
                ? { 'gen_ai.usage.total_tokens': res.usage.totalTokens }
                : {}),
            });

            return res;
          }
        );

        agentSpan.setAttribute('gen_ai.agent.status', 'success');
        return result;
      } catch (err: unknown) {
        agentSpan.setStatus({ code: 2, message: 'internal_error' });
        captureClientError(err, {
          agent: agentName,
          conversationId,
          context: 'agent_tracing',
        });
        throw err;
      }
    }
  );
}

export async function triggerManualProfile(): Promise<void> {
  try {
    await Sentry.startSpan(
      {
        name: 'manual-profile-verification',
        op: 'ui.action',
      },
      async (span) => {
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += Math.sqrt(i);
        }
        span.setAttribute('computed_sum', sum);
        span.end();
        await Sentry.flush(3000);
      }
    );
  } catch (e) {
    console.warn('Failed to run manual profile:', e);
  }
}

export async function triggerTestAgentTrace(): Promise<string> {
  const testConvId = `conv_${Date.now()}_test`;
  await traceAgentExecution(
    {
      agentName: 'Reminder Planner Agent',
      conversationId: testConvId,
      model: 'gemini-2.5-flash',
      provider: 'google-genai',
      inputPrompt: 'Нагадай мені завтра о 15:00 підготувати квартальний звіт',
      systemInstruction: 'Ти — інтелектуальний планувальник нагадувань та подій у календарі.',
    },
    async () => {
      await new Promise((r) => setTimeout(r, 150));
      return {
        output: JSON.stringify({
          status: 'SUCCESS',
          message: 'Сформовано 1 нагадування',
          reminders: [
            {
              title: 'Підготувати квартальний звіт',
              dateStr: '2026-10-21',
              timeStr: '15:00',
              category: 'work',
            },
          ],
        }),
        usage: {
          promptTokens: 42,
          outputTokens: 28,
          totalTokens: 70,
        },
      };
    }
  );
  await Sentry.flush(2000);
  return testConvId;
}
