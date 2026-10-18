import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-sm shadow-indigo-600/25',
  secondary:
    'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
  outline:
    'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
  ghost:
    'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300',
  danger:
    'bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-sm shadow-rose-600/25',
  success:
    'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-sm shadow-emerald-600/25',
};

const SIZES = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1',
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-xl gap-1.5',
  md: 'px-4 py-2 text-sm font-semibold rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base font-bold rounded-xl gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'sm',
  icon = null,
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.sm;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
}
