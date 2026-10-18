import React, { useState } from 'react';
import { ListTodo, Check, X, Plus } from 'lucide-react';

export function ChecklistEditor({ items = [], onAddItem, onToggleItem, onDeleteItem }) {
  const [newItemText, setNewItemText] = useState('');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    onAddItem(trimmed);
    setNewItemText('');
  };

  const completedCount = items.filter((i) => i.done).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
          <span>Підзавдання / Чек-лист</span>
        </label>
        {items.length > 0 && (
          <span className="text-[11px] text-slate-400">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto pr-1">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs"
            >
              <button
                type="button"
                onClick={() => onToggleItem(it.id)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  it.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                }`}
              >
                {it.done && <Check className="w-3 h-3 stroke-[3]" />}
              </button>
              <span
                className={`flex-1 break-words ${
                  it.done
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {it.text}
              </span>
              <button
                type="button"
                onClick={() => onDeleteItem(it.id)}
                className="text-slate-400 hover:text-rose-500 p-0.5"
                title="Видалити пункт"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add input */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Додати пункт чек-листа..."
          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Додати</span>
        </button>
      </div>
    </div>
  );
}
