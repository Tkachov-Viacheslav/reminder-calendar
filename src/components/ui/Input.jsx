import React from 'react';

export function Input({
  label = '',
  error = '',
  helperText = '',
  icon = null,
  id,
  className = '',
  ...props
}) {
  const generatedId = React.useId();
  const inputId = id || (label ? `inp-${label.toLowerCase().replace(/\s+/g, '-')}` : `inp-${generatedId}`);
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-errormessage={error ? errorId : undefined}
          aria-describedby={error ? errorId : (helperText ? helperId : undefined)}
          className={`w-full py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 disabled:opacity-50 min-h-[38px] user-invalid:border-rose-400 dark:user-invalid:border-rose-700 user-invalid:focus:ring-rose-500 ${
            icon ? 'pl-9 pr-3' : 'px-3'
          } ${
            error
              ? 'border-rose-400 dark:border-rose-700 focus:ring-rose-500'
              : 'border-slate-200 dark:border-slate-800'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-slate-400 dark:text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
