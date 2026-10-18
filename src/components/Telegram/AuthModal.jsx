import React, { useState, useEffect } from 'react';
import { X, KeyRound, ExternalLink, LogOut, Bot, User, ShieldCheck } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'reminderveter_bot';
const CLIENT_ID = import.meta.env.VITE_TELEGRAM_CLIENT_ID || '8785054597';

export function AuthModal({ isOpen, onClose }) {
  const { isInTelegram, user, isAuthenticated, loginWithCode, loginWithTelegram, logout } = useTelegram();
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.Telegram?.Login) {
      const script = document.createElement('script');
      script.src = 'https://oauth.telegram.org/js/telegram-login.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!isOpen) return null;

  const handleTelegramOidc = () => {
    if (!window.Telegram?.Login) {
      setError('Сервіс Telegram завантажується, спробуйте ще раз через мить');
      return;
    }

    setTgLoading(true);
    setError('');

    try {
      window.Telegram.Login.auth(
        {
          client_id: CLIENT_ID,
          request_access: ['write'],
          lang: 'uk',
        },
        (result) => {
          setTgLoading(false);
          if (!result || result.error) {
            if (result?.error && result.error !== 'popup_closed') {
              setError(`Помилка Telegram: ${result.error}`);
            }
            return;
          }

          const res = loginWithTelegram(result);
          if (res.success) {
            onClose();
          } else {
            setError(res.error || 'Помилка авторизації');
          }
        }
      );
    } catch (err) {
      setTgLoading(false);
      setError(err?.message || 'Помилка запуску авторизації');
    }
  };

  const handleCodeLogin = async (e) => {
    e.preventDefault();
    if (!code || code.trim().length !== 6) {
      setError('Введіть 6-значний код від бота');
      return;
    }

    setCodeLoading(true);
    setError('');
    const res = await loginWithCode(code);
    setCodeLoading(false);

    if (res.success) {
      setCode('');
      onClose();
    } else {
      setError(res.error || 'Невірний або прострочений код');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              {isAuthenticated ? <User className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-sky-500" />}
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {isAuthenticated ? 'Мій профіль' : 'Вхід через Telegram'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {isAuthenticated ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center font-bold text-base overflow-hidden">
                    {user?.photo_url ? (
                      <img src={user.photo_url} alt={user?.first_name} className="w-full h-full object-cover" />
                    ) : (
                      [...(user?.first_name || 'U')][0]
                    )}
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
            /* Login options */
            <div className="space-y-4">
              {/* Primary 1-Click Telegram Button */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Швидка авторизація в 1 клік
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Синхронізація розкладу без паролів через офіційний Telegram
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTelegramOidc}
                  disabled={tgLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .36z"/>
                  </svg>
                  <span>{tgLoading ? 'З’єднуємося...' : 'Увійти через Telegram'}</span>
                </button>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 text-center font-medium">
                  {error}
                </div>
              )}

              {/* Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap">
                  або через код
                </span>
              </div>

              {/* Toggle / Secondary Code Section */}
              {!showCodeInput ? (
                <button
                  type="button"
                  onClick={() => setShowCodeInput(true)}
                  className="w-full py-2 px-3 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Увійти за допомогою 6-значного коду</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-sky-500" />
                      Код від @{BOT_USERNAME}
                    </span>
                    <a
                      href={`https://t.me/${BOT_USERNAME}?start=login`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 hover:text-sky-500 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>Отримати код</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <form onSubmit={handleCodeLogin} className="space-y-3">
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
                      className="w-full px-3 py-2 text-center tracking-widest text-base font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    <button
                      type="submit"
                      disabled={codeLoading || code.length !== 6}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      {codeLoading ? 'Перевіряємо...' : 'Підтвердити код'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
