import React from 'react';
import { cn } from '../../lib/utils';
import { STAGE_CONFIG, TIER_CONFIG } from '../../lib/constants';
import { ApplicationStage, AgentTier } from '../../types/domain';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border select-none transition-colors';

  const variants = {
    default:
      'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    outline: 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300',
    secondary:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    warning:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    danger:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

export const StageBadge: React.FC<{ stage: ApplicationStage; className?: string }> = ({
  stage,
  className,
}) => {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.Lead;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs transition-colors',
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
      <span>{config.label}</span>
    </span>
  );
};

export const TierBadge: React.FC<{ tier?: AgentTier | null; className?: string }> = ({
  tier,
  className,
}) => {
  if (!tier) return null;
  const config = TIER_CONFIG[tier] || TIER_CONFIG.Bronze;
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider border shadow-xs',
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      {tier}
    </span>
  );
};
