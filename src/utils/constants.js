export const CATEGORIES = {
  work: {
    id: 'work',
    label: 'Робота',
    color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    dotColor: 'bg-blue-500',
    accentColor: '#3b82f6',
  },
  personal: {
    id: 'personal',
    label: 'Особисте',
    color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    dotColor: 'bg-emerald-500',
    accentColor: '#10b981',
  },
  study: {
    id: 'study',
    label: 'Навчання',
    color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    dotColor: 'bg-purple-500',
    accentColor: '#a855f7',
  },
  health: {
    id: 'health',
    label: 'Здоров’я',
    color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    dotColor: 'bg-rose-500',
    accentColor: '#f43f5e',
  },
  other: {
    id: 'other',
    label: 'Інше',
    color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-500',
    accentColor: '#f59e0b',
  },
};

export const DEFAULT_CATEGORY = 'personal';

export const LOCAL_STORAGE_KEY = 'reminder_calendar_events_v1';
export const LOCAL_STORAGE_CHAT_ID = 'reminder_telegram_chat_id';
