import React, { useState } from 'react';
import { BookmarkPlus, Bookmark, X, Check, RotateCw, Users } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';

export function TemplateSelector({
  templates = [],
  onApplyTemplate,
  onSaveCurrentAsTemplate,
  onDeleteTemplate,
  currentTitle = '',
  isTeam = false,
}) {
  const { triggerHaptic } = useTelegram();
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'saved' | 'updated', text: string }

  const trimmedTitle = currentTitle?.trim() || '';

  // Determine if current title matches an existing template or currently selected one
  const matchingTemplate =
    templates.find((t) => t.name.trim().toLowerCase() === trimmedTitle.toLowerCase()) ||
    templates.find((t) => t.id === selectedTemplateId);

  const handleApply = (tpl) => {
    setSelectedTemplateId(tpl.id);
    onApplyTemplate(tpl);
  };

  const handleSave = (overwriteId = null) => {
    if (!trimmedTitle) return;
    onSaveCurrentAsTemplate(overwriteId);

    const isUpdate = Boolean(overwriteId);
    setFeedback({
      type: isUpdate ? 'updated' : 'saved',
      text: isUpdate ? 'Шаблон оновлено!' : 'Шаблон збережено!',
    });
    triggerHaptic('success');
    setTimeout(() => setFeedback(null), 2200);
  };

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
          <Bookmark className="w-3 h-3 text-indigo-500" />
          <span>{isTeam ? 'Шаблони команди' : 'Шаблони'}</span>
          {isTeam && (
            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium normal-case">
              <Users className="w-2.5 h-2.5" />
              спільні
            </span>
          )}
        </label>

        {trimmedTitle && (
          <div className="flex items-center gap-2">
            {feedback ? (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {feedback.text}
              </span>
            ) : matchingTemplate ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSave(matchingTemplate.id)}
                  className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 transition-colors"
                  title={`Перезаписати параметри шаблону «${matchingTemplate.name}»`}
                >
                  <RotateCw className="w-3 h-3 animate-none" />
                  <span>Оновити «{matchingTemplate.name}»</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(null)}
                  className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Зберегти як новий окремий шаблон"
                >
                  (+ новий)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(null)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>Зберегти як шаблон</span>
              </button>
            )}
          </div>
        )}
      </div>

      {templates.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto py-0.5">
          {templates.map((tpl) => {
            const isSelected = tpl.id === selectedTemplateId;
            return (
              <div
                key={tpl.id}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-all group ${
                  isSelected
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-400 dark:border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleApply(tpl)}
                  className="font-medium truncate max-w-[140px] text-left"
                  title={`Застосувати шаблон «${tpl.name}»${tpl.timeStr ? ` (${tpl.timeStr})` : ''}`}
                >
                  <span>{tpl.name}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedTemplateId === tpl.id) setSelectedTemplateId(null);
                    onDeleteTemplate(tpl.id);
                  }}
                  className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                  title="Видалити шаблон"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
          {isTeam
            ? 'У цієї команди ще немає спільних шаблонів. Створіть перший для прискорення роботи!'
            : 'Введіть назву нагадування та натисніть «Зберегти як шаблон», щоб швидко створювати його наступного разу.'}
        </div>
      )}
    </div>
  );
}
