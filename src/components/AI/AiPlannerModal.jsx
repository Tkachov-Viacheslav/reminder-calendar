import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  AlertTriangle,
  Key,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import {
  parseReminderWithAi,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
} from '../../services/aiService';
import { trackUserAction } from '../../services/analytics';
import { getCategoryMeta } from '../../utils/constants';

const BASE_QUICK_CHIPS = [
  { label: '🌅 План на завтра', prompt: 'Завтра о 10:00 зустріч із партнером, а о 15:30 дзвінок' },
  { label: '📅 Розклад на день', prompt: 'Сьогодні о 13:00 обід, о 16:00 нарада, о 19:00 спортзал' },
  { label: '🛒 Список покупок', prompt: 'Сьогодні о 19:30 зайти в супермаркет: молоко, яйця, хліб, кава' },
  { label: '⏱ Нагадати за 30 хв', prompt: 'У п\'ятницю о 18:00 здати звіт, нагадай за 30 хв' },
];

export function AiPlannerModal({
  isOpen,
  onClose,
  onApplyReminder,
  templates = [],
  teamMembers = [],
  categories = [],
  currentWorkspace = 'personal',
}) {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedReminders, setGeneratedReminders] = useState([]);
  const [aiMessage, setAiMessage] = useState('');
  const [outOfScope, setOutOfScope] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSelectChip = (chipPrompt) => {
    setPrompt(chipPrompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const dynamicChips = [
    ...BASE_QUICK_CHIPS,
    ...(templates || []).slice(0, 3).map((t) => ({
      label: `📋 ${t.title || t.name}`,
      prompt: `Створити подію за шаблоном «${t.title || t.name}» на завтра о 12:00`,
    })),
  ];

  // Setup Web Speech API
  useEffect(() => {
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechClass) {
      setSpeechSupported(true);
      const recognizer = new SpeechClass();
      recognizer.continuous = false;
      recognizer.interimResults = false;
      recognizer.lang = 'uk-UA';

      recognizer.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript) {
          setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognizer.onerror = () => setIsListening(false);
      recognizer.onend = () => setIsListening(false);
      recognitionRef.current = recognizer;

      return () => {
        try {
          recognizer.abort();
        } catch {}
      };
    }
  }, []);

  // Зупиняємо розпізнавання голосу при закритті модального вікна
  useEffect(() => {
    if (!isOpen && isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch {}
    }
  }, [isOpen, isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setErrorMsg('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = prompt.trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');
    setGeneratedReminders([]);
    setOutOfScope(false);
    setAiMessage('');

    const nowStr = new Date().toLocaleString('uk-UA', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    try {
      const result = await parseReminderWithAi({
        text: query,
        context: {
          now: `${nowStr} (ISO: ${new Date().toISOString()})`,
          templates,
          teamMembers,
          categories,
          currentWorkspace,
        },
      });

      if (result.status === 'OUT_OF_SCOPE') {
        setOutOfScope(true);
        setAiMessage(result.message || 'Запит поза межами планування.');
      } else if (result.status === 'SUCCESS') {
        const list = Array.isArray(result.reminders) && result.reminders.length > 0
          ? result.reminders
          : (result.reminder ? [result.reminder] : []);

        if (list.length > 0) {
          setGeneratedReminders(list);
          setAiMessage(result.message || '');
          trackUserAction('ai_planner_generated', { count: list.length });
        } else {
          setErrorMsg('ШІ не зміг сформувати жодної події.');
        }
      } else {
        setErrorMsg(result.message || 'Не вдалося розпізнати завдання.');
      }
    } catch (err) {
      if (err.code === 'GEMINI_API_KEY_REQUIRED' || err.message?.includes('GEMINI_API_KEY_REQUIRED')) {
        setNeedsApiKey(true);
      } else {
        setErrorMsg(err.message || 'Помилка звернення до ШІ.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.shiftKey) {
        // Дозволяємо новий рядок (абзац)
        return;
      }
      e.preventDefault();
      // IME safe submission check
      if (e.nativeEvent?.isComposing || e.isComposing || e.keyCode === 229) {
        return;
      }
      handleSubmit();
    }
  };

  const handleSaveApiKey = () => {
    setStoredGeminiApiKey(inputApiKey);
    setNeedsApiKey(false);
    handleSubmit();
  };

  const handleRemoveReminderItem = (index) => {
    setGeneratedReminders((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmAddAll = () => {
    if (!generatedReminders.length) return;

    const formattedList = generatedReminders.map((r) => {
      const resolvedTagged = (r.taggedMemberIds || [])
        .map((tid) => {
          const found = teamMembers.find((m) => String(m.telegram_id || m.id) === String(tid));
          return found
            ? { id: String(found.telegram_id || found.id), name: found.first_name || found.name, username: found.username || '' }
            : null;
        })
        .filter(Boolean);

      const formattedItems = (r.items || []).map((text, idx) => ({
        id: `it-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        text: String(text),
        done: false,
      }));

      return {
        title: r.title,
        dateStr: r.dateStr,
        timeStr: r.timeStr,
        category: r.category || 'main',
        remindBefore: r.remindBefore ?? 0,
        repeatType: r.repeatType || 'none',
        items: formattedItems,
        taggedMembers: resolvedTagged,
      };
    });

    onApplyReminder(formattedList);
    trackUserAction('ai_planner_plan_applied', { count: formattedList.length });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ ШІ-планувальник розкладу" size="md">
      <div className="space-y-4">
        {/* API Key prompt if missing */}
        {needsApiKey && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
              <Key className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Потрібен Gemini API Key</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Вкажіть ваш безкоштовний ключ від{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 underline font-medium"
              >
                Google AI Studio
              </a>
              :
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={inputApiKey}
                onChange={(e) => setInputApiKey(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <Button size="sm" onClick={handleSaveApiKey} disabled={!inputApiKey.trim()}>
                Зберегти
              </Button>
            </div>
          </div>
        )}

        {/* Input prompt area */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="ai-planner-prompt"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Опишіть одне або кілька завдань, або надиктуйте голосом:
            </label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Enter — надіслати, Ctrl+Enter — новий рядок
            </span>
          </div>
          <div className="relative">
            <textarea
              id="ai-planner-prompt"
              ref={textareaRef}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Наприклад: 'Завтра о 10:00 зустріч з клієнтом, а в п'ятницю о 18:00 звіт по проєкту з шаблоном Звіт'"
              className="w-full p-2.5 pr-20 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none"
            />
            <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? 'Зупинити запис' : 'Голосове введення'}
                  className={`p-1.5 rounded-lg border transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-2 ring-rose-400/50'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!prompt.trim() || isLoading}
                className="px-2.5 py-1.5"
              >
                {isLoading ? (
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick prompt chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
              Підказки:
            </span>
            {dynamicChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectChip(chip.prompt)}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-all shrink-0 cursor-pointer active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>
          {isListening && (
            <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Слухаю вашу команду українською...
            </p>
          )}
        </form>

        {/* Error alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Guardrail: Out of scope alert */}
        {outOfScope && (
          <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ШІ фокусується лише на розкладі</span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
              {aiMessage || 'Будь ласка, вкажіть конкретне завдання, час або шаблон для планування.'}
            </p>
          </div>
        )}

        {/* Success Preview List of Cards */}
        {generatedReminders.length > 0 && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Згенеровано ШІ ({generatedReminders.length})
                </span>
                {aiMessage && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{aiMessage}</p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {generatedReminders.map((reminder, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {reminder.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {reminder.category && (
                        <Badge variant="indigo" size="sm">
                          {getCategoryMeta(reminder.category).label}
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveReminderItem(idx)}
                        title="Видалити зі списку"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{reminder.dateStr}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{reminder.timeStr}</span>
                    </div>
                  </div>

                  {/* Checklist items */}
                  {reminder.items?.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 text-indigo-500" /> Підзавдання ({reminder.items.length}):
                      </span>
                      <ul className="text-xs space-y-0.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                        {reminder.items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tagged members */}
                  {reminder.taggedMemberIds?.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-indigo-100 dark:border-indigo-900/40 text-xs">
                      <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Учасники:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {reminder.taggedMemberIds
                          .map((id) => {
                            const m = teamMembers.find((mem) => String(mem.telegram_id || mem.id) === String(id));
                            return m ? `@${m.username || m.first_name}` : id;
                          })
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="secondary" onClick={() => setGeneratedReminders([])}>
                Змінити
              </Button>
              <Button size="sm" onClick={handleConfirmAddAll} className="gap-1.5">
                <span>
                  {generatedReminders.length > 1
                    ? `Додати всі (${generatedReminders.length}) в календар`
                    : 'Додати в календар'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
