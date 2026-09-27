import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    // Log exception for diagnostics
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xl p-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-200 dark:border-rose-800 shadow-sm">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {this.props.fallbackTitle || 'Something went wrong in this view'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                An unexpected runtime error was caught. You can try refreshing or resetting the
                active state.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left overflow-x-auto max-h-40 text-xs font-mono text-rose-600 dark:text-rose-400">
                <div className="font-bold">{this.state.error.toString()}</div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-slate-500 mt-2 text-[10px] whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition"
              >
                <Home className="w-4 h-4" />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
