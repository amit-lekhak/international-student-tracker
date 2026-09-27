import { GraduationCap, Database, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              International Student Application Tracker
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Admissions Pipeline & Grounded AI Diagnostic Engine
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border rounded-xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
              <Database className="h-4 w-4" />
              <span>Relational Schema</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">PostgreSQL TypeORM Engine</h2>
            <p className="text-sm text-slate-600">
              Entities, multi-dimensional indexes, and deterministic synthetic seed generator
              initialized.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 pt-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Phase 1 Scaffolding Ready</span>
            </div>
          </div>

          <div className="p-6 bg-white border rounded-xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Grounded AI Agent</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Deterministic SQL Tools</h2>
            <p className="text-sm text-slate-600">
              Deterministic SQL aggregations and Langfuse observability prepared for Phase 3.
            </p>
          </div>

          <div className="p-6 bg-white border rounded-xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
              <GraduationCap className="h-4 w-4" />
              <span>OpenAPI Codegen</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Self-Contained Frontend</h2>
            <p className="text-sm text-slate-600">
              Tailwind CSS, Vite, and OpenAPI type-generation pipeline configured.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
