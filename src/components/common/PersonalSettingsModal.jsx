import React, { useEffect } from 'react';
import { Settings, MessageSquareHeart } from 'lucide-react';
import { Modal } from '../ui';
import { CategoryManager } from '../Reminders/CategoryManager';
import { useTelegram } from '../../context/TelegramContext';

export function PersonalSettingsModal({ isOpen, onClose, onOpenFeedback }) {
  const { setClosingConfirmation } = useTelegram();

  useEffect(() => {
    if (isOpen) {
      setClosingConfirmation?.(true);
      return () => setClosingConfirmation?.(false);
    }
  }, [isOpen, setClosingConfirmation]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Налаштування календаря"
      icon={<Settings className="w-5 h-5 text-indigo-500" />}
      maxWidth="max-w-md"
    >
      <div className="p-4 space-y-4">
        {/* Categories Section */}
        <CategoryManager isTeam={false} canEdit={true} />

        {/* Feedback / Bug Report Action Block */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFeedback?.();
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-900/40 text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
                <MessageSquareHeart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Повідомити про проблему або відгук
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Надіслати відгук чи скріншот розробникам
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
              Відкрити →
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
