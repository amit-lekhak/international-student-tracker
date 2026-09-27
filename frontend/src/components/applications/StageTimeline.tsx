import React from 'react';
import { APPLICATION_STAGES } from '../../lib/constants';
import { ApplicationStage } from '../../types/domain';
import { Check, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StageTimelineProps {
  currentStage: ApplicationStage;
  dwellDays: number;
  onSelectStage?: (stage: ApplicationStage) => void;
  isUpdating?: boolean;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
  currentStage,
  dwellDays,
  onSelectStage,
  isUpdating = false,
}) => {
  const currentIndex = APPLICATION_STAGES.indexOf(currentStage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Application Lifecycle Stage
        </h4>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5 text-blue-500" />
          <span>Active for {dwellDays} days in current stage</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {APPLICATION_STAGES.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isTerminal = stage === 'Enrolled' || stage === 'Withdrawn';

          let stateStyle =
            'bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300';
          let icon = <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>;

          if (isCurrent) {
            stateStyle =
              'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-950 dark:text-blue-200 font-bold shadow-xs';
            icon = <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />;
          } else if (isPassed) {
            stateStyle =
              'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 font-medium';
            icon = <Check className="h-3.5 w-3.5 text-emerald-600" />;
          } else if (isTerminal && stage === 'Withdrawn') {
            stateStyle =
              'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300';
          }

          return (
            <button
              key={stage}
              type="button"
              disabled={isUpdating}
              onClick={() => onSelectStage && onSelectStage(stage)}
              className={cn(
                'p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between gap-2',
                stateStyle,
                onSelectStage ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  {icon}
                </div>
                <span className="truncate">{stage}</span>
              </div>
              {onSelectStage && !isCurrent && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-50 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
