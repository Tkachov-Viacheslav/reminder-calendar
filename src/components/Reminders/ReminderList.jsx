import React, { useState } from 'react';
import { Bell, Calendar as CalendarIcon, Search, X } from 'lucide-react';
import { ReminderCard } from './ReminderCard';
import { formatDateUkrainian, isSameDay } from '../../utils/dateUtils';
import { SYSTEM_CATEGORIES } from '../../utils/constants';
import { useReminders } from '../../context/ReminderContext';

export function ReminderList({ onOpenNewReminder, onEditReminder }) {
  const { reminders, customCategories, selectedDate, updateReminder, deleteReminder } =
    useReminders();
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const dayReminders = reminders.filter((r) => isSameDay(r.remind_at, selectedDate));

  const upcomingReminders = reminders
    .filter((r) => new Date(r.remind_at) >= new Date() && !r.is_sent)
    .sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at));

  const baseList = showAllUpcoming ? upcomingReminders : dayReminders;

  const filteredList = baseList.filter((r) => {
    if (selectedCategory !== 'all') {
      const rCat = (r.category || 'main').toLowerCase();
      if (rCat !== selectedCategory.toLowerCase()) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  const handleToggleSent = (id, newSent) => {
    updateReminder(id, { is_sent: newSent });
  };

  const isFilterActive = searchQuery.trim() !== '' || selectedCategory !== 'all';

  return (
    <div className="bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex flex-col h-full">
      {/* List Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-500" />
            {showAllUpcoming ? 'Усі найближчі' : formatDateUkrainian(selectedDate)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {filteredList.length} {filteredList.length === 1 ? 'нагадування' : 'нагадувань'}
            {isFilterActive && ` (з ${baseList.length})`}
          </p>
        </div>

        {/* Tab switch */}
        <button
          onClick={() => setShowAllUpcoming(!showAllUpcoming)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        >
          {showAllUpcoming ? 'На обраний день' : 'Показати всі'}
        </button>
      </div>

      {/* Search Input */}
      <div className="mt-3 relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Пошук за назвою чи описом..."
          className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          Всі
        </button>
        {Object.values(SYSTEM_CATEGORIES).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
        {customCategories.map((catName) => (
          <button
            key={catName}
            type="button"
            onClick={() => setSelectedCategory(catName)}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === catName
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            {catName}
          </button>
        ))}
      </div>

      {/* List or Empty State */}
      <div className="flex-1 overflow-y-auto my-2.5 space-y-2.5 max-h-[440px] pr-1">
        {filteredList.length === 0 ? (
          <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
            <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mb-2.5">
              <Bell className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              {isFilterActive
                ? 'Нічого не знайдено за фільтром'
                : showAllUpcoming
                ? 'Немає запланованих нагадувань'
                : 'На цей день немає подій'}
            </p>
            {isFilterActive ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                Скинути фільтри
              </button>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Створіть нагадування, і бот надішле його у ваш Telegram в зазначений час.
              </p>
            )}
          </div>
        ) : (
          filteredList.map((rem) => (
            <ReminderCard
              key={rem.id}
              reminder={rem}
              onToggleSent={handleToggleSent}
              onDelete={deleteReminder}
              onEdit={onEditReminder}
            />
          ))
        )}
      </div>
    </div>
  );
}
