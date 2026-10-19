import React from 'react';
import { Search, X, Trash2, User, CheckCircle2, Clock } from 'lucide-react';
import { SYSTEM_CATEGORIES } from '../../utils/constants';
import { useTelegram } from '../../context/TelegramContext';

export function ReminderFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  onlyMine,
  onToggleOnlyMine,
  isTeam = false,
  canEdit = false,
  customCategories = [],
  onClearCompleted,
}) {
  const { triggerHaptic } = useTelegram();

  return (
    <div className="space-y-2.5">
      {/* Status Segment & Team "Only Mine" Filter */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        {/* Status Tabs */}
        <div className="inline-flex rounded-lg bg-slate-200/80 dark:bg-slate-800 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              onStatusFilterChange('all');
              triggerHaptic('light');
            }}
            className={`px-2 py-1 rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Всі ({statusCounts.all})
          </button>
          <button
            type="button"
            onClick={() => {
              onStatusFilterChange('active');
              triggerHaptic('light');
            }}
            className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Активні ({statusCounts.active})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onStatusFilterChange('completed');
              triggerHaptic('light');
            }}
            className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
              statusFilter === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Виконані ({statusCounts.completed})</span>
          </button>
        </div>

        {/* Right side controls: "Only mine" and "Clear completed" */}
        <div className="flex items-center gap-1.5 ml-auto">
          {isTeam && (
            <button
              type="button"
              onClick={() => {
                onToggleOnlyMine(!onlyMine);
                triggerHaptic('light');
              }}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors border ${
                onlyMine
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
              title="Фільтрувати завдання, де ви автор або відповідальний"
            >
              <User className="w-3 h-3" />
              <span>Тільки мої</span>
            </button>
          )}

          {canEdit && statusCounts.completed > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="px-2 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-900"
              title="Очистити всі виконані нагадування за обраний період"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Очистити виконані</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Пошук за назвою чи описом..."
          className="w-full pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => onCategoryChange('all')}
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
            onClick={() => onCategoryChange(cat.id)}
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
            onClick={() => onCategoryChange(catName)}
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
    </div>
  );
}
