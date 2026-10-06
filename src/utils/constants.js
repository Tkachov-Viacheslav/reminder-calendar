export const SYSTEM_CATEGORIES = {
  main: {
    id: 'main',
    label: 'Головне',
    color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    dotColor: 'bg-indigo-500',
    accentColor: '#6366f1',
  },
  other: {
    id: 'other',
    label: 'Інше',
    color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    dotColor: 'bg-slate-500',
    accentColor: '#64748b',
  },
};

export const DEFAULT_CATEGORY = 'main';

export const LOCAL_STORAGE_KEY = 'reminder_calendar_events_v1';
export const LOCAL_STORAGE_USER = 'reminder_auth_user_v1';
export const LOCAL_STORAGE_CHAT_ID = 'reminder_telegram_chat_id';
export const LOCAL_STORAGE_CUSTOM_CATEGORIES = 'reminder_custom_categories_v1';

const CUSTOM_PALETTES = [
  { color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', dotColor: 'bg-emerald-500' },
  { color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', dotColor: 'bg-amber-500' },
  { color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30', dotColor: 'bg-purple-500' },
  { color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30', dotColor: 'bg-rose-500' },
  { color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30', dotColor: 'bg-sky-500' },
  { color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30', dotColor: 'bg-teal-500' },
];

export function getCategoryMeta(catIdOrName) {
  if (!catIdOrName) return SYSTEM_CATEGORIES.other;
  const key = String(catIdOrName).toLowerCase().trim();

  if (key === 'main' || key === 'головне') return SYSTEM_CATEGORIES.main;
  if (key === 'other' || key === 'інше') return SYSTEM_CATEGORIES.other;
  if (key === 'personal' || key === 'особисте') {
    return {
      id: catIdOrName,
      label: 'Особисте',
      color: CUSTOM_PALETTES[0].color,
      dotColor: CUSTOM_PALETTES[0].dotColor,
    };
  }
  if (key === 'work' || key === 'робота') {
    return {
      id: catIdOrName,
      label: 'Робота',
      color: CUSTOM_PALETTES[4].color,
      dotColor: CUSTOM_PALETTES[4].dotColor,
    };
  }

  // Hash custom name to pick a consistent color
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const palette = CUSTOM_PALETTES[Math.abs(hash) % CUSTOM_PALETTES.length];

  return {
    id: catIdOrName,
    label: catIdOrName,
    color: palette.color,
    dotColor: palette.dotColor,
  };
}

export const CATEGORIES = SYSTEM_CATEGORIES;
