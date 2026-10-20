import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Bell, Calendar as CalendarIcon } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ReminderCard } from './ReminderCard';
import { ReminderFilters } from './ReminderFilters';
import { formatDateUkrainian, isSameDay } from '../../utils/dateUtils';
import { useReminders } from '../../context/ReminderContext';
import { useTeam } from '../../context/TeamContext';
import { useTelegram } from '../../context/TelegramContext';
import { Card } from '../ui';

export function ReminderList({ onOpenNewReminder, onEditReminder }) {
  const {
    reminders,
    customCategories,
    selectedDate,
    updateReminder,
    deleteReminder,
    clearCompletedReminders,
  } = useReminders();
  const { currentTeam, canEdit } = useTeam();
  const { user, activeUserId } = useTelegram();

  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyMine, setOnlyMine] = useState(false);

  const dayReminders = useMemo(() => {
    return reminders
      .filter((r) => isSameDay(r.remind_at, selectedDate))
      .sort((a, b) => {
        if (Boolean(a.is_sent) !== Boolean(b.is_sent)) {
          return a.is_sent ? 1 : -1;
        }
        return new Date(a.remind_at) - new Date(b.remind_at);
      });
  }, [reminders, selectedDate]);

  const allRemindersList = useMemo(() => {
    return [...reminders].sort((a, b) => {
      if (Boolean(a.is_sent) !== Boolean(b.is_sent)) {
        return a.is_sent ? 1 : -1;
      }
      return new Date(a.remind_at) - new Date(b.remind_at);
    });
  }, [reminders]);

  const baseList = showAllUpcoming ? allRemindersList : dayReminders;

  const statusCounts = useMemo(() => {
    let active = 0;
    let completed = 0;
    for (const r of baseList) {
      if (r.is_sent) completed++;
      else active++;
    }
    return { all: baseList.length, active, completed };
  }, [baseList]);

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const cat = selectedCategory.toLowerCase();
    const cleanUser = (user?.username || '').replace(/^@/, '').toLowerCase();

    return baseList.filter((r) => {
      // 1. Status filter
      if (statusFilter === 'active' && r.is_sent) return false;
      if (statusFilter === 'completed' && !r.is_sent) return false;

      // 2. Only mine filter (team mode)
      if (onlyMine && currentTeam) {
        const isAuthor = activeUserId && String(r.user_id) === String(activeUserId);
        const isTagged =
          Array.isArray(r.tagged_members) &&
          r.tagged_members.some((m) => {
            const mId = m.telegram_id ? String(m.telegram_id) : '';
            const mUser = (m.username || '').replace(/^@/, '').toLowerCase();
            return (
              (activeUserId && mId === String(activeUserId)) ||
              (cleanUser && mUser === cleanUser)
            );
          });
        if (!isAuthor && !isTagged) return false;
      }

      // 3. Category filter
      if (cat !== 'all') {
        const rCat = (r.category || 'main').toLowerCase();
        if (rCat !== cat) return false;
      }

      // 4. Search query
      if (q) {
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [
    baseList,
    statusFilter,
    onlyMine,
    currentTeam,
    activeUserId,
    user,
    selectedCategory,
    searchQuery,
  ]);

  const handleToggleSent = useCallback(
    (id, newSent) => {
      updateReminder(id, { is_sent: newSent });
    },
    [updateReminder]
  );

  const handleClearCompleted = useCallback(() => {
    const completedIds = baseList.filter((r) => r.is_sent).map((r) => r.id);
    if (completedIds.length === 0) return;
    if (window.confirm(`Видалити ${completedIds.length} виконаних нагадувань?`)) {
      clearCompletedReminders(completedIds);
    }
  }, [baseList, clearCompletedReminders]);

  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    statusFilter !== 'all' ||
    onlyMine;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStatusFilter('all');
    setOnlyMine(false);
  };

  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 110,
    overscan: 4,
  });

  return (
    <Card variant="muted" className="flex flex-col h-full reminders-container">
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

      {/* Filter controls subcomponent */}
      <ReminderFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusCounts={statusCounts}
        onlyMine={onlyMine}
        onToggleOnlyMine={setOnlyMine}
        isTeam={Boolean(currentTeam)}
        canEdit={canEdit}
        customCategories={customCategories}
        onClearCompleted={handleClearCompleted}
      />

      {/* List or Empty State */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto my-2.5 max-h-[440px] pr-1 @container"
      >
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
                onClick={handleResetFilters}
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
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rem = filteredList[virtualRow.index];
              return (
                <div
                  key={rem.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: '10px',
                  }}
                >
                  <ReminderCard
                    reminder={rem}
                    canEdit={canEdit}
                    onToggleSent={handleToggleSent}
                    onDelete={deleteReminder}
                    onEdit={onEditReminder}
                    onUpdate={updateReminder}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
