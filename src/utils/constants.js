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
export const LOCAL_STORAGE_ACTIVE_TEAM = 'reminder_active_team_v1';

export const CATEGORY_COLOR_PALETTES = [
  { id: 'emerald', label: 'Смарагдовий', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30', dotColor: 'bg-emerald-500', hex: '#10b981' },
  { id: 'amber', label: 'Бурштиновий', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', dotColor: 'bg-amber-500', hex: '#f59e0b' },
  { id: 'purple', label: 'Пурпурний', color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30', dotColor: 'bg-purple-500', hex: '#a855f7' },
  { id: 'rose', label: 'Рожевий', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30', dotColor: 'bg-rose-500', hex: '#f43f5e' },
  { id: 'sky', label: 'Блакитний', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30', dotColor: 'bg-sky-500', hex: '#0ea5e9' },
  { id: 'teal', label: 'Бірюзовий', color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30', dotColor: 'bg-teal-500', hex: '#14b8a6' },
  { id: 'orange', label: 'Помаранчевий', color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30', dotColor: 'bg-orange-500', hex: '#f97316' },
  { id: 'violet', label: 'Фіолетовий', color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30', dotColor: 'bg-violet-500', hex: '#8b5cf6' },
  { id: 'fuchsia', label: 'Фуксія', color: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30', dotColor: 'bg-fuchsia-500', hex: '#d946ef' },
  { id: 'cyan', label: 'Циан', color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30', dotColor: 'bg-cyan-500', hex: '#06b6d4' },
  { id: 'lime', label: 'Лайм', color: 'bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30', dotColor: 'bg-lime-500', hex: '#84cc16' },
  { id: 'blue', label: 'Синій', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30', dotColor: 'bg-blue-500', hex: '#3b82f6' },
];

let customCategoryColorRegistry = {};

export function setCustomCategoryColors(colorsMap) {
  if (colorsMap && typeof colorsMap === 'object') {
    customCategoryColorRegistry = { ...customCategoryColorRegistry, ...colorsMap };
  }
}

export function getCategoryMeta(catIdOrName) {
  if (!catIdOrName) return SYSTEM_CATEGORIES.other;
  const key = String(catIdOrName).toLowerCase().trim();

  if (key === 'main' || key === 'головне') return SYSTEM_CATEGORIES.main;
  if (key === 'other' || key === 'інше') return SYSTEM_CATEGORIES.other;

  // 1. Check if user configured an explicit color for this category
  const customColorId = customCategoryColorRegistry[key];
  if (customColorId) {
    const matched = CATEGORY_COLOR_PALETTES.find((p) => p.id === customColorId);
    if (matched) {
      return {
        id: catIdOrName,
        label: catIdOrName,
        color: matched.color,
        dotColor: matched.dotColor,
        accentColor: matched.hex,
      };
    }
  }

  // 2. Fallbacks for standard legacy names
  if (key === 'personal' || key === 'особисте') {
    return {
      id: catIdOrName,
      label: 'Особисте',
      color: CATEGORY_COLOR_PALETTES[0].color,
      dotColor: CATEGORY_COLOR_PALETTES[0].dotColor,
      accentColor: CATEGORY_COLOR_PALETTES[0].hex,
    };
  }
  if (key === 'work' || key === 'робота') {
    return {
      id: catIdOrName,
      label: 'Робота',
      color: CATEGORY_COLOR_PALETTES[4].color,
      dotColor: CATEGORY_COLOR_PALETTES[4].dotColor,
      accentColor: CATEGORY_COLOR_PALETTES[4].hex,
    };
  }

  // 3. Deterministic hash fallback across the 12 rich palettes
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const palette = CATEGORY_COLOR_PALETTES[Math.abs(hash) % CATEGORY_COLOR_PALETTES.length];

  return {
    id: catIdOrName,
    label: catIdOrName,
    color: palette.color,
    dotColor: palette.dotColor,
    accentColor: palette.hex,
  };
}

export const CATEGORIES = SYSTEM_CATEGORIES;
