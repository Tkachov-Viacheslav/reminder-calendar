import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_SYSTEM_INSTRUCTION = `Ти — інтелектуальний планувальник нагадувань та подій у календарі.
Твоє завдання — проаналізувати поле userInput із наданого JSON та створити ОДНЕ АБО ДЕКІЛЬКА нагадувань.

ПРАВИЛА РОЗПІЗНАВАННЯ:
1. КІЛЬКА НАГАДУВАНЬ: Якщо користувач перелічує кілька справ, подій чи пунктів розкладу (наприклад: "о 10:00 зустріч, о 14:00 обід, а в п'ятницю звіт") — створи окремий об'єкт для КОЖНОЇ події у масиві reminders. Якщо вказано одну подію — поверни масив reminders з 1 елементом.
2. Встановлюй status="SUCCESS", якщо розпізнано хоча б одну подію/завдання, та заповни message ("Сформовано X нагадувань").
3. Встановлюй status="OUT_OF_SCOPE" ТІЛЬКИ якщо повідомлення є абсолютно стороннім (наприклад: "яка погода", "хто президент", "розкажи анекдот", "привіт як справи", філософські бесіди).
4. ДАТА ТА ЧАС: Обчисли точну дату (YYYY-MM-DD) та час (HH:MM) для кожної події на основі currentDateTime. Якщо дата відносна ("завтра", "у середу") — визнач відповідну календарну дату від currentDateTime. Якщо час не вказано — за замовчуванням 10:00.
5. УЧАСНИКИ: Якщо для події згадано людину за ім'ям або ніком ("Слава", "Марія", "@username"), знайди її у списку teamMembers та додай telegram_id у taggedMemberIds.
6. ШАБЛОНИ: Якщо користувач згадує назву з availableTemplates ("за шаблоном Звіт"), вкажи matchedTemplateId, підстав категорію та підзавдання шаблону.
7. ПІДЗАВДАННЯ: Якщо користувач називає перелік дій/пунктів для події — розбий їх на масив items.
8. Мова завжди українська.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: {
      type: "STRING",
      enum: ["SUCCESS", "OUT_OF_SCOPE", "ERROR"],
      description: "SUCCESS якщо завдання розпізнано, OUT_OF_SCOPE якщо запит не стосується планування."
    },
    message: {
      type: "STRING",
      description: "Коротке пояснення для користувача українською мовою."
    },
    reminders: {
      type: "ARRAY",
      description: "Список сформованих нагадувань (одне або декілька)",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Назва нагадування" },
          dateStr: { type: "STRING", description: "Дата у форматі YYYY-MM-DD" },
          timeStr: { type: "STRING", description: "Час у форматі HH:MM" },
          category: { type: "STRING", description: "Категорія" },
          remindBefore: { type: "INTEGER", description: "За скільки хвилин нагадати (0, 15, 30, 60)" },
          repeatType: {
            type: "STRING",
            enum: ["none", "daily", "weekdays", "weekly", "monthly"],
            description: "Тип повторення"
          },
          items: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Список пунктів чекліста / підзавдань"
          },
          matchedTemplateId: { type: "STRING", description: "ID обраного шаблону (якщо є)" },
          taggedMemberIds: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Telegram ID учасників, яких треба тегнути"
          }
        },
        required: ["title", "dateStr", "timeStr"]
      }
    }
  },
  required: ["status", "message"]
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const { text, context, apiKey } = await req.json();

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Text prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (text.length > 2000) {
      return new Response(
        JSON.stringify({
          error: 'PROMPT_TOO_LONG',
          message: 'Запит занадто довгий (максимум 2000 символів)',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      'anonymous';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://dwzswscabsphwprptnos.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: rateCheck } = await supabase.rpc('check_and_register_ai_rate_limit', {
      p_ip: clientIp,
    });

    if (rateCheck && rateCheck.allowed === false) {
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Забагато запитів до ШІ. Зачекайте ${rateCheck.retry_after} сек.`,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateCheck.retry_after),
          },
        }
      );
    }

    const geminiKey =
      apiKey || Deno.env.get('GEMINI_API_KEY') || 'AIzaSyDnD6HQAJzrrxv_Nuv3BOYbXzi1Uufc_eQ';

    if (!geminiKey) {
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_KEY_REQUIRED',
          message: 'Будь ласка, вкажіть Gemini API Key у налаштуваннях або в секретах Supabase.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const promptPayload = {
      userInput: text,
      currentDateTime: context?.now || new Date().toISOString(),
      availableCategories: context?.categories || [],
      availableTemplates: (context?.templates || []).map((t: any) => ({
        id: t.id,
        name: t.name || t.title,
        category: t.category,
        items: (t.items || []).map((it: any) => (typeof it === 'string' ? it : it.text)),
        remindBefore: t.remindBefore,
        timeStr: t.timeStr,
      })),
      teamMembers: (context?.teamMembers || []).map((m: any) => ({
        telegram_id: String(m.telegram_id || m.id || ''),
        name: m.first_name || m.name || '',
        username: m.username || '',
      })),
      currentWorkspace: context?.currentWorkspace || 'personal',
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(promptPayload) }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_ERROR',
          message: `Помилка Gemini API: ${geminiRes.status}`,
          details: errText,
        }),
        {
          status: geminiRes.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData?.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p: any) => p.text && !p.thought) || parts[parts.length - 1];
    let rawOutput = (textPart?.text || '').trim();
    rawOutput = rawOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed = null;
    try {
      parsed = rawOutput ? JSON.parse(rawOutput) : null;
      if (parsed) {
        if (Array.isArray(parsed.reminders)) {
          parsed.reminder = parsed.reminders[0] || null;
        } else if (parsed.reminder) {
          parsed.reminders = [parsed.reminder];
        } else {
          parsed.reminders = [];
        }
      }
    } catch (parseErr) {
      console.error('JSON parse error from Gemini:', rawOutput, parseErr);
    }

    return new Response(JSON.stringify(parsed || { status: 'ERROR', message: 'Не вдалося розібрати відповідь ШІ' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
