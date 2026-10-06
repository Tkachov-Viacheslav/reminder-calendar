import React from 'react';
import { Clock, CheckCircle2, Trash2, BellRing, AlertCircle, Pencil } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';
import { formatTime } from '../../utils/dateUtils';
import { useTelegram } from '../../context/TelegramContext';

export function ReminderCard({ reminder, onToggleSent, onDelete, onEdit }) {
  const { triggerHaptic } = useTelegram();
  const category = CATEGORIES[reminder.category] || CATEGORIES.other;
  const isPast = new Date(reminder.remind_at) < new Date();

  const handleEdit = (e) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (onEdit) onEdit(reminder);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    triggerHaptic('medium');
    onDelete(reminder.id);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    triggerHaptic('light');
    onToggleSent(reminder.id, !reminder.is_sent);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-3">
        {/* Category & Time */}
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${category.color}`}
          >
            {category.label}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            {formatTime(reminder.remind_at)}
          </span>
        </div>

        {/* Actions: Edit & Delete */}
        <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-md transition-colors"
            title="Редагувати нотатку"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition-colors"
            title="Видалити"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="mt-2">
        <h4
          className={`font-semibold text-sm sm:text-base leading-snug ${
            reminder.is_sent
              ? 'line-through text-slate-400 dark:text-slate-500'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {reminder.title}
        </h4>
        {reminder.description && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {reminder.description}
          </p>
        )}
      </div>

      {/* Status footer & toggle */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <button
          onClick={handleToggle}
          className={`flex items-center gap-1.5 transition-colors font-medium ${
            reminder.is_sent
              ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700'
              : isPast
              ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
              : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
          }`}
        >
          {reminder.is_sent ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Надіслано в TG</span>
            </>
          ) : isPast ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              <span>Очікує розкладу</span>
            </>
          ) : (
            <>
              <BellRing className="w-3.5 h-3.5" />
              <span>Заплановано</span>
            </>
          )}
        </button>

        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {reminder.is_sent ? 'Виконано' : 'Активне'}
        </span>
      </div>
    </div>
  );
}
