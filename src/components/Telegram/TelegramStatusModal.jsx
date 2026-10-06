import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertCircle, Sparkles, User, ExternalLink } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export function TelegramStatusModal({ isOpen, onClose }) {
  const { isInTelegram, tgUser, manualChatId, saveManualChatId, activeUserId, triggerHaptic } = useTelegram();
  const [chatIdInput, setChatIdInput] = useState(manualChatId || '');
  const [testStatus, setTestStatus] = useState({ loading: false, msg: '', success: null });

  if (!isOpen) return null;

  const handleSaveChatId = (e) => {
    e.preventDefault();
    triggerHaptic('success');
    saveManualChatId(chatIdInput);
  };

  const handleSendTestMessage = async () => {
    if (!activeUserId) {
      setTestStatus({
        loading: false,
        msg: 'Вкажіть ваш Telegram Chat ID',
        success: false
      });
      return;
    }

    setTestStatus({ loading: true, msg: 'Відправляємо тестове повідомлення...', success: null });
    triggerHaptic('light');

    try {
      const response = await fetch('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          message: '🔔 Привіт! Це тестове сповіщення від твого Календаря нагадувань.'
        })
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        setTestStatus({
          loading: false,
          msg: 'Повідомлення успішно доставлено у твій Telegram!',
          success: true
        });
        triggerHaptic('success');
      } else {
        setTestStatus({
          loading: false,
          msg: data.error || 'Не вдалося надіслати. Перевірте токен бота або запустіть бота /start.',
          success: false
        });
        triggerHaptic('error');
      }
    } catch (err) {
      setTestStatus({
        loading: false,
        msg: 'Помилка виклику Netlify Function. Переконайтеся, що сайт задеплоєно на Netlify або запущено `netlify dev`.',
        success: false
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Підключення до Telegram
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isInTelegram ? (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-full bg-sky-500 text-white font-bold text-sm">
                  {tgUser?.first_name?.[0] || 'T'}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-sky-900 dark:text-sky-200">
                    {tgUser?.first_name} {tgUser?.last_name || ''}
                  </h4>
                  <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80">
                    @{tgUser?.username || 'user'} • ID: {tgUser?.id}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-sky-800 dark:text-sky-300">
                Ви відкрили календар через Telegram Mini App. Нагадування надсилатимуться автоматично в цей акаунт!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Звичайний браузер</p>
                <p>
                  Щоб отримувати нагадування з сайту, вкажіть ваш числовий Telegram Chat ID або відкрийте цей сайт як Telegram Mini App через вашого бота.
                </p>
              </div>

              <form onSubmit={handleSaveChatId} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ваш Telegram Chat ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatIdInput}
                    onChange={(e) => setChatIdInput(e.target.value)}
                    placeholder="Наприклад: 123456789"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Зберегти
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Дізнатись свій Chat ID можна написавши боту{' '}
                  <a
                    href="https://t.me/userinfobot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 underline inline-flex items-center gap-0.5"
                  >
                    @userinfobot <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </form>
            </div>
          )}

          {/* Test notification button */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSendTestMessage}
              disabled={testStatus.loading || !activeUserId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {testStatus.loading ? 'Надсилаємо...' : 'Перевірити зв’язок (Тестовий пінг у Telegram)'}
              </span>
            </button>

            {testStatus.msg && (
              <div
                className={`mt-2.5 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200'
                }`}
              >
                {testStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                )}
                <span>{testStatus.msg}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
