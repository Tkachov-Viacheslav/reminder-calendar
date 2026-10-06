import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Terminal, Shield, Bot, Server } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

const SQL_SCHEMA = `-- Створіть таблицю reminders у Supabase SQL Editor:
create table if not exists reminders (
  id text primary key,
  user_id text not null,
  title text not null,
  description text default '',
  category text default 'personal',
  remind_at timestamp with time zone not null,
  is_sent boolean default false,
  created_at timestamp with time zone default now()
);

-- Індекс для швидкого пошуку запланованих нагадувань
create index if not exists idx_reminders_remind_at on reminders (remind_at, is_sent);

-- Дозволити читання та додавання (Row Level Security за бажанням)
alter table reminders enable row level security;
create policy "Allow all operations for anon" on reminders
  for all using (true) with check (true);
`;

export function SetupModal({ isOpen, onClose }) {
  const { triggerHaptic } = useTelegram();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Інструкція з налаштування (Netlify + Supabase + TG Bot)
              </h3>
              <p className="text-xs text-slate-500">
                Покроковий гід для повного запуску
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              <Bot className="w-4 h-4 text-sky-500" />
              <span>Створення Telegram Бота</span>
            </div>
            <div className="pl-8 text-slate-600 dark:text-slate-300 space-y-1">
              <p>1. Відкрийте в Telegram бота <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">@BotFather</a> і напишіть <code>/newbot</code>.</p>
              <p>2. Скопіюйте отриманий <strong>HTTP API Token</strong> (наприклад: <code>7123456789:AAF...</code>).</p>
              <p>3. Налаштуйте Mini App кнопку в @BotFather: <code>/setmenubutton</code> → вкажіть посилання на ваш сайт на Netlify.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                2
              </span>
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span>База даних Supabase (SQL запит)</span>
            </div>
            <div className="pl-8 text-slate-600 dark:text-slate-300 space-y-2">
              <p>Створіть безкоштовний проєкт на <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold underline">supabase.com</a>, перейдіть в <strong>SQL Editor</strong> і виконайте запит:</p>
              <div className="relative">
                <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                  {SQL_SCHEMA}
                </pre>
                <button
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-medium border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопійовано' : 'Скопіювати SQL'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                3
              </span>
              <Shield className="w-4 h-4 text-violet-500" />
              <span>Змінні оточення в Netlify (Environment Variables)</span>
            </div>
            <div className="pl-8 text-slate-600 dark:text-slate-300 space-y-1.5">
              <p>В налаштуваннях сайту на Netlify (<em>Site configuration → Environment variables</em>) додайте:</p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                <li>VITE_SUPABASE_URL = ваша_URL_supabase</li>
                <li>VITE_SUPABASE_ANON_KEY = ваш_anon_public_key</li>
                <li>SUPABASE_SERVICE_ROLE_KEY = ваш_service_role_secret</li>
                <li>TELEGRAM_BOT_TOKEN = ваш_токен_від_BotFather</li>
              </ul>
              <p className="text-slate-500 text-xs mt-1">
                Netlify автоматично запускатиме функцію <code>check-reminders</code> за розкладом щохвилини для перевірки та надсилання сповіщень у Telegram!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Зрозуміло, дякую!
          </button>
        </div>
      </div>
    </div>
  );
}
