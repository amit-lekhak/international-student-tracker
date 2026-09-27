import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { QUICK_SWITCH_PRESETS } from '../../lib/constants';
import { ShieldCheck, UserCircle, Check, ChevronDown, Sparkles } from 'lucide-react';
import { TierBadge } from '../ui/Badge';
import { cn } from '../../lib/utils';

export const RoleSwitcher: React.FC = () => {
  const { user, agentProfile, activePreset, switchPreset, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-xs',
          user?.role === 'ADMIN'
            ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800'
            : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
        )}
      >
        <div className="flex items-center gap-1.5">
          {user?.role === 'ADMIN' ? (
            <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
          ) : (
            <UserCircle className="h-4 w-4 text-blue-600 shrink-0" />
          )}
          <span className="font-semibold">
            {user?.role === 'AGENT' && agentProfile
              ? agentProfile.name
              : activePreset
                ? activePreset.label
                : user?.email || 'Select Account'}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-40 p-2 space-y-1 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span>Quick User Switcher</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Switch between Administrator and Partner Agency accounts.
              </p>
            </div>

            <div className="pt-1 space-y-1">
              {QUICK_SWITCH_PRESETS.map((preset) => {
                const isSelected = user?.email === preset.email;
                return (
                  <button
                    key={preset.id}
                    disabled={isLoading}
                    onClick={async () => {
                      await switchPreset(preset.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full text-left p-2.5 rounded-xl text-xs transition flex items-start justify-between gap-2',
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{preset.label}</span>
                        {isSelected && agentProfile?.tier ? (
                          <TierBadge tier={agentProfile.tier} />
                        ) : preset.tier ? (
                          <TierBadge tier={preset.tier} />
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{preset.email}</div>
                      <div className="text-[11px] text-slate-400 leading-tight">
                        {isSelected && agentProfile ? agentProfile.name : preset.description}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
