import React from 'react';
import { WEEKDAY_NAMES_UA, getMonthMatrix, isSameDay, isToday } from '../../utils/dateUtils';
import { CATEGORIES } from '../../utils/constants';
import { useTelegram } from '../../context/TelegramContext';

export function MonthView({ viewDate, selectedDate, onSelectDate, reminders }) {
  const { triggerHaptic } = useTelegram();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getMonthMatrix(year, month);

  const getRemindersForDay = (date) => {
    return reminders.filter((rem) => isSameDay(rem.remind_at, date));
  };

  const handleDayClick = (date) => {
    triggerHaptic('light');
    onSelectDate(date);
  };

  return (
    <div className="w-full">
      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1 text-center">
        {WEEKDAY_NAMES_UA.map((day, idx) => (
          <div
            key={day}
            className={`py-2 text-xs font-semibold ${
              idx >= 5 ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((item, index) => {
          const dayReminders = getRemindersForDay(item.date);
          const isSelected = isSameDay(item.date, selectedDate);
          const today = isToday(item.date);

          return (
            <button
              key={index}
              onClick={() => handleDayClick(item.date)}
              className={`min-h-[52px] sm:min-h-[64px] p-1 sm:p-1.5 rounded-xl flex flex-col items-center justify-between transition-all relative group border text-left ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-[1.02] z-10'
                  : today
                  ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300'
                  : item.isCurrentMonth
                  ? 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  : 'border-transparent bg-transparent text-slate-300 dark:text-slate-600 hover:text-slate-500'
              }`}
            >
              <div className="w-full flex justify-between items-center">
                <span
                  className={`text-xs sm:text-sm font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                    today && !isSelected
                      ? 'bg-indigo-600 text-white font-bold'
                      : ''
                  }`}
                >
                  {item.date.getDate()}
                </span>
                {today && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                )}
              </div>

              {/* Reminders dots indicator */}
              <div className="w-full flex items-center justify-center gap-1 mt-1 overflow-hidden px-1">
                {dayReminders.slice(0, 3).map((r, i) => {
                  const category = CATEGORIES[r.category] || CATEGORIES.other;
                  return (
                    <span
                      key={r.id || i}
                      className={`w-1.5 h-1.5 rounded-full transition-transform ${
                        isSelected ? 'bg-white' : category.dotColor
                      }`}
                      title={r.title}
                    />
                  );
                })}
                {dayReminders.length > 3 && (
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    +{dayReminders.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
