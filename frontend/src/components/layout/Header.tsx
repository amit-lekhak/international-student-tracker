import React from 'react';
import { GraduationCap, LogOut, Plus } from 'lucide-react';
import { RoleSwitcher } from './RoleSwitcher';
import { useAuth } from '../../context/AuthContext';

export interface HeaderProps {
  onOpenNewModal: () => void;
  onToggleAiConsole?: () => void;
  isAiConsoleOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewModal }) => {
  const { logout, user } = useAuth();

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-md shadow-blue-500/20 shrink-0">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                International Student Tracker
              </h1>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Admissions Pipeline & Intelligent Insights
            </p>
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* New Application Action */}
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 shadow-xs shadow-blue-500/20 transition active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">New Application</span>
            <span className="inline xs:hidden sm:hidden">New</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Role Persona Switcher */}
          <RoleSwitcher />

          {/* Logout if authenticated */}
          {user && (
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
