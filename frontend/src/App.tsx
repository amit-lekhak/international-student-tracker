import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/layout/Header';
import { FilterBar } from './components/applications/FilterBar';
import { ApplicationTable } from './components/applications/ApplicationTable';
import { ApplicationDrawer } from './components/applications/ApplicationDrawer';
import { NewApplicationModal } from './components/applications/NewApplicationModal';
import { AiDiagnosticPanel } from './components/ai/AiDiagnosticPanel';
import { LoginScreen } from './components/auth/LoginScreen';
import { useApplications } from './hooks/useApplications';
import { ApplicationFilterParams } from './types/domain';

// TanStack Query client with tiered cache config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const DEFAULT_FILTERS: ApplicationFilterParams = {
  page: 1,
  limit: 15,
  sortBy: 'stageEnteredDate',
  sortOrder: 'DESC',
};

function MainDashboard() {
  const [filters, setFilters] = useState<ApplicationFilterParams>(DEFAULT_FILTERS);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isAiConsoleOpen, setIsAiConsoleOpen] = useState(false);

  const { data, isLoading } = useApplications(filters);
  const totalCount = data?.meta?.total ?? data?.total;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Sticky Top Navigation */}
      <Header onOpenNewModal={() => setIsNewModalOpen(true)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Application Pipeline Workspace */}
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3 sm:space-y-4 flex-1">
          {/* Filter Bar */}
          <ErrorBoundary fallbackTitle="Filter bar failed to load">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              totalCount={totalCount}
              isLoading={isLoading}
            />
          </ErrorBoundary>

          {/* Application Data Table */}
          <ErrorBoundary fallbackTitle="Application table failed to load">
            <ApplicationTable
              data={data}
              isLoading={isLoading}
              filters={filters}
              onFilterChange={setFilters}
              onSelectApplication={setSelectedAppId}
            />
          </ErrorBoundary>
        </div>
      </main>

      {/* Floating Bottom-Right Chatbot Widget */}
      <ErrorBoundary fallbackTitle="AI Assistant crashed">
        <AiDiagnosticPanel
          isOpen={isAiConsoleOpen}
          onClose={() => setIsAiConsoleOpen(false)}
          onToggle={() => setIsAiConsoleOpen((v) => !v)}
        />
      </ErrorBoundary>

      {/* Application Detail Slide-Over Drawer */}
      <ErrorBoundary fallbackTitle="Application detail drawer crashed">
        <ApplicationDrawer
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      </ErrorBoundary>

      {/* New Application Modal */}
      <ErrorBoundary fallbackTitle="New application form crashed">
        <NewApplicationModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
        />
      </ErrorBoundary>
    </div>
  );
}

function AppShell() {
  const { isAuthenticated, isLoading } = useAuth();

  // Brief spinner during initial auto-login — prevents flash of login screen on cold load
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <MainDashboard />;
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application failed to initialize">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <ErrorBoundary fallbackTitle="Dashboard failed to render">
              <AppShell />
            </ErrorBoundary>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
