import React from 'react';
import { ListTodo } from 'lucide-react';
import { Checkbox } from '../ui';

export function ReminderCardSubtasks({ items, onToggleSubtask }) {
  if (!items || items.length === 0) return null;

  const completedCount = items.filter((i) => i.done).length;

  return (
    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pb-1">
        <span className="flex items-center gap-1">
          <ListTodo className="w-3 h-3 text-indigo-500" />
          <span>Підзавдання</span>
        </span>
        <span>
          {completedCount}/{items.length}
        </span>
      </div>
      <div className="space-y-0.5">
        {items.map((it) => (
          <Checkbox
            key={it.id}
            id={`subtask-${it.id}`}
            checked={Boolean(it.done)}
            onChange={(e) => onToggleSubtask(e, it.id)}
            label={it.text}
            className="w-full"
          />
        ))}
      </div>
    </div>
  );
}
