import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import {
  SYSTEM_CATEGORIES,
  CATEGORY_COLOR_PALETTES,
  getCategoryMeta,
} from '../../utils/constants';
import { useReminders } from '../../context/ReminderContext';
import { useTelegram } from '../../context/TelegramContext';

export function CategoryManager({ isTeam = false, canEdit = true }) {
  const { triggerHaptic } = useTelegram();
  const {
    customCategories = [],
    categoryColors = {},
    addCustomCategory,
    updateCategoryColor,
    deleteCustomCategory,
  } = useReminders();

  const [newCatName, setNewCatName] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('emerald');
  const [confirmDelete, setConfirmDeleteCat] = useState(null);
  const [editingCatName, setEditingCatName] = useState(null);

  const handleAddCategory = (e) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    triggerHaptic('success');
    addCustomCategory(trimmed, selectedColorId);
    setNewCatName('');
    // Pick next color automatically as default for convenience
    const nextIdx = (CATEGORY_COLOR_PALETTES.findIndex((p) => p.id === selectedColorId) + 1) % CATEGORY_COLOR_PALETTES.length;
    setSelectedColorId(CATEGORY_COLOR_PALETTES[nextIdx].id);
  };

  const handleChangeColor = (catName, colorId) => {
    triggerHaptic('light');
    updateCategoryColor(catName, colorId);
    setEditingCatName(null);
  };

  const handleDelete = (catName) => {
    triggerHaptic('medium');
    deleteCustomCategory(catName);
    setConfirmDeleteCat(null);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Add New Category Form */}
      {canEdit && (
        <form
          onSubmit={handleAddCategory}
          className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-2.5"
        >
          <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
            Створити нову категорію
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Назва категорії (наприклад: Фінанси, Маркетинг)..."
              className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати</span>
            </button>
          </div>

          {/* Color palette circles for new category */}
          <div>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1.5">
              Оберіть колір мітки:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_COLOR_PALETTES.map((palette) => {
                const isSelected = selectedColorId === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => {
                      setSelectedColorId(palette.id);
                      triggerHaptic('light');
                    }}
                    title={palette.label}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${palette.dotColor} ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110 shadow-xs'
                        : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Наявні категорії
        </label>

        {/* System Categories (read only) */}
        <div className="space-y-1.5">
          {Object.values(SYSTEM_CATEGORIES).map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cat.dotColor}`} />
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.label}</span>
                <span className="text-[10px] text-slate-400 italic">(системна)</span>
              </div>
            </div>
          ))}

          {/* Custom Categories */}
          {customCategories.length === 0 ? (
            <div className="py-4 text-center text-slate-400 text-[11px] italic">
              Користувацьких категорій ще немає. Створіть першу вище!
            </div>
          ) : (
            customCategories.map((catName) => {
              const meta = getCategoryMeta(catName);
              const currentColorId = categoryColors[catName.toLowerCase().trim()];
              const isChangingColor = editingCatName === catName;

              return (
                <div
                  key={catName}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCatName(isChangingColor ? null : catName)}
                        title="Змінити колір цієї категорії"
                        className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 ${meta.dotColor}`}
                      />
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${meta.color}`}>
                        {catName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingCatName(isChangingColor ? null : catName)}
                        className="text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-1.5 py-0.5 rounded"
                      >
                        {isChangingColor ? 'Закрити' : 'Змінити колір'}
                      </button>

                      {canEdit && (
                        confirmDelete === catName ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(catName)}
                              className="text-[10px] font-bold text-rose-600 px-1.5 py-0.5 bg-rose-50 rounded"
                            >
                              Видалити?
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCat(null)}
                              className="text-[10px] text-slate-400"
                            >
                              Ні
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCat(catName)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded"
                            title="Видалити категорію"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Inline Color Palette Picker if user clicked "Змінити колір" */}
                  {isChangingColor && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="block text-[10px] text-slate-400 mb-1">
                        Оберіть новий колір для «{catName}»:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_COLOR_PALETTES.map((p) => {
                          const isCur = currentColorId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleChangeColor(catName, p.id)}
                              title={p.label}
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${p.dotColor} ${
                                isCur
                                  ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 scale-110'
                                  : 'opacity-80 hover:opacity-100 hover:scale-110'
                              }`}
                            >
                              {isCur && <Check className="w-3 h-3 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
