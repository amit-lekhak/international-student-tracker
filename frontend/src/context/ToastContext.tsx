import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = toast.duration || 5000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string, title?: string) => showToast({ type: 'success', message, title }),
    [showToast],
  );
  const error = useCallback(
    (message: string, title?: string) => showToast({ type: 'error', message, title }),
    [showToast],
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast({ type: 'warning', message, title }),
    [showToast],
  );
  const info = useCallback(
    (message: string, title?: string) => showToast({ type: 'info', message, title }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, success, error, warning, info }}
    >
      {children}
      {/* Toast Render Portal */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4">
        {toasts.map((toast) => {
          let bg = 'bg-white text-slate-800 border-slate-200';
          let icon = <Info className="h-5 w-5 text-blue-500 shrink-0" />;

          if (toast.type === 'success') {
            bg = 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100';
            icon = <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
          } else if (toast.type === 'error') {
            bg = 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950 dark:text-rose-100';
            icon = <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />;
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100';
            icon = <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-bottom-2 ${bg}`}
              role="alert"
            >
              {icon}
              <div className="flex-1 text-sm">
                {toast.title && <div className="font-semibold">{toast.title}</div>}
                <div className="text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded transition"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
