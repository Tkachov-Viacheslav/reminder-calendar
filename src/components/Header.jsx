import React from 'react';
import { Calendar as CalendarIcon, KeyRound, Plus } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';

export function Header({ onOpenNewReminder, onOpenAuth }) {
  const { user, isAuthenticated } = useTelegram();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg leading-tight">
              Календар
            </h1>
          </div>
        </div>

        {/* Action badges and buttons */}
        <div className="flex items-center gap-2">
          {/* Auth / Profile button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isAuthenticated
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
            }`}
            title={isAuthenticated ? 'Мій профіль' : 'Увійти через Telegram'}
          >
            {isAuthenticated ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="max-w-[120px] truncate">{user?.first_name || 'Профіль'}</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Увійти</span>
              </>
            )}
          </button>

          {/* Quick add button */}
          <button
            onClick={onOpenNewReminder}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Додати</span>
          </button>
        </div>
      </div>
    </header>
  );
}
