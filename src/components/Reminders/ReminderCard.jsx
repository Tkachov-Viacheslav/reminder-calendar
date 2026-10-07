import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Trash2,
  BellRing,
  AlertCircle,
  Pencil,
  Repeat,
  Bell,
  Check,
  ListTodo,
} from 'lucide-react';
import { getCategoryMeta } from '../../utils/constants';
import { formatTime } from '../../utils/dateUtils';
import { useTelegram } from '../../context/TelegramContext';

export function ReminderCard({ reminder, onToggleSent, onDelete, onEdit, onUpdate }) {
  const { triggerHaptic } = useTelegram();
  const category = getCategoryMeta(reminder.category);
  const isPast = new Date(reminder.remind_at) < new Date();

  // Mobile swipe state
  const [touchOffset, setTouchOffset] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (touchStartX === null) return;
    const diff = e.touches[0].clientX - touchStartX;
    if (Math.abs(diff) < 110) {
      setTouchOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchOffset > 65) {
      triggerHaptic('success');
      onToggleSent(reminder.id, !reminder.is_sent);
    } else if (touchOffset < -65) {
      triggerHaptic('warning');
      const snoozeDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      if (onUpdate) {
        onUpdate(reminder.id, { remind_at: snoozeDate, is_sent: false });
      }
    }
    setTouchOffset(0);
    setTouchStartX(null);
    setIsSwiping(false);
  };

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

  const handleToggleSubtask = (e, itemId) => {
    e.stopPropagation();
    if (!onUpdate) return;
    const currentItems = Array.isArray(reminder.items) ? reminder.items : [];
    const updated = currentItems.map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it
    );
    triggerHaptic('light');
    onUpdate(reminder.id, { items: updated });
  };

  const repeatLabels = {
    daily: 'Щодня',
    weekdays: 'Щобудня',
    weekly: 'Щотижня',
    monthly: 'Щомісяця',
  };
  const repeatText = repeatLabels[reminder.repeat_type] || null;
  const items = Array.isArray(reminder.items) ? reminder.items : [];

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe background actions */}
      <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl text-xs font-bold pointer-events-none">
        <div
          className={`flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 transition-opacity ${
            touchOffset > 20 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{reminder.is_sent ? 'Відновити' : 'Виконано'}</span>
        </div>
        <div
          className={`flex items-center gap-1.5 text-amber-600 dark:text-amber-400 transition-opacity ${
            touchOffset < -20 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span>Відкласти 15 хв</span>
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Card Content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${touchOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-shadow group relative z-10"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Category & Time */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${category.color}`}>
              {category.label}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {formatTime(reminder.remind_at)}
            </span>
            {repeatText && (
              <span
                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-1.5 py-0.5 rounded-md"
                title={`Повторення: ${repeatText}`}
              >
                <Repeat className="w-2.5 h-2.5" />
                <span>{repeatText}</span>
              </span>
            )}
            {reminder.remind_before > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded-md"
                title={`Попередження за ${reminder.remind_before} хв`}
              >
                <Bell className="w-2.5 h-2.5" />
                <span>
                  -{reminder.remind_before >= 60 ? `${reminder.remind_before / 60}г` : `${reminder.remind_before}хв`}
                </span>
              </span>
            )}
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

        {/* Subtasks / Checklist Items */}
        {items.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <ListTodo className="w-3 h-3 text-indigo-500" />
                <span>Підзавдання</span>
              </span>
              <span>
                {items.filter((i) => i.done).length}/{items.length}
              </span>
            </div>
            {items.map((it) => (
              <div
                key={it.id}
                onClick={(e) => handleToggleSubtask(e, it.id)}
                className="flex items-center gap-2 text-xs py-0.5 cursor-pointer select-none group/item"
              >
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                    it.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 group-hover/item:border-indigo-500'
                  }`}
                >
                  {it.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span
                  className={`transition-colors ${
                    it.done
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {it.text}
                </span>
              </div>
            ))}
          </div>
        )}

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
    </div>
  );
}
