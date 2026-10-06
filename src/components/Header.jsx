import React from 'react';
import { Calendar as CalendarIcon, Send, HelpCircle, Plus, Database, Sparkles } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { isSupabaseConfigured } from '../services/supabase';

export function Header({ onOpenNewReminder, onOpenGuide, onOpenTelegramSettings }) {
  const { isInTelegram, tgUser, activeUserId } = useTelegram();
  const dbConfigured = isSupabaseConfigured();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-1.5">
              Календар
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                Bot Sync
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Нагадування прямо у твій Telegram
            </p>
          </div>
        </div>

        {/* Action badges and buttons */}
        <div className="flex items-center gap-2">
          {/* Telegram Status button */}
          <button
            onClick={onOpenTelegramSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeUserId
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60 hover:bg-sky-100'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
            }`}
            title="Налаштування Telegram"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">
              {isInTelegram
                ? tgUser?.first_name || 'Telegram'
                : activeUserId
                ? `ID: ${activeUserId.slice(0, 6)}...`
                : 'Підключити TG'}
            </span>
          </button>

          {/* Guide button */}
          <button
            onClick={onOpenGuide}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Інструкція з налаштування"
            aria-label="Інструкція"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Quick add button */}
          <button
            onClick={onOpenNewReminder}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Додати</span>
          </button>
        </div>
      </div>
    </header>
  );
}
