import React from 'react';
import { ListTodo, Check } from 'lucide-react';

export function ReminderCardSubtasks({ items, onToggleSubtask }) {
  if (!items || items.length === 0) return null;

  const completedCount = items.filter((i) => i.done).length;

  return (
    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <ListTodo className="w-3 h-3 text-indigo-500" />
          <span>Підзавдання</span>
        </span>
        <span>
          {completedCount}/{items.length}
        </span>
      </div>
      {items.map((it) => (
        <div
          key={it.id}
          onClick={(e) => onToggleSubtask(e, it.id)}
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
  );
}
