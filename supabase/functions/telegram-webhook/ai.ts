const GEMINI_SYSTEM_INSTRUCTION = `Ти — інтелектуальний планувальник нагадувань та розкладу для Telegram-бота календаря.
Твоє завдання — проаналізувати текст повідомлення від користувача та сформувати ОДНЕ АБО ДЕКІЛЬКА нагадувань.

ПРАВИЛА РОЗПІЗНАВАННЯ:
1. КІЛЬКА НАГАДУВАНЬ: Якщо користувач перелічує кілька справ або пунктів розкладу (наприклад: "завтра о 10 нарада, а в п'ятницю о 18 здати звіт") — створи окремий об'єкт для КОЖНОЇ події у масиві reminders. Якщо вказано одну справу — поверни масив з 1 елементом.
2. Встановлюй status="SUCCESS", якщо розпізнано хоча б одне нагадування або завдання, та вкажи message.
3. Встановлюй status="OUT_OF_SCOPE" ТІЛЬКИ якщо повідомлення абсолютно не містить жодного завдання чи наміру спланувати справу (наприклад: "яка погода", "хто ти", "розкажи анекдот", "привіт як справи").
4. ДАТА ТА ЧАС: Обчисли точну дату (YYYY-MM-DD) та час (HH:MM) для кожної події відносно currentDateTime.
   - "завтра", "післязавтра", "у п'ятницю", "через 2 години" — визнач точну календарну дату.
   - Якщо час не вказано взагалі — став 10:00.
5. ПІДЗАВДАННЯ: Якщо користувач називає перелік дій (наприклад: "купити молоко, хліб, сир") — розбий їх на масив items.
6. КАТЕГОРІЯ: За замовчуванням "main" (або відповідна, якщо підходить за контекстом: work, personal, study тощо).
7. Мова завжди українська.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: {
      type: "STRING",
      enum: ["SUCCESS", "OUT_OF_SCOPE", "ERROR"],
      description: "SUCCESS якщо розпізнано завдання, OUT_OF_SCOPE якщо сторонній запит."
    },
    message: {
      type: "STRING",
      description: "Коротке пояснення українською мовою."
    },
    reminders: {
      type: "ARRAY",
      description: "Список сформованих нагадувань",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Назва справи" },
          dateStr: { type: "STRING", description: "Дата YYYY-MM-DD" },
          timeStr: { type: "STRING", description: "Час HH:MM" },
          category: { type: "STRING", description: "Категорія (main, work тощо)" },
          remindBefore: { type: "INTEGER", description: "За скільки хвилин нагадати (0, 15, 30)" },
          repeatType: {
            type: "STRING",
            enum: ["none", "daily", "weekdays", "weekly", "monthly"],
            description: "Тип повторення"
          },
          items: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Підзавдання або пункти списку"
          }
        },
        required: ["title", "dateStr", "timeStr"]
      }
    }
  },
  required: ["status", "message"]
};

export interface AiParsedResult {
  status: 'SUCCESS' | 'OUT_OF_SCOPE' | 'ERROR';
  message: string;
  reminders?: Array<{
    title: string;
    dateStr: string;
    timeStr: string;
    category?: string;
    remindBefore?: number;
    repeatType?: string;
    items?: string[];
  }>;
}

export async function parseTelegramReminderWithAi(
  text: string,
  context: { now: string; categories?: any[]; templates?: any[] }
): Promise<AiParsedResult> {
  const geminiKey = Deno.env.get('GEMINI_API_KEY') || '';
  if (!geminiKey) {
    console.error('GEMINI_API_KEY is not configured in environment');
    return {
      status: 'ERROR',
      message: 'GEMINI_API_KEY не налаштовано на сервері',
    };
  }

  const promptPayload = {
    userInput: text,
    currentDateTime: context.now,
    availableCategories: context.categories || [],
    availableTemplates: context.templates || [],
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(promptPayload) }] }],
      systemInstruction: {
        role: 'system',
        parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const geminiData = await response.json();
  const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawContent) {
    throw new Error('Порожня відповідь від Gemini API');
  }

  return JSON.parse(rawContent) as AiParsedResult;
}
