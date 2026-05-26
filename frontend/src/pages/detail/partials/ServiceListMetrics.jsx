import clsx from 'clsx';

export default function ServiceListMetrics({ details }) {
  const { total_count = 0, failed_count = 0, services = [], error_logs = [], stream_errors = [] } = details;
  const running = total_count - failed_count;
  const logs = [...(error_logs), ...(stream_errors)].slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="flex gap-6 text-xs">
        <Stat label="Total"   value={total_count} />
        <Stat label="Running" value={running}      color="text-green-600 dark:text-green-400" />
        <Stat label="Failed"  value={failed_count} color={failed_count > 0 ? 'text-red-500' : undefined} />
      </div>

      {/* Service rows */}
      {services.length > 0 && (
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {services.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 text-xs"
            >
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate" title={s.name}>
                {s.name}
              </span>
              <span className={clsx('shrink-0 ml-3', s.failed ? 'text-red-500' : 'text-green-500')}>
                {s.failed ? '✗ failed' : '✓ running'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Error log lines */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Recent Errors</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {logs.map((line, i) => (
              <p key={i} className="log-line text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-slate-500 dark:text-slate-400 mb-0.5">{label}</div>
      <div className={clsx('font-semibold text-sm tabular-nums', color ?? 'text-slate-800 dark:text-slate-100')}>
        {value}
      </div>
    </div>
  );
}
