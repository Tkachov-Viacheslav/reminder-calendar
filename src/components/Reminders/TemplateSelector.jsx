import React, { useState } from 'react';
import { BookmarkPlus, Bookmark, X, Check } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export function TemplateSelector({
  templates,
  onApplyTemplate,
  onSaveCurrentAsTemplate,
  onDeleteTemplate,
  currentTitle,
}) {
  const { triggerHaptic } = useTelegram();
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);

  const handleSave = () => {
    if (!currentTitle?.trim()) return;
    onSaveCurrentAsTemplate();
    setIsSavedFeedback(true);
    triggerHaptic('success');
    setTimeout(() => setIsSavedFeedback(false), 2000);
  };

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
          <Bookmark className="w-3 h-3 text-indigo-500" />
          <span>Шаблони</span>
        </label>

        {currentTitle?.trim() && (
          <button
            type="button"
            onClick={handleSave}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            {isSavedFeedback ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Шаблон збережено!</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3 h-3" />
                <span>Зберегти як шаблон</span>
              </>
            )}
          </button>
        )}
      </div>

      {templates.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 rounded-lg px-2 py-0.5 text-xs transition-all group"
            >
              <button
                type="button"
                onClick={() => onApplyTemplate(tpl)}
                className="font-medium truncate max-w-[140px] text-left"
                title={`Застосувати шаблон «${tpl.name}»`}
              >
                {tpl.name}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTemplate(tpl.id);
                }}
                className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                title="Видалити шаблон"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
          Введіть назву нагадування та натисніть «Зберегти як шаблон», щоб швидко створювати його наступного разу.
        </div>
      )}
    </div>
  );
}
