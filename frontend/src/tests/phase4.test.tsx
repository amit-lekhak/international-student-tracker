import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// ─── ErrorBoundary ────────────────────────────────────────────────
describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Healthy Content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Healthy Content')).toBeInTheDocument();
  });

  it('renders fallback when a child throws', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const BrokenComponent = () => {
      throw new Error('Test crash');
    };

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Test crash/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('shows Try Again and Reload App buttons in fallback', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const BrokenComponent = () => {
      throw new Error('crash');
    };

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload app/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('resets state when Try Again is clicked', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    const BrokenComponent = () => {
      throw new Error('crash');
    };

    render(
      <ErrorBoundary onReset={onReset}>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onReset).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});

// ─── Badge utilities ──────────────────────────────────────────────
import { StageBadge, TierBadge, Badge } from '../components/ui/Badge';

describe('Badge components', () => {
  it('renders Badge with default variant', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders StageBadge for Lead stage', () => {
    render(<StageBadge stage="Lead" />);
    expect(screen.getByText('Lead')).toBeInTheDocument();
  });

  it('renders StageBadge for Enrolled stage', () => {
    render(<StageBadge stage="Enrolled" />);
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
  });

  it('renders TierBadge for Gold tier', () => {
    render(<TierBadge tier="Gold" />);
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('renders nothing for TierBadge with null tier', () => {
    const { container } = render(<TierBadge tier={null} />);
    expect(container.firstChild).toBeNull();
  });
});

// ─── Utility functions ────────────────────────────────────────────
import { formatDate, calculateDwellDays, formatDwellBadge, humanizeKey, cn } from '../lib/utils';

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-01-15T00:00:00.000Z');
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2024/);
  });

  it('returns em dash for null input', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em dash for undefined input', () => {
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('calculateDwellDays', () => {
  it('returns 0 for null input', () => {
    expect(calculateDwellDays(null)).toBe(0);
  });

  it('returns positive days for past date', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    expect(calculateDwellDays(pastDate.toISOString())).toBeGreaterThanOrEqual(9);
  });
});

describe('formatDwellBadge', () => {
  it('returns bottleneck for 30+ days', () => {
    const result = formatDwellBadge(35);
    expect(result.isBottleneck).toBe(true);
    expect(result.text).toContain('Bottleneck');
  });

  it('returns delayed label for 14-29 days', () => {
    const result = formatDwellBadge(20);
    expect(result.isBottleneck).toBe(false);
    expect(result.text).toContain('Delayed');
  });

  it('returns normal label for < 14 days', () => {
    const result = formatDwellBadge(5);
    expect(result.text).toContain('Normal');
  });
});

describe('humanizeKey', () => {
  it('converts snake_case to title case', () => {
    expect(humanizeKey('agent_name')).toBe('Agent name');
  });

  it('converts camelCase to spaced', () => {
    expect(humanizeKey('enrolledCount')).toContain('Enrolled');
  });
});

describe('cn (classnames merger)', () => {
  it('merges classes correctly', () => {
    const result = cn('px-4', 'py-2', 'bg-blue-500');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('handles conditional false correctly', () => {
    const result = cn('px-4', false && 'hidden');
    expect(result).not.toContain('hidden');
  });
});

// ─── GroundedDataTable ────────────────────────────────────────────
import { GroundedDataTable } from '../components/ai/GroundedDataTable';

describe('GroundedDataTable', () => {
  const testData = [
    { agentName: 'Global Edu', tier: 'Gold', enrolledCount: 42, conversionRatePct: 18.5 },
    { agentName: 'Pacific Path', tier: 'Silver', enrolledCount: 28, conversionRatePct: 12.1 },
  ];

  it('renders correct number of data rows', () => {
    render(<GroundedDataTable data={testData} />);
    expect(screen.getByText('Global Edu')).toBeInTheDocument();
    expect(screen.getByText('Pacific Path')).toBeInTheDocument();
  });

  it('humanizes column headers', () => {
    render(<GroundedDataTable data={testData} />);
    expect(screen.getByText(/Agent Name/i)).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<GroundedDataTable data={[]} />);
    expect(screen.getByText(/no supporting data/i)).toBeInTheDocument();
  });

  it('renders correct numeric values', () => {
    render(<GroundedDataTable data={testData} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

// ─── Pagination ───────────────────────────────────────────────────
import { Pagination } from '../components/applications/Pagination';

describe('Pagination', () => {
  it('renders page info correctly', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={75}
        limit={15}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByText(/Page 2 of 5/i)).toBeInTheDocument();
  });

  it('disables Previous on first page', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalItems={45}
        limit={15}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('disables Next on last page', () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={3}
        totalItems={45}
        limit={15}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('calls onPageChange with next page when Next clicked', () => {
    const handler = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalItems={45}
        limit={15}
        onPageChange={handler}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(handler).toHaveBeenCalledWith(2);
  });
});
