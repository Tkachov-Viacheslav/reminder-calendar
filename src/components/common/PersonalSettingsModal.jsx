import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Key, Check } from 'lucide-react';
import { Modal, Button } from '../ui';
import { CategoryManager } from '../Reminders/CategoryManager';
import { useTelegram } from '../../context/TelegramContext';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '../../services/aiService';

export function PersonalSettingsModal({ isOpen, onClose }) {
  const { setClosingConfirmation } = useTelegram();
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClosingConfirmation?.(true);
      setGeminiKey(getStoredGeminiApiKey());
      setIsSaved(false);
      return () => setClosingConfirmation?.(false);
    }
  }, [isOpen, setClosingConfirmation]);

  const handleSaveKey = () => {
    setStoredGeminiApiKey(geminiKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Налаштування календаря"
      icon={<Settings className="w-5 h-5 text-indigo-500" />}
      maxWidth="max-w-md"
    >
      <div className="p-4 space-y-5">
        {/* Gemini AI Settings Section */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-violet-50/70 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Google Gemini ШІ
              </h4>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Отримати ключ ↗
            </a>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Вкажіть API ключ для активації розумного створення розкладу голосом та за шаблонами.
          </p>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
            <Button size="sm" onClick={handleSaveKey} className="shrink-0 gap-1">
              {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : null}
              <span>{isSaved ? 'Збережено' : 'Зберегти'}</span>
            </Button>
          </div>
        </div>

        {/* Categories Section */}
        <CategoryManager isTeam={false} canEdit={true} />

        {/* Sentry Test Section */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
          <span>Тест системи збоїв (Sentry):</span>
          <button
            type="button"
            onClick={() => {
              throw new Error('This is your first error!');
            }}
            className="px-2.5 py-1 text-[11px] font-medium text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-colors cursor-pointer"
          >
            Break the world
          </button>
        </div>
      </div>
    </Modal>
  );
}
