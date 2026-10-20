import { LOCAL_STORAGE_GEMINI_API_KEY } from '../utils/constants';
import { traceAgentExecution } from './sentry';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dwzswscabsphwprptnos.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function getStoredGeminiApiKey() {
  try {
    const fromStorage = localStorage.getItem(LOCAL_STORAGE_GEMINI_API_KEY);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  } catch {}
  return '';
}

export function setStoredGeminiApiKey(key) {
  try {
    const trimmed = String(key || '').trim();
    if (trimmed) {
      localStorage.setItem(LOCAL_STORAGE_GEMINI_API_KEY, trimmed);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_GEMINI_API_KEY);
    }
  } catch (err) {
    console.error('Failed to save Gemini API key in localStorage:', err);
  }
}

export async function parseReminderWithAi({ text, context, customApiKey, conversationId }) {
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
      const apiKey = (customApiKey || getStoredGeminiApiKey()).trim();
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
          apiKey: apiKey || undefined,
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
