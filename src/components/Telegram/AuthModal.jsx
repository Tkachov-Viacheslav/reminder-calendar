import React, { useState, useEffect, useRef } from 'react';
import { X, KeyRound, ExternalLink, LogOut, Bot, User, ShieldCheck } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'reminderveter_bot';

export function AuthModal({ isOpen, onClose }) {
  const { isInTelegram, user, isAuthenticated, loginWithCode, loginWithTelegram, logout } = useTelegram();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const telegramWrapperRef = useRef(null);

  useEffect(() => {
    if (!isOpen || isAuthenticated) return;

    window.onTelegramAuth = (tgUser) => {
      loginWithTelegram(tgUser);
      onClose();
    };

    const container = telegramWrapperRef.current;
    if (container) {
      container.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', BOT_USERNAME);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '12');
      script.setAttribute('data-lang', 'uk');
      script.setAttribute('data-userpic', 'true');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.async = true;
      container.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, [isOpen, isAuthenticated, loginWithTelegram, onClose]);

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
                      user?.first_name?.[0] || 'U'
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
            /* Login options */
            <div className="space-y-4">
              {/* Primary 1-Click Telegram Login Widget */}
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Безпечна авторизація в 1 клік без введення паролів:
                </p>
                <div
                  ref={telegramWrapperRef}
                  className="flex justify-center items-center min-h-[44px] py-1"
                />
              </div>

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

                  <form onSubmit={handleLogin} className="space-y-3">
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

                    {error && (
                      <p className="text-xs text-rose-500 font-medium text-center">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || code.length !== 6}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      {loading ? 'Перевіряємо...' : 'Підтвердити код'}
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
