import React, { useState } from 'react';
import { X, KeyRound, ExternalLink, Send, LogOut, CheckCircle2, AlertCircle, Bot, User } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'bot';

export function AuthModal({ isOpen, onClose }) {
  const { isInTelegram, user, isAuthenticated, loginWithCode, logout, triggerHaptic } = useTelegram();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState({ loading: false, msg: '', success: null });

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Введіть 6-значний код від бота');
      return;
    }

    setLoading(true);
    setError('');
    const res = await loginWithCode(code);
    setLoading(false);

    if (res.success) {
      setCode('');
      onClose();
    } else {
      setError(res.error || 'Невірний або прострочений код');
    }
  };

  const handleSendTest = async () => {
    if (!user?.id) return;
    setTestStatus({ loading: true, msg: 'Надсилаємо тест...', success: null });
    triggerHaptic('light');

    try {
      const response = await fetch('/api/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          message: '🔔 Привіт! Ваш акаунт успішно авторизовано на сайті Календаря.',
        }),
      });
      const data = await response.json();
      if (response.ok && (data.ok || data.result)) {
        setTestStatus({ loading: false, msg: 'Тестове сповіщення надійшло у ваш Telegram!', success: true });
        triggerHaptic('success');
      } else {
        setTestStatus({ loading: false, msg: data.error || 'Помилка надсилання.', success: false });
        triggerHaptic('error');
      }
    } catch {
      setTestStatus({ loading: false, msg: 'Помилка мережі при надсиланні', success: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              {isAuthenticated ? <User className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isAuthenticated ? 'Мій профіль' : 'Вхід через Telegram'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isAuthenticated ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center font-bold text-base">
                    {user?.first_name?.[0] || 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {user?.first_name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {user?.username ? `@${user.username}` : `ID: ${user?.id}`}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 border border-emerald-300 dark:border-emerald-800">
                  Авторизовано
                </span>
              </div>

              {/* Test Notification */}
              <button
                onClick={handleSendTest}
                disabled={testStatus.loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testStatus.loading ? 'Надсилаємо...' : 'Надіслати тестовий пінг у Telegram'}</span>
              </button>

              {testStatus.msg && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
                  <span>{testStatus.msg}</span>
                </div>
              )}

              {/* Logout button */}
              {!isInTelegram && (
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Вийти з акаунта</span>
                </button>
              )}
            </div>
          ) : (
            /* Login form with code */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-sky-500" />
                  <span>Вхід без пароля за 10 секунд:</span>
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Відкрийте бота в Telegram</li>
                  <li>Надішліть команду <code>/code</code> або натисніть кнопку нижче</li>
                  <li>Введіть отриманий 6-значний код для авторизації</li>
                </ol>
              </div>

              {/* Open Bot Button */}
              <a
                href={`https://t.me/${BOT_USERNAME}?start=login`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Bot className="w-4 h-4 text-sky-500" />
                <span>Отримати код у @{BOT_USERNAME}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              {/* Code form */}
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Введіть 6-значний код
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, ''));
                      if (error) setError('');
                    }}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 text-center tracking-widest text-lg font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-500 font-medium text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
                >
                  {loading ? 'Перевіряємо...' : 'Увійти в календар'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
