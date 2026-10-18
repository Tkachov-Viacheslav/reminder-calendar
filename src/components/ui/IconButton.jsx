import React from 'react';

const VARIANTS = {
  ghost:
    'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
  secondary:
    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
  outline:
    'border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/25',
  danger:
    'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40',
  success:
    'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
};

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
};

export function IconButton({
  icon,
  'aria-label': ariaLabel,
  title,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.ghost;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title || ariaLabel}
      aria-label={ariaLabel || title}
      className={`relative inline-flex items-center justify-center rounded-xl transition-all select-none cursor-pointer min-h-[40px] min-w-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variantClass} ${className}`}
      {...props}
    >
      <span className={`inline-flex items-center justify-center ${sizeClass}`}>
        {icon}
      </span>
    </button>
  );
}
