import clsx from 'clsx';

// ─── Shared config — consumed by CheckCard, Sidebar, detail pages ─────────────
export const STATUS_CONFIG = {
  healthy: {
    label:    'Healthy',
    dot:      'bg-green-500',
    badge:    'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 ring-1 ring-inset ring-green-300/70 dark:ring-green-700/40',
    text:     'text-green-700 dark:text-green-400',
    border:   'border-l-green-500',
    pulse:    false,
  },
  warning: {
    label:    'Warning',
    dot:      'bg-yellow-500',
    badge:    'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-inset ring-yellow-300/70 dark:ring-yellow-700/40',
    text:     'text-yellow-700 dark:text-yellow-400',
    border:   'border-l-yellow-500',
    pulse:    false,
  },
  critical: {
    label:    'Critical',
    dot:      'bg-red-500',
    badge:    'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 ring-1 ring-inset ring-red-300/70 dark:ring-red-700/40',
    text:     'text-red-700 dark:text-red-400',
    border:   'border-l-red-500',
    pulse:    true,   // dot pulses to demand attention
  },
  unknown: {
    label:    'Unknown',
    dot:      'bg-slate-400 dark:bg-slate-500',
    badge:    'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 ring-1 ring-inset ring-slate-300/70 dark:ring-slate-600/40',
    text:     'text-slate-500 dark:text-slate-400',
    border:   'border-l-slate-300 dark:border-l-slate-600',
    pulse:    false,
  },
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────
/**
 * Colored status chip with indicator dot.
 *
 * @param {string}  status     - 'healthy' | 'warning' | 'critical' | 'unknown'
 * @param {'sm'|'md'} size     - 'sm' (default) is compact for cards; 'md' for detail headers
 * @param {string}  className  - extra classes
 */
export function StatusBadge({ status, size = 'sm', className }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        c.badge,
        className,
      )}
    >
      {/* Indicator dot — pulses on critical */}
      <span
        className={clsx(
          'rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          c.dot,
          c.pulse && 'animate-pulse',
        )}
        aria-hidden
      />
      {c.label}
    </span>
  );
}

// ─── StatusDot ────────────────────────────────────────────────────────────────
/**
 * Standalone dot — for sidebar indicators, compact tables.
 */
export function StatusDot({ status, size = 'sm', className }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return (
    <span
      className={clsx(
        'rounded-full inline-block shrink-0',
        size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5',
        c.dot,
        c.pulse && 'animate-pulse',
        className,
      )}
      aria-label={c.label}
      role="img"
    />
  );
}

// ─── StatusIcon ───────────────────────────────────────────────────────────────
/**
 * Large dot — used as the prominent indicator in page headers / alerts.
 */
export function StatusIcon({ status, className }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return (
    <span
      className={clsx(
        'w-3 h-3 rounded-full inline-block shrink-0',
        c.dot,
        c.pulse && 'animate-pulse',
        className,
      )}
      aria-label={c.label}
      role="img"
    />
  );
}

// ─── StatusText ───────────────────────────────────────────────────────────────
/**
 * Plain colored text label — no background, no border. For inline use.
 */
export function StatusText({ status, className, children }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return (
    <span className={clsx('text-xs font-medium', c.text, className)}>
      {children ?? c.label}
    </span>
  );
}
