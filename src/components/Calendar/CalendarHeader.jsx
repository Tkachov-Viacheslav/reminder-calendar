import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { MONTH_NAMES_UA } from '../../utils/dateUtils';
import { useTelegram } from '../../context/TelegramContext';

export function CalendarHeader({ viewDate, onPrevMonth, onNextMonth, onGoToday }) {
  const { triggerHaptic } = useTelegram();
  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();
  const monthName = MONTH_NAMES_UA[monthIndex];

  const handlePrev = () => {
    triggerHaptic('light');
    onPrevMonth();
  };

  const handleNext = () => {
    triggerHaptic('light');
    onNextMonth();
  };

  const handleToday = () => {
    triggerHaptic('medium');
    onGoToday();
  };

  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {monthName}
        </h2>
        <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
          {year}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleToday}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>Сьогодні</span>
        </button>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={handlePrev}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors"
            aria-label="Попередній місяць"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors"
            aria-label="Наступний місяць"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
