import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, FileText, Check, Pencil, Plus } from 'lucide-react';
import {
  SYSTEM_CATEGORIES,
  DEFAULT_CATEGORY,
  getCategoryMeta,
  LOCAL_STORAGE_CUSTOM_CATEGORIES,
} from '../../utils/constants';
import { toISODateString } from '../../utils/dateUtils';
import { useTelegram } from '../../context/TelegramContext';

export function ReminderModal({ isOpen, onClose, onSave, initialDate, editingReminder }) {
  const { triggerHaptic } = useTelegram();

  const getDefaultTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState(() => toISODateString(initialDate || new Date()));
  const [timeStr, setTimeStr] = useState(getDefaultTime);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CATEGORIES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  const handleAddCustomCategory = (e) => {
    e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === 'головне' || trimmed.toLowerCase() === 'main') {
      setCategory('main');
      setIsAddingCategory(false);
      setNewCatInput('');
      return;
    }
    if (trimmed.toLowerCase() === 'інше' || trimmed.toLowerCase() === 'other') {
      setCategory('other');
      setIsAddingCategory(false);
      setNewCatInput('');
      return;
    }
    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATEGORIES, JSON.stringify(updated));
      } catch (err) {}
    }
    setCategory(trimmed);
    setNewCatInput('');
    setIsAddingCategory(false);
    triggerHaptic('light');
  };

  const handleDeleteCustomCategory = (e, catToDelete) => {
    e.stopPropagation();
    const updated = customCategories.filter((c) => c !== catToDelete);
    setCustomCategories(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_CATEGORIES, JSON.stringify(updated));
    } catch (err) {}
    if (category === catToDelete) {
      setCategory(DEFAULT_CATEGORY);
    }
    triggerHaptic('light');
  };

  useEffect(() => {
    if (!isOpen) return;
    if (editingReminder) {
      setTitle(editingReminder.title || '');
      setDescription(editingReminder.description || '');
      setCategory(editingReminder.category || DEFAULT_CATEGORY);
      const remDate = new Date(editingReminder.remind_at);
      setDateStr(toISODateString(remDate));
      const hh = String(remDate.getHours()).padStart(2, '0');
      const mm = String(remDate.getMinutes()).padStart(2, '0');
      setTimeStr(`${hh}:${mm}`);
    } else {
      setTitle('');
      setDescription('');
      setCategory(DEFAULT_CATEGORY);
      setDateStr(toISODateString(initialDate || new Date()));
      setTimeStr(getDefaultTime());
    }
    setError('');
  }, [isOpen, editingReminder, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Будь ласка, вкажіть назву нагадування');
      triggerHaptic('error');
      return;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const reminderDate = new Date(year, month - 1, day, hours, minutes);

    triggerHaptic('success');
    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      remind_at: reminderDate.toISOString(),
      ...(editingReminder ? { is_sent: false } : {}),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {editingReminder ? (
              <>
                <Pencil className="w-4 h-4 text-indigo-500" />
                <span>Редагувати подію</span>
              </>
            ) : (
              <span>Нове нагадування</span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Назва події *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="Наприклад: Зустріч з клієнтом або Прийом ліків"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Дата
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Час нагадування
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Категорія
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {/* System Categories: Головне & Інше */}
              {Object.values(SYSTEM_CATEGORIES).map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setCategory(cat.id);
                    }}
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
                    onClick={() => {
                      triggerHaptic('light');
                      setCategory(catName);
                    }}
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
                      onClick={(e) => handleDeleteCustomCategory(e, catName)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                      title="Видалити категорію"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Add Custom Category Button or Input */}
              {isAddingCategory ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Назва..."
                    maxLength={20}
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomCategory(e);
                      if (e.key === 'Escape') setIsAddingCategory(false);
                    }}
                    className="px-2 py-0.5 text-xs bg-slate-50 dark:bg-slate-800 border border-indigo-400 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none w-24"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    title="Зберегти категорію"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false);
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
                  onClick={() => setIsAddingCategory(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed border-indigo-300 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Категорія</span>
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Опис чи нотатка (необов'язково)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Додаткові деталі, посилання або контакти..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{editingReminder ? 'Зберегти зміни' : 'Зберегти нагадування'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
