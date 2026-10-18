import React from 'react';
import {
  Clock,
  CheckCircle2,
  Trash2,
  BellRing,
  AlertCircle,
  Pencil,
  Repeat,
  Bell,
} from 'lucide-react';
import { getCategoryMeta } from '../../utils/constants';
import { formatTime } from '../../utils/dateUtils';
import { useTelegram } from '../../context/TelegramContext';
import { useSwipeAction } from '../../hooks/useSwipeAction';
import { Badge, IconButton } from '../ui';
import { ReminderSwipeIndicator } from './ReminderSwipeIndicator';
import { ReminderCardSubtasks } from './ReminderCardSubtasks';

const REPEAT_LABELS = {
  daily: 'Щодня',
  weekdays: 'Щобудня',
  weekly: 'Щотижня',
  monthly: 'Щомісяця',
};

export const ReminderCard = React.memo(function ReminderCard({
  reminder,
  onToggleSent,
  onDelete,
  onEdit,
  onUpdate,
  canEdit = true,
}) {
  const { triggerHaptic } = useTelegram();
  const category = getCategoryMeta(reminder.category);
  const isPast = new Date(reminder.remind_at) < new Date();

  const {
    touchOffset,
    isSwiping,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useSwipeAction({
    onSwipeRight: () => {
      triggerHaptic('success');
      onToggleSent(reminder.id, !reminder.is_sent);
    },
    onSwipeLeft: () => {
      triggerHaptic('warning');
      const snoozeDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      if (onUpdate) {
        onUpdate(reminder.id, { remind_at: snoozeDate, is_sent: false });
      }
    },
  });

  const handleEdit = (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    triggerHaptic('light');
    if (onEdit) onEdit(reminder);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    triggerHaptic('medium');
    onDelete(reminder.id);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    triggerHaptic('light');
    onToggleSent(reminder.id, !reminder.is_sent);
  };

  const handleToggleSubtask = (e, itemId) => {
    e.stopPropagation();
    if (!onUpdate || !canEdit) return;
    const currentItems = Array.isArray(reminder.items) ? reminder.items : [];
    const updated = currentItems.map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it
    );
    triggerHaptic('light');
    onUpdate(reminder.id, { items: updated });
  };

  const repeatText = REPEAT_LABELS[reminder.repeat_type] || null;
  const items = Array.isArray(reminder.items) ? reminder.items : [];

  return (
    <div className="relative overflow-hidden rounded-xl">
      <ReminderSwipeIndicator touchOffset={touchOffset} isSent={reminder.is_sent} />

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

          {/* Actions: Edit & Delete with WCAG touch target */}
          {canEdit && (
            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
              <IconButton
                icon={<Pencil className="w-3.5 h-3.5" />}
                onClick={handleEdit}
                aria-label="Редагувати нотатку"
                size="sm"
                variant="ghost"
              />
              <IconButton
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleDelete}
                aria-label="Видалити нотатку"
                size="sm"
                variant="danger"
              />
            </div>
          )}
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

        {/* Team Meta: Author & Tagged Members */}
        {((Array.isArray(reminder.tagged_members) && reminder.tagged_members.length > 0) ||
          reminder.created_by_name) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {reminder.created_by_name && (
              <Badge variant="slate" size="sm">
                👤 {reminder.created_by_name}
              </Badge>
            )}
            {Array.isArray(reminder.tagged_members) &&
              reminder.tagged_members.map((m, idx) => (
                <Badge key={idx} variant="violet" size="sm">
                  @{m.username || m.name}
                </Badge>
              ))}
          </div>
        )}

        {/* Subtasks Checklist */}
        <ReminderCardSubtasks items={items} onToggleSubtask={handleToggleSubtask} />

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
            title={
              reminder.is_sent
                ? 'Натисніть, щоб повернути в активні'
                : 'Натисніть, щоб позначити як виконане'
            }
          >
            {reminder.is_sent ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Виконано</span>
              </>
            ) : isPast ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                <span>Час настав</span>
              </>
            ) : (
              <>
                <BellRing className="w-3.5 h-3.5" />
                <span>Заплановано</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {reminder.is_sent
              ? 'Завершено'
              : isPast
              ? 'Очікує відправки'
              : 'Активне'}
          </span>
        </div>
      </div>
    </div>
  );
});
