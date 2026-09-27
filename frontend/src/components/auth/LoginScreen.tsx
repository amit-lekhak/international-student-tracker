import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { QUICK_SWITCH_PRESETS, QuickSwitchPreset } from '../../lib/constants';
import { GraduationCap, Shield, Users, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const ROLE_ICON: Record<string, React.ReactNode> = {
  ADMIN: <Shield className="h-5 w-5" />,
  AGENT: <Users className="h-5 w-5" />,
};

const TIER_COLORS: Record<string, string> = {
  Gold: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400',
  Silver:
    'text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
  Bronze:
    'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400',
};

const PresetCard: React.FC<{
  preset: QuickSwitchPreset;
  onSelect: (id: string) => void;
  isLoading: boolean;
  selectedId: string | null;
}> = ({ preset, onSelect, isLoading, selectedId }) => {
  const isBusy = isLoading && selectedId === preset.id;
  const isDisabled = isLoading && selectedId !== preset.id;

  return (
    <button
      id={`login-preset-${preset.id}`}
      onClick={() => onSelect(preset.id)}
      disabled={isLoading}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all group flex items-center gap-4',
        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
        'hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/10',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        isDisabled && 'opacity-40 cursor-not-allowed',
        isBusy && 'border-blue-400 dark:border-blue-600 shadow-md shadow-blue-500/10',
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border',
          preset.role === 'ADMIN'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
            : preset.tier
              ? TIER_COLORS[preset.tier]
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
        )}
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : ROLE_ICON[preset.role]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
          {preset.label}
        </div>
        {preset.agencyName && (
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{preset.agencyName}</div>
        )}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
          {preset.description}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition shrink-0" />
    </button>
  );
};

export const LoginScreen: React.FC = () => {
  const { switchPreset, login, isLoading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const handlePreset = async (id: string) => {
    setSelectedId(id);
    try {
      await switchPreset(id);
    } finally {
      setSelectedId(null);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    try {
      await login({ email, password });
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo + Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mx-auto">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              International Student Tracker
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select an account to continue</p>
          </div>
        </div>

        {/* Preset Cards */}
        <div className="space-y-2.5">
          {QUICK_SWITCH_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              onSelect={handlePreset}
              isLoading={isLoading}
              selectedId={selectedId}
            />
          ))}
        </div>

        {/* Manual login toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowManual((v) => !v)}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition underline underline-offset-2"
          >
            {showManual ? 'Hide manual login' : 'Sign in with email & password'}
          </button>
        </div>

        {showManual && (
          <form
            onSubmit={handleManualLogin}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={manualLoading}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {manualLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>
        )}

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-600">
          International Student Application Tracker · Internal Use Only
        </p>
      </div>
    </div>
  );
};
