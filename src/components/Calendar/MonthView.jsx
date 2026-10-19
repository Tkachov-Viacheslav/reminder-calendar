import React, { useMemo } from 'react';
import {
  MONTH_NAMES_UA,
  WEEKDAY_NAMES_UA,
  getMonthMatrix,
  isSameDay,
  isToday,
  toISODateString,
} from '../../utils/dateUtils';
import { getCategoryMeta } from '../../utils/constants';
import { useTelegram } from '../../context/TelegramContext';

const WEEKDAY_FULL_NAMES = [
  'Понеділок',
  'Вівторок',
  'Середа',
  'Четвер',
  'П’ятниця',
  'Субота',
  'Неділя',
];

export const MonthView = React.memo(function MonthView({
  viewDate,
  selectedDate,
  onSelectDate,
  reminders,
}) {
  const { triggerHaptic } = useTelegram();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = useMemo(() => getMonthMatrix(year, month), [year, month]);

  const remindersByDate = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(reminders)) return map;
    for (const rem of reminders) {
      if (!rem?.remind_at) continue;
      const key = toISODateString(rem.remind_at);
      if (!key) continue;
      const list = map.get(key) || [];
      list.push(rem);
      map.set(key, list);
    }
    return map;
  }, [reminders]);

  const handleDayClick = (date) => {
    triggerHaptic('light');
    onSelectDate(date);
  };

  const gridLabel = `Календар: ${MONTH_NAMES_UA[month] || ''} ${year}`;

  return (
    <div
      role="grid"
      aria-label={gridLabel}
      className="w-full"
    >
      {/* Weekday labels header */}
      <div role="row" className="grid grid-cols-7 mb-1 text-center">
        {WEEKDAY_NAMES_UA.map((day, idx) => (
          <div
            key={day}
            role="columnheader"
            aria-label={WEEKDAY_FULL_NAMES[idx] || day}
            className={`py-2 text-xs font-semibold ${
              idx >= 5 ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid rowgroup */}
      <div role="rowgroup" className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((item, index) => {
          const dateKey = toISODateString(item.date);
          const dayReminders = remindersByDate.get(dateKey) || [];
          const isSelected = isSameDay(item.date, selectedDate);
          const today = isToday(item.date);

          // Active reminders first for dots display
          const sortedDayReminders = [...dayReminders].sort((a, b) => {
            if (Boolean(a.is_sent) !== Boolean(b.is_sent)) {
              return a.is_sent ? 1 : -1;
            }
            return new Date(a.remind_at) - new Date(b.remind_at);
          });

          const displayedDots = sortedDayReminders.slice(0, 3);
          const activeCount = dayReminders.filter((r) => !r.is_sent).length;
          const activeInDots = displayedDots.filter((r) => !r.is_sent).length;
          const remainingActiveCount = Math.max(0, activeCount - activeInDots);

          const fullDateLabel = item.date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
          const remindersCountText = dayReminders.length > 0
            ? `, ${dayReminders.length} нагадувань`
            : '';
          const ariaLabel = `${fullDateLabel}${today ? ', сьогодні' : ''}${remindersCountText}`;

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-current={today ? 'date' : undefined}
              aria-label={ariaLabel}
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
                {displayedDots.map((r, i) => {
                  const category = getCategoryMeta(r.category);
                  const isDone = Boolean(r.is_sent);
                  const dotColorClass = isSelected
                    ? isDone
                      ? 'bg-white/40'
                      : 'bg-white'
                    : isDone
                    ? 'bg-slate-300 dark:bg-slate-600'
                    : category.dotColor;

                  return (
                    <span
                      key={r.id || i}
                      className={`w-1.5 h-1.5 rounded-full transition-transform ${dotColorClass}`}
                      title={`${r.title}${isDone ? ' (виконано)' : ''}`}
                    />
                  );
                })}
                {remainingActiveCount > 0 && (
                  <span
                    className={`text-[9px] font-bold ${
                      isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    title={`Ще ${remainingActiveCount} активних нагадувань`}
                  >
                    +{remainingActiveCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
