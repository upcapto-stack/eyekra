import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={[
        'w-full rounded-xl border border-slate-300 dark:border-slate-400 bg-white dark:bg-white px-4 py-3 text-slate-900 dark:text-slate-900 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent',
        className,
      ].join(' ')}
      {...props}
    />
  )
);

Input.displayName = 'Input';
