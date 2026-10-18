import React from 'react';

const VARIANTS = {
  text: 'h-4 w-full rounded-md',
  title: 'h-6 w-3/4 rounded-lg',
  circle: 'rounded-full',
  card: 'h-24 w-full rounded-2xl',
  button: 'h-9 w-24 rounded-xl',
};

export function Skeleton({
  variant = 'text',
  className = '',
  width,
  height,
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.text;
  const style = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800/60 ${variantClass} ${className}`}
      {...props}
    />
  );
}
