import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateDwellDays(stageEnteredDate?: string | Date | null): number {
  if (!stageEnteredDate) return 0;
  const entered =
    typeof stageEnteredDate === 'string' ? new Date(stageEnteredDate) : stageEnteredDate;
  if (isNaN(entered.getTime())) return 0;
  const now = new Date();
  const diffMs = now.getTime() - entered.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return days;
}

export function formatDwellBadge(days: number): {
  text: string;
  className: string;
  isBottleneck: boolean;
} {
  if (days >= 30) {
    return {
      text: `${days}d in stage (Bottleneck)`,
      className:
        'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      isBottleneck: true,
    };
  }
  if (days >= 14) {
    return {
      text: `${days}d in stage (Delayed)`,
      className:
        'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      isBottleneck: false,
    };
  }
  return {
    text: `${days}d in stage (Normal)`,
    className:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    isBottleneck: false,
  };
}

export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
