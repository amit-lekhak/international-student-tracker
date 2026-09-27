import React, { useState, useRef, useEffect, memo } from 'react';
import { useAiDiagnose, AiHistoryItem } from '../../hooks/useAiDiagnose';
import { GroundedDataTable } from './GroundedDataTable';
import { SUGGESTED_AI_PROMPTS } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Table,
  Clock,
  AlertCircle,
  Loader2,
  Lightbulb,
  X,
  Minus,
  Bot,
  User,
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { cn } from '../../lib/utils';

const TOOL_LABEL_MAP: Record<string, { label: string; color: string }> = {
  get_tier_conversion_comparison: {
    label: 'Tier Conversion Comparison',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  },
  get_stage_bottlenecks_by_program: {
    label: 'Stage Bottleneck Analysis',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  get_agent_performance_ranking: {
    label: 'Agency Performance Ranking',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  get_application_stage_distribution: {
    label: 'Pipeline Stage Distribution',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
};

// Inline markdown: bold only
function renderInlineMarkdown(text: string, key: string | number): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${key}-${j}`} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    }
    return <span key={`${key}-${j}`}>{part}</span>;
  });
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function isSeparatorRow(line: string): boolean {
  return isTableRow(line) && /^\|[\s|:\-]+\|$/.test(line.trim());
}

function parseTableCells(line: string): string[] {
  return line.trim().slice(1, -1).split('|').map((c) => c.trim());
}

// Markdown prose renderer: handles bold, markdown tables, and newlines
function renderProse(prose: string): React.ReactNode {
  const lines = prose.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Collect a contiguous markdown table block
    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      const headerRow = tableLines[0];
      const bodyRows = tableLines.filter((l) => !isSeparatorRow(l)).slice(1);
      const headers = parseTableCells(headerRow);
      nodes.push(
        <div key={`table-${i}`} className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 my-2">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                {headers.map((h, hi) => (
                  <th
                    key={hi}
                    className="px-3 py-1.5 text-left font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 dark:border-slate-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/40'}>
                  {parseTableCells(row).map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">
                      {renderInlineMarkdown(cell, `${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Regular text line
    const isLast = i === lines.length - 1;
    nodes.push(
      <React.Fragment key={i}>
        {renderInlineMarkdown(line, i)}
        {!isLast && <br />}
      </React.Fragment>,
    );
    i++;
  }

  return nodes;
}

const DiagnosticCard: React.FC<{ item: AiHistoryItem }> = memo(({ item }) => {
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  const toolConfig = item.response?.toolName
    ? TOOL_LABEL_MAP[item.response.toolName]
    : null;

  return (
    <div className="space-y-2.5">
      {/* User Prompt Bubble */}
      <div className="flex justify-end items-start gap-2 pl-8">
        <div className="bg-blue-600 text-white px-3.5 py-2 rounded-2xl rounded-tr-xs text-xs sm:text-sm font-medium shadow-xs max-w-full">
          {item.question}
        </div>
        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
        </div>
      </div>

      {/* AI Response Card */}
      <div className="flex items-start gap-2 pr-4">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>

        <div className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl rounded-tl-xs p-3.5 space-y-3 shadow-xs">
          {/* Loading State */}
          {item.isLoading && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-1">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              <span className="text-xs">Analyzing admissions records...</span>
            </div>
          )}

          {/* Error State */}
          {item.error && (
            <div className="flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Analysis Unavailable</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{item.error}</p>
              </div>
            </div>
          )}

          {/* Result Content */}
          {item.response && !item.isLoading && (
            <div className="space-y-3">
              {/* Tool Category Badge & Execution Time */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/40 pb-2">
                {toolConfig && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                      toolConfig.color,
                    )}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <span>{toolConfig.label}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{item.response.executionTimeMs}ms</span>
                </span>
              </div>

              {/* Prose Explanation */}
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {renderProse(item.response.prose)}
              </div>

              {/* Data Summary Context */}
              {item.response.sqlQuerySummary && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-200/60 dark:border-slate-700/40">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Context: </span>
                  {item.response.sqlQuerySummary}
                </div>
              )}

              {/* Supporting Data Table Toggle */}
              {item.response.supportingData && item.response.supportingData.length > 0 && (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => setIsDataExpanded(!isDataExpanded)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
                  >
                    <Table className="h-3 w-3" />
                    <span>
                      {isDataExpanded ? 'Hide' : 'View'} supporting metrics (
                      {item.response.supportingData.length} items)
                    </span>
                    {isDataExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  {isDataExpanded && (
                    <GroundedDataTable data={item.response.supportingData} maxRows={15} />
                  )}
                </div>
              )}
            </div>
          )}

          <div className="text-[10px] text-slate-400 text-right">
            {formatDateTime(item.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
});

DiagnosticCard.displayName = 'DiagnosticCard';

export interface AiDiagnosticPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
}

export const AiDiagnosticPanel: React.FC<AiDiagnosticPanelProps> = ({ isOpen, onClose, onToggle }) => {
  const { isAdmin } = useAuth();
  const { ask, history, clearHistory, isLoading } = useAiDiagnose();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const prompts = isAdmin ? SUGGESTED_AI_PROMPTS.ADMIN : SUGGESTED_AI_PROMPTS.AGENT;

  useEffect(() => {
    if (history.length > 0) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [history, isLoading, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;
    setInput('');
    await ask(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Floating Bottom-Right Chatbot Widget Trigger Button */}
      {!isOpen && (
        <button
          onClick={onToggle || onClose}
          className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 group"
          aria-label="Open AI Insights"
        >
          <div className="relative">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
          </div>
          <span className="hidden xs:inline">AI Insights</span>
        </button>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[480px] h-[580px] max-h-[calc(100vh-3rem)] z-50 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Admissions AI Assistant
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Live Analytics & Decision Support
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  title="Clear conversation"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                title="Minimize chat"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                title="Close chat"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation Stream Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.length === 0 && (
              <div className="space-y-4 py-2">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-center space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Instant Pipeline Intelligence</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ask questions regarding student funnel progression, stage bottlenecks, or partner agency performance.
                  </p>
                </div>

                {/* Suggested Prompts */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Lightbulb className="h-3 w-3" />
                    <span>Suggested Questions</span>
                  </div>
                  <div className="space-y-1.5">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt.tool}
                        onClick={() => {
                          setInput(prompt.prompt);
                          textareaRef.current?.focus();
                        }}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-800 transition text-xs group"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {prompt.title}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">
                          {prompt.prompt}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation History */}
            {history.map((item) => (
              <DiagnosticCard key={item.id} item={item} />
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
          >
            <div className="relative flex items-center">
              <textarea
                id="ai-prompt-input"
                name="aiPrompt"
                aria-label="Ask a diagnostic question to AI assistant"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question... (Enter to send)"
                disabled={isLoading}
                className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-3.5 pr-11 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-24 overflow-y-auto leading-normal"
                style={{ height: '42px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center transition shadow-xs shrink-0 active:scale-95"
                title="Send question"
                aria-label="Send question"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <div className="px-1 pt-1.5 text-[10px] text-slate-400 text-right">
              Enter to send · Shift+Enter for newline
            </div>
          </form>
        </div>
      )}
    </>
  );
};
