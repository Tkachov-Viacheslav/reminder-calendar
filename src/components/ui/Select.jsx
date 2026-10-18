import React from 'react';
import { ChevronDown } from 'lucide-react';

export function Select({
  label = '',
  error = '',
  id,
  children,
  className = '',
  ...props
}) {
  const selectId = id || (label ? `sel-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full pl-3 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 disabled:opacity-50 min-h-[38px] ${
            error
              ? 'border-rose-400 dark:border-rose-700 focus:ring-rose-500'
              : 'border-slate-200 dark:border-slate-800'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
      </div>
      {error && (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
