import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { SYSTEM_CATEGORIES, getCategoryMeta, CATEGORY_COLOR_PALETTES } from '../../utils/constants';

export function CategoryChips({
  category,
  onSelectCategory,
  customCategories = [],
  onAddCustomCategory,
  onDeleteCustomCategory,
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('emerald');
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(null);
  const safeCustom = Array.isArray(customCategories)
    ? customCategories.filter((c) => Boolean(c && String(c).trim()))
    : [];

  React.useEffect(() => {
    if (!confirmDeleteCat) return;
    const timer = setTimeout(() => setConfirmDeleteCat(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmDeleteCat]);

  const handleAddSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    onAddCustomCategory(trimmed, selectedColorId);
    setNewCatInput('');
    setSelectedColorId('emerald');
    setIsAdding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAddSubmit(e);
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNewCatInput('');
      setSelectedColorId('emerald');
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

        {/* Custom Categories with Accidental Delete Protection */}
        {safeCustom.map((catName) => {
          const meta = getCategoryMeta(catName);
          const isSelected = category === catName;
          const isConfirming = confirmDeleteCat === catName;

          if (isConfirming) {
            return (
              <div
                key={catName}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-fadeIn"
              >
                <span>Видалити «{catName}»?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomCategory(catName);
                    setConfirmDeleteCat(null);
                  }}
                  className="p-0.5 hover:bg-rose-200 dark:hover:bg-rose-900 rounded text-rose-800 dark:text-rose-200 transition-colors"
                  title="Підтвердити видалення"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteCat(null);
                  }}
                  className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 transition-colors"
                  title="Скасувати"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

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
                  setConfirmDeleteCat(catName);
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
          <div className="flex flex-col gap-1.5 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 animate-fadeIn">
            <div className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                placeholder="Назва..."
                maxLength={20}
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-indigo-400 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none w-28"
              />
              <button
                type="button"
                onClick={handleAddSubmit}
                className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                title="Зберегти категорію"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewCatInput('');
                  setSelectedColorId('emerald');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                title="Скасувати"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {/* Color selection row */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[190px] scrollbar-none">
              {CATEGORY_COLOR_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  title={pal.label}
                  onClick={() => setSelectedColorId(pal.id)}
                  className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-transform ${pal.dotColor} ${
                    selectedColorId === pal.id ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110 opacity-80'
                  }`}
                />
              ))}
            </div>
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
