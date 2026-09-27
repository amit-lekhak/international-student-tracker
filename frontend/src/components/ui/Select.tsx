import React, { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center w-full">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 pr-9 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 shadow-xs cursor-pointer',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 h-4 w-4 pointer-events-none text-slate-400" />
      </div>
    );
  },
);

Select.displayName = 'Select';
