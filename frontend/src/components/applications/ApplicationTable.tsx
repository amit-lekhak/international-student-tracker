import React from 'react';
import {
  ApplicationFilterParams,
  PaginatedApplicationsResult,
} from '../../types/domain';
import { StageBadge, TierBadge } from '../ui/Badge';
import {
  formatDate,
  formatCurrency,
  calculateDwellDays,
  formatDwellBadge,
} from '../../lib/utils';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  Inbox,
} from 'lucide-react';
import { Pagination } from './Pagination';

export interface ApplicationTableProps {
  data?: PaginatedApplicationsResult;
  isLoading: boolean;
  filters: ApplicationFilterParams;
  onFilterChange: (updated: ApplicationFilterParams) => void;
  onSelectApplication: (id: string) => void;
}

export const ApplicationTable: React.FC<ApplicationTableProps> = ({
  data,
  isLoading,
  filters,
  onFilterChange,
  onSelectApplication,
}) => {
  const handleSort = (field: string) => {
    const isCurrent = filters.sortBy === field;
    const nextOrder = isCurrent && filters.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    onFilterChange({
      ...filters,
      sortBy: field,
      sortOrder: nextOrder,
      page: 1,
    });
  };

  const renderSortIcon = (field: string) => {
    if (filters.sortBy !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />;
    }
    return filters.sortOrder === 'ASC' ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 font-bold" />
    );
  };

  const applications = data?.items || [];
  const currentPage = data?.meta?.page ?? data?.page ?? 1;
  const totalPages = data?.meta?.totalPages ?? data?.totalPages ?? 1;
  const totalItems = data?.meta?.total ?? data?.total ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
      {/* Mobile Card List View (Visible on screens < md) */}
      <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading && applications.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-32" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-20" />
              </div>
              <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-48" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16" />
              </div>
            </div>
          ))
        ) : applications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                No applications found
              </p>
              <p className="text-xs text-slate-500">
                Try adjusting your search criteria or filters.
              </p>
            </div>
          </div>
        ) : (
          applications.map((app) => {
            const dwellDays = calculateDwellDays(app.stageEnteredDate);
            const dwellBadge = formatDwellBadge(dwellDays);

            return (
              <div
                key={app.id}
                onClick={() => onSelectApplication(app.id)}
                className="p-4 space-y-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:bg-slate-100 transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-slate-100">
                      <span className="truncate">{app.studentName}</span>
                      {app.notes && (
                        <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0 opacity-80" />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {app.program?.name || 'Assigned Program'} • {app.program?.school?.name || 'Institution'}
                    </div>
                  </div>
                  <StageBadge stage={app.stage} />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {app.agent?.tier && <TierBadge tier={app.agent.tier} />}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${dwellBadge.className}`}
                    >
                      {dwellBadge.isBottleneck ? (
                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      ) : (
                        <Clock className="h-2.5 w-2.5 shrink-0" />
                      )}
                      <span>{dwellDays}d</span>
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectApplication(app.id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition"
                  >
                    <Eye className="h-3 w-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table Container (Visible on md+) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th
                onClick={() => handleSort('studentName')}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Student Name</span>
                  {renderSortIcon('studentName')}
                </div>
              </th>
              <th className="py-3.5 px-4">Stage</th>
              <th className="py-3.5 px-4">Program & School</th>
              <th className="py-3.5 px-4">Partner Agency</th>
              <th className="py-3.5 px-4">Tuition</th>
              <th
                onClick={() => handleSort('stageEnteredDate')}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Stage Dwell Time</span>
                  {renderSortIcon('stageEnteredDate')}
                </div>
              </th>
              <th
                onClick={() => handleSort('createdDate')}
                className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Created</span>
                  {renderSortIcon('createdDate')}
                </div>
              </th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading && applications.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-20" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-36" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-xl w-14 ml-auto" />
                  </td>
                </tr>
              ))
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                        No applications found
                      </p>
                      <p className="text-xs text-slate-500">
                        Try adjusting your search criteria or resetting filters.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              applications.map((app) => {
                const dwellDays = calculateDwellDays(app.stageEnteredDate);
                const dwellBadge = formatDwellBadge(dwellDays);

                return (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app.id)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 group"
                  >
                    {/* Student Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{app.studentName}</span>
                        {app.notes && (
                          <span title="Has admissions notes">
                            <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0 opacity-70" />
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="py-3.5 px-4">
                      <StageBadge stage={app.stage} />
                    </td>

                    {/* Program & School */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {app.program?.name || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {app.program?.school?.name || '—'}
                      </div>
                    </td>

                    {/* Agent Agency & Tier */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {app.agent?.name || '—'}
                        </span>
                        {app.agent?.tier && <TierBadge tier={app.agent.tier} />}
                      </div>
                    </td>

                    {/* Tuition */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrency(app.program?.tuitionUsd)}
                    </td>

                    {/* Dwell Time */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${dwellBadge.className}`}
                      >
                        {dwellBadge.isBottleneck ? (
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                        ) : (
                          <Clock className="h-3 w-3 shrink-0" />
                        )}
                        <span>{dwellDays}d</span>
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDate(app.createdDate)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        limit={filters.limit || 15}
        onPageChange={(page) => onFilterChange({ ...filters, page })}
      />
    </div>
  );
};
