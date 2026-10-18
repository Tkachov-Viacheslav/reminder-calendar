import React, { useEffect, useRef } from 'react';

export function Checkbox({
  checked = false,
  onChange,
  label = '',
  description = '',
  indeterminate = false,
  disabled = false,
  id,
  className = '',
  ...props
}) {
  const inputRef = useRef(null);
  const checkboxId = id || (label ? `chk-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-center gap-2.5 min-h-[40px] py-1 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <input
        ref={inputRef}
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer transition-colors"
        style={{ accentColor: 'var(--brand-color, #4f46e5)' }}
        {...props}
      />
      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span
              className={`text-xs sm:text-sm font-medium transition-colors ${
                checked
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
