import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Card: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
};
