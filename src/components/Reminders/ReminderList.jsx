import React, { useState } from 'react';
import { Plus, Bell, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { ReminderCard } from './ReminderCard';
import { formatDateUkrainian, isSameDay } from '../../utils/dateUtils';
import { useReminders } from '../../context/ReminderContext';

export function ReminderList({ onOpenNewReminder, onEditReminder }) {
  const { reminders, selectedDate, updateReminder, deleteReminder } = useReminders();
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const dayReminders = reminders.filter((r) => isSameDay(r.remind_at, selectedDate));

  const upcomingReminders = reminders
    .filter((r) => new Date(r.remind_at) >= new Date() && !r.is_sent)
    .sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at));

  const currentList = showAllUpcoming ? upcomingReminders : dayReminders;

  const handleToggleSent = (id, newSent) => {
    updateReminder(id, { is_sent: newSent });
  };

  return (
    <div className="bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col h-full">
      {/* List Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            {showAllUpcoming ? 'Усі найближчі' : formatDateUkrainian(selectedDate)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentList.length} {currentList.length === 1 ? 'нагадування' : 'нагадувань'}
          </p>
        </div>

        {/* Tab switch */}
        <button
          onClick={() => setShowAllUpcoming(!showAllUpcoming)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        >
          {showAllUpcoming ? 'На обраний день' : 'Показати всі'}
        </button>
      </div>

      {/* List or Empty State */}
      <div className="flex-1 overflow-y-auto my-3 space-y-2.5 max-h-[460px] pr-1">
        {currentList.length === 0 ? (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
            <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mb-3">
              <Bell className="w-6 h-6 opacity-70" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {showAllUpcoming ? 'Немає запланованих нагадувань' : 'На цей день немає подій'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Створіть нагадування, і бот надішле його у ваш Telegram в зазначений час.
            </p>
            <button
              onClick={onOpenNewReminder}
              className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати подію</span>
            </button>
          </div>
        ) : (
          currentList.map((rem) => (
            <ReminderCard
              key={rem.id}
              reminder={rem}
              onToggleSent={handleToggleSent}
              onDelete={deleteReminder}
              onEdit={onEditReminder}
            />
          ))
        )}
      </div>

      {/* Footer Add Button */}
      {currentList.length > 0 && (
        <button
          onClick={onOpenNewReminder}
          className="w-full mt-auto pt-2 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800/60 transition-colors"
        >
          <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Додати нагадування на цей день</span>
        </button>
      )}
    </div>
  );
}
