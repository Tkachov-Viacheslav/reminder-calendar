import { traceAgentExecution } from './sentry';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dwzswscabsphwprptnos.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Очищення будь-яких застарілих користувацьких ключів із браузера
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('reminder_gemini_api_key');
  }
} catch {}

export async function parseReminderWithAi({ text, context, conversationId }) {
  const activeConversationId = conversationId || `conv_planner_${Date.now()}`;

  return await traceAgentExecution(
    {
      agentName: 'Reminder Planner Agent',
      conversationId: activeConversationId,
      model: 'gemini-2.5-flash',
      provider: 'google-genai',
      inputPrompt: text,
      systemInstruction: 'Ти — інтелектуальний планувальник нагадувань та подій у календарі.',
    },
    async () => {
      const endpoint = `${SUPABASE_URL}/functions/v1/ai-planner`;

      const headers = {
        'Content-Type': 'application/json',
      };
      if (SUPABASE_ANON_KEY) {
        headers['apikey'] = SUPABASE_ANON_KEY;
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          context,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.message || data?.error || `Помилка сервера ШІ (${response.status})`;
        const err = new Error(errorMsg);
        err.code = data?.error || 'UNKNOWN_ERROR';
        throw err;
      }

      return {
        ...data,
        output: data?.message || (data?.reminders ? JSON.stringify(data.reminders) : ''),
        usage: data?.usage,
      };
    }
  );
}
