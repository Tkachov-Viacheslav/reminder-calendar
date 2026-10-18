import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { SYSTEM_CATEGORIES, getCategoryMeta } from '../../utils/constants';

export function CategoryChips({
  category,
  onSelectCategory,
  customCategories = [],
  onAddCustomCategory,
  onDeleteCustomCategory,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const handleAddSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    onAddCustomCategory(trimmed);
    setNewCatInput('');
    setIsAdding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAddSubmit(e);
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewCatInput('');
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        Категорія
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* System Categories */}
        {Object.values(SYSTEM_CATEGORIES).map((cat) => {
          const isSelected = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isSelected
                  ? `${cat.color} font-bold ring-2 ring-indigo-500/40 shadow-sm`
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat.label}
            </button>
          );
        })}

        {/* Custom Categories */}
        {customCategories.map((catName) => {
          const meta = getCategoryMeta(catName);
          const isSelected = category === catName;
          return (
            <div
              key={catName}
              onClick={() => onSelectCategory(catName)}
              role="button"
              tabIndex={0}
              className={`flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                isSelected
                  ? `${meta.color} font-bold ring-2 ring-indigo-500/40 shadow-sm`
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>{catName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCustomCategory(catName);
                }}
                className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                title="Видалити категорію"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {/* Add custom category button or input */}
        {isAdding ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              placeholder="Назва..."
              maxLength={20}
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-2 py-0.5 text-xs bg-slate-50 dark:bg-slate-800 border border-indigo-400 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none w-24"
            />
            <button
              type="button"
              onClick={handleAddSubmit}
              className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              title="Зберегти категорію"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewCatInput('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              title="Скасувати"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-indigo-300 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Категорія</span>
          </button>
        )}
      </div>
    </div>
  );
}
