import React from 'react';

const VARIANTS = {
  default:
    'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm',
  elevated:
    'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md',
  muted:
    'bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800',
};

export function Card({
  children,
  variant = 'default',
  className = '',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.default;

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 transition-all ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
