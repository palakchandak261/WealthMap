/** Rupee formatter — e.g. 42500 → "₹42,500" */
export const formatCurrency = (amount: number, currency = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Compact number — e.g. 42500 → "₹42.5K" */
export const formatCurrencyCompact = (amount: number): string => {
  if (Math.abs(amount) >= 100_000) {
    return `₹${(amount / 100_000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `₹${(amount / 1_000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
};

/** ISO date string → "22 Sep 2026" */
export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/** ISO date string → "22 Sep" */
export const formatDateShort = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short',
  });
};

/** Budget usage percentage → status string */
export const getBudgetStatus = (
  pct: number
): 'NORMAL' | 'WARNING' | 'CRITICAL_WARNING' | 'LIMIT_REACHED' | 'EXCEEDED' => {
  if (pct < 80)   return 'NORMAL';
  if (pct < 90)   return 'WARNING';
  if (pct < 100)  return 'CRITICAL_WARNING';
  if (pct === 100) return 'LIMIT_REACHED';
  return 'EXCEEDED';
};

/** Status → CSS class suffix for alert-bar */
export const budgetStatusToAlertClass = (status: string): string => {
  const map: Record<string, string> = {
    NORMAL:           'primary',
    WARNING:          'warning',
    CRITICAL_WARNING: 'danger',
    LIMIT_REACHED:    'danger',
    EXCEEDED:         'critical',
  };
  return map[status] ?? 'primary';
};

/** Risk level → CSS color variable name */
export const riskLevelColor = (level: string): string => {
  const map: Record<string, string> = {
    LOW:      'var(--success)',
    MODERATE: 'var(--warning)',
    HIGH:     'var(--danger)',
    CRITICAL: 'var(--critical)',
  };
  return map[level] ?? 'var(--text-muted)';
};

/** Percentage progress bar color */
export const progressColor = (pct: number): string => {
  if (pct < 60)  return 'var(--success)';
  if (pct < 80)  return 'var(--primary-500)';
  if (pct < 90)  return 'var(--warning)';
  return 'var(--danger)';
};

/** Clamp a number between min and max */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Get month name from number (1-12) */
export const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1] ?? 'Unknown';
};

/** Current month (1-12) */
export const currentMonth = (): number => new Date().getMonth() + 1;

/** Current year (4-digit) */
export const currentYear = (): number => new Date().getFullYear();

/** Days remaining in current month */
export const daysLeftInMonth = (): number => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate();
};
