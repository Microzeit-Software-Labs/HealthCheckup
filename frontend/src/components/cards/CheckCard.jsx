import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { StatusBadge } from '../status/StatusBadge';
import { STATUS_CONFIG } from '../status/StatusBadge';
import { formatRelativeTime } from '../../utils/time';

export default function CheckCard({ checkName, label, icon: Icon, result, metric }) {
  const navigate  = useNavigate();
  const status    = result?.status  ?? 'unknown';
  const message   = result?.message ?? 'Pending first check…';
  const timestamp = result?.timestamp;
  const border    = STATUS_CONFIG[status]?.border ?? STATUS_CONFIG.unknown.border;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/${checkName}`)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/${checkName}`)}
      aria-label={`${label} — ${status}`}
      className={clsx(
        // Base card + left stripe
        'card border-l-4 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        // Hover: lift shadow + soften outer border
        'hover:shadow-card-hover hover:border-slate-300 dark:hover:border-slate-600',
        'transition-shadow transition-colors duration-150',
        border,
      )}
    >
      <div className="p-4">
        {/* Header row — label + badge */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && (
              <Icon
                size={13}
                className="shrink-0 text-slate-400 dark:text-slate-500 transition-colors"
              />
            )}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {label}
            </span>
          </div>
          <StatusBadge status={status} className="shrink-0" />
        </div>

        {/* Metric slot — optional prominent value (e.g. "72%", "2ms") */}
        {metric && (
          <div className="mb-2.5">
            <span className="text-xl font-semibold tabular-nums text-slate-800 dark:text-slate-100 leading-none">
              {metric.value}
            </span>
            {metric.unit && (
              <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                {metric.unit}
              </span>
            )}
            {metric.label && (
              <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {metric.label}
              </p>
            )}
          </div>
        )}

        {/* Message */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 mb-3">
          {message}
        </p>

        {/* Footer — timestamp */}
        <div className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
          {timestamp ? `Updated ${formatRelativeTime(timestamp)}` : 'Not checked yet'}
        </div>
      </div>
    </div>
  );
}
