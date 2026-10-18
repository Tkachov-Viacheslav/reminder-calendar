import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

export function ReminderSwipeIndicator({ touchOffset, isSent }) {
  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl text-xs font-bold pointer-events-none">
      <div
        className={`flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 transition-opacity ${
          touchOffset > 20 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>{isSent ? 'Відновити' : 'Виконано'}</span>
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
  );
}
