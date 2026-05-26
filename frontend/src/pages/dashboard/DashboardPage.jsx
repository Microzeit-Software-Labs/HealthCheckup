import {
  HardDrive, Activity, Zap, Network, Camera, Shield, Wifi, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { useServers } from '../../store/ServerContext';
import { useDashboard } from '../../hooks/useDashboard';
import CheckCard from '../../components/cards/CheckCard';
import SkeletonCard from '../../components/cards/SkeletonCard';
import EmptyState from '../../components/common/EmptyState';

// Icons aligned with CHECK_REGISTRY order in App.jsx
const ICONS = {
  storage:     HardDrive,
  events:      Activity,
  frs:         Zap,
  integration: Network,
  camera:      Camera,
  license:     Shield,
  ping:        Wifi,
};

const CHECKS = Object.keys(ICONS);

const STATUS_SUMMARY = {
  healthy:  { color: 'text-green-600  dark:text-green-400',  dot: 'bg-green-500'  },
  warning:  { color: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
  critical: { color: 'text-red-600    dark:text-red-400',    dot: 'bg-red-500'    },
};

export default function DashboardPage() {
  const { activeServer } = useServers();
  const { results, loading, refreshing, error, refresh } = useDashboard(activeServer);

  if (!activeServer) return <EmptyState />;

  // Status summary counts
  const counts = Object.values(results).reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const hasResults = Object.keys(results).length > 0;

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">{activeServer.name}</h1>
          <p className="page-subtitle font-mono">{activeServer.ip}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Status summary chips */}
          {hasResults && (
            <div className="hidden sm:flex items-center gap-3">
              {Object.entries(STATUS_SUMMARY).map(([status, { color, dot }]) =>
                counts[status] > 0 ? (
                  <span key={status} className={clsx('flex items-center gap-1.5 text-xs', color)}>
                    <span className={clsx('w-2 h-2 rounded-full', dot)} />
                    {counts[status]} {status}
                  </span>
                ) : null,
              )}
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading || refreshing}
            className="btn-default"
          >
            <RefreshCw
              size={11}
              className={clsx((loading || refreshing) && 'animate-spin')}
            />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Backend error banner ──────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Check grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CHECKS.map((name) => {
          const result = results[name];
          if (loading && !result) {
            return <SkeletonCard key={name} />;
          }
          return (
            <CheckCard
              key={name}
              checkName={name}
              label={name === 'frs' ? 'FRS Services' : name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' ')}
              icon={ICONS[name]}
              result={result}
            />
          );
        })}
      </div>

      {/* ── Auto-refresh hint ─────────────────────────────────────── */}
      {hasResults && (
        <p className="mt-6 text-xs text-slate-400 dark:text-slate-600">
          Auto-refreshes every 30 seconds.
        </p>
      )}
    </div>
  );
}
