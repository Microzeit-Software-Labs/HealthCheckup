import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { useServers } from '../../store/ServerContext';
import { useCheckDetail } from '../../hooks/useCheckDetail';
import { StatusBadge } from '../../components/status/StatusBadge';
import Spinner from '../../components/loaders/Spinner';
import Skeleton from '../../components/loaders/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { formatDateTime } from '../../utils/time';

// Service-specific metric panels — lazy-imported to keep DetailPage small
import StorageMetrics     from './partials/StorageMetrics';
import PingMetrics        from './partials/PingMetrics';
import ServiceListMetrics from './partials/ServiceListMetrics';
import EventsMetrics      from './partials/EventsMetrics';

const METRICS = {
  storage:     StorageMetrics,
  ping:        PingMetrics,
  frs:         ServiceListMetrics,
  camera:      ServiceListMetrics,
  integration: null,           // no special metrics — raw JSON is sufficient
  license:     null,
  events:      EventsMetrics,
};

export default function DetailPage({ checkName, label, layer }) {
  const navigate = useNavigate();
  const { activeServer } = useServers();
  const { result, loading, refreshing, error, refresh } = useCheckDetail(activeServer, checkName, layer);
  const [logsOpen, setLogsOpen] = useState(false);

  if (!activeServer) return <EmptyState />;

  const MetricsPanel = METRICS[checkName] ?? null;

  return (
    <div className="max-w-2xl animate-fade-in">

      {/* ── Back nav ─────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500
                   hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-5"
      >
        <ArrowLeft size={12} />
        Dashboard
      </button>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="page-title">{label}</h1>
          <p className="page-subtitle font-mono">{activeServer.ip}</p>
        </div>

        <button
          onClick={refresh}
          disabled={loading || refreshing}
          className="btn-default"
        >
          {(loading || refreshing)
            ? <Spinner size="sm" />
            : <RefreshCw size={11} />
          }
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ── Result card ──────────────────────────────────────────── */}
      <div className="card overflow-hidden mb-4">

        {/* Loading skeleton */}
        {loading && !result && (
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-5 text-xs text-red-500">{error}</div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Status row */}
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-3 min-w-0">
                <StatusBadge status={result.status} />
                <span className="text-xs text-slate-700 dark:text-slate-200 truncate">
                  {result.message}
                </span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                {formatDateTime(result.timestamp)}
              </span>
            </div>

            {/* Service-specific metrics */}
            {MetricsPanel && result.details && Object.keys(result.details).length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
                <MetricsPanel details={result.details} />
              </div>
            )}

            {/* Expandable raw details / logs */}
            <div>
              <button
                onClick={() => setLogsOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-2.5
                           text-xs text-slate-500 dark:text-slate-400
                           hover:bg-slate-50 dark:hover:bg-slate-700/30
                           transition-colors"
              >
                <span className="font-medium">Raw Details</span>
                {logsOpen
                  ? <ChevronUp  size={12} />
                  : <ChevronDown size={12} />
                }
              </button>

              {logsOpen && (
                <div className="px-5 pb-5">
                  <pre className={clsx(
                    'log-line rounded p-3 overflow-x-auto whitespace-pre-wrap break-all',
                    'bg-slate-50 dark:bg-slate-900',
                  )}>
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {/* Not yet fetched */}
        {!loading && !error && !result && (
          <p className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500">
            No result yet. Click Refresh to run the check.
          </p>
        )}
      </div>

      {/* ── Metadata row ─────────────────────────────────────────── */}
      {result && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          <span>Server: <span className="text-slate-600 dark:text-slate-300 font-mono">{result.server}</span></span>
          <span>Layer:  <span className="text-slate-600 dark:text-slate-300">{result.check_type}</span></span>
          <span>Service:<span className="text-slate-600 dark:text-slate-300"> {result.service_name}</span></span>
        </div>
      )}
    </div>
  );
}
