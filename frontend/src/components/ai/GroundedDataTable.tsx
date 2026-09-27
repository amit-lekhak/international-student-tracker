import React, { memo } from 'react';
import { humanizeKey } from '../../lib/utils';

export interface GroundedDataTableProps {
  data: Array<Record<string, any>> | string[] | any[];
  maxRows?: number;
}

function parseRow(item: any): Record<string, any> {
  if (!item) return {};
  if (typeof item === 'object') return item;
  if (typeof item === 'string') {
    try {
      const parsed = JSON.parse(item);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    } catch {
      return { value: item };
    }
    return { value: item };
  }
  return { value: item };
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    // Detect percentage columns by checking if 0-100
    if (Number.isFinite(value)) {
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
      return value.toLocaleString();
    }
  }
  if (typeof value === 'string') {
    // Check if numeric string
    const num = parseFloat(value);
    if (!isNaN(num) && String(num) === value.trim()) {
      return num % 1 !== 0 ? num.toFixed(2) : num.toLocaleString();
    }
    return value;
  }
  return String(value);
}

function detectColumnType(key: string, values: any[]): 'number' | 'percent' | 'text' | 'days' {
  const lk = key.toLowerCase();
  if (lk.includes('pct') || lk.includes('percent') || lk.includes('rate')) return 'percent';
  if (lk.includes('days') || lk.includes('dwell')) return 'days';
  const numerics = values.filter((v) => v !== null && v !== undefined && !isNaN(Number(v)));
  if (numerics.length > values.length / 2) return 'number';
  return 'text';
}

export const GroundedDataTable: React.FC<GroundedDataTableProps> = memo(({ data, maxRows = 50 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-2">No supporting data available.</div>
    );
  }

  const sliced = data.slice(0, maxRows).map(parseRow);
  if (sliced.length === 0 || !sliced[0] || Object.keys(sliced[0]).length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-2">No supporting data available.</div>
    );
  }
  const keys = Object.keys(sliced[0]);
  const columnTypes = Object.fromEntries(
    keys.map((k) => [k, detectColumnType(k, sliced.map((r) => r[k]))]),
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
            {keys.map((key) => (
              <th
                key={key}
                className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap"
              >
                {humanizeKey(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {sliced.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              {keys.map((key) => {
                const type = columnTypes[key];
                const rawValue = row[key];
                const display = formatCellValue(rawValue);
                const suffix = type === 'percent' ? '%' : type === 'days' ? 'd' : '';
                const isHighlight =
                  type === 'number' || type === 'percent' || type === 'days';

                return (
                  <td
                    key={key}
                    className={`px-3.5 py-2.5 whitespace-nowrap ${
                      isHighlight
                        ? 'font-semibold text-slate-800 dark:text-slate-200'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {display}
                    {suffix && rawValue !== null && rawValue !== undefined && (
                      <span className="text-slate-400 ml-0.5">{suffix}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > maxRows && (
        <div className="text-center text-[11px] text-slate-400 py-2 border-t border-slate-100 dark:border-slate-800">
          Showing {maxRows} of {data.length} rows
        </div>
      )}
    </div>
  );
});

GroundedDataTable.displayName = 'GroundedDataTable';
