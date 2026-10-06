import React, { useState } from 'react';
import { X, Calendar, Clock, Tag, FileText, Check } from 'lucide-react';
import { CATEGORIES, DEFAULT_CATEGORY } from '../../utils/constants';
import { toISODateString } from '../../utils/dateUtils';
import { useTelegram } from '../../context/TelegramContext';

export function ReminderModal({ isOpen, onClose, onSave, initialDate }) {
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
    });

    // Reset form
    setTitle('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Нове нагадування</span>
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
            <div className="flex flex-wrap gap-1.5">
              {Object.values(CATEGORIES).map((cat) => {
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
              <span>Зберегти нагадування</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
