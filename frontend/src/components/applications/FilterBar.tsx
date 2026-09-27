import React, { useState, useEffect } from 'react';
import { Search, Filter, RotateCcw, SlidersHorizontal, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { APPLICATION_STAGES } from '../../lib/constants';
import { ApplicationFilterParams, ApplicationStage, AgentTier } from '../../types/domain';
import { useDebounce } from '../../hooks/useDebounce';
import { useAgents, usePrograms } from '../../hooks/useLookups';
import { useAuth } from '../../context/AuthContext';

export interface FilterBarProps {
  filters: ApplicationFilterParams;
  onChange: (updated: ApplicationFilterParams) => void;
  totalCount?: number;
  isLoading?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  totalCount,
  isLoading = false,
}) => {
  const { isAdmin } = useAuth();
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);

  const { data: agents } = useAgents();
  const { data: programs } = usePrograms();

  useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      onChange({ ...filters, search: debouncedSearch || undefined, page: 1 });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stage = e.target.value as ApplicationStage | '';
    onChange({ ...filters, stage: stage ? stage : undefined, page: 1 });
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentId = e.target.value;
    onChange({ ...filters, agentId: agentId ? agentId : undefined, page: 1 });
  };

  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tier = e.target.value as AgentTier | '';
    onChange({ ...filters, tier: tier ? tier : undefined, page: 1 });
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const programId = e.target.value;
    onChange({ ...filters, programId: programId ? programId : undefined, page: 1 });
  };

  const handleReset = () => {
    setSearchInput('');
    onChange({
      page: 1,
      limit: filters.limit || 15,
      sortBy: 'stageEnteredDate',
      sortOrder: 'DESC',
    });
  };

  const activeFilterCount = [
    filters.search,
    filters.stage,
    filters.agentId,
    filters.tier,
    filters.programId,
  ].filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
      {/* Top Search & Filter Toggle Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div className="w-full md:w-80">
          <Input
            id="filter-search-input"
            name="search"
            aria-label="Search student or program"
            icon={<Search className="h-4 w-4" />}
            placeholder="Search student, program..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="flex items-center justify-between md:hidden gap-2">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
            <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            {isMobileFiltersOpen ? (
              <ChevronUp className="h-3.5 w-3.5 ml-auto" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-auto" />
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Desktop Filter Dropdowns (and Collapsible on Mobile) */}
        <div
          className={`${
            isMobileFiltersOpen ? 'flex' : 'hidden'
          } md:flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto`}
        >
          {/* Stage Filter */}
          <div className="w-full sm:w-40">
            <Select
              id="filter-stage-select"
              name="stage"
              aria-label="Filter applications by stage"
              value={filters.stage || ''}
              onChange={handleStageChange}
            >
              <option value="">All Stages</option>
              {APPLICATION_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          {/* Tier Filter */}
          <div className="w-full sm:w-32">
            <Select
              id="filter-tier-select"
              name="tier"
              aria-label="Filter applications by agent tier"
              value={filters.tier || ''}
              onChange={handleTierChange}
            >
              <option value="">All Tiers</option>
              <option value="Gold">Gold Tier</option>
              <option value="Silver">Silver Tier</option>
              <option value="Bronze">Bronze Tier</option>
            </Select>
          </div>

          {/* Program Filter */}
          <div className="w-full sm:w-44">
            <Select
              id="filter-program-select"
              name="programId"
              aria-label="Filter applications by program"
              value={filters.programId || ''}
              onChange={handleProgramChange}
            >
              <option value="">All Programs</option>
              {programs?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Agent Filter (Admin Only RBAC Gating) */}
          {isAdmin && (
            <div className="w-full sm:w-44">
              <Select
                id="filter-agent-select"
                name="agentId"
                aria-label="Filter applications by partner agency"
                value={filters.agentId || ''}
                onChange={handleAgentChange}
              >
                <option value="">All Agencies</option>
                {agents?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.tier})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Desktop Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Info Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
              <span className="text-slate-500">Updating applications...</span>
            </>
          ) : (
            <>
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {totalCount !== undefined
                  ? `${totalCount} application${totalCount === 1 ? '' : 's'} found`
                  : '0 applications found'}
              </span>
            </>
          )}
        </div>
        {activeFilterCount > 0 && (
          <span className="font-medium text-blue-600 dark:text-blue-400 text-[11px] sm:text-xs">
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </span>
        )}
      </div>
    </div>
  );
};
