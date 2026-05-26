import clsx from 'clsx';
import { formatBytes } from '../../../utils/time';

export default function StorageMetrics({ details }) {
  const { usage_percent = 0, total_bytes, used_bytes, available_bytes, filesystems = [] } = details;

  const barColor =
    usage_percent >= 90 ? 'bg-red-500' :
    usage_percent >= 80 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="space-y-5">
      {/* Overall usage bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500 dark:text-slate-400">Overall Disk Usage</span>
          <span className={clsx(
            'font-semibold tabular-nums',
            usage_percent >= 90 ? 'text-red-500' :
            usage_percent >= 80 ? 'text-yellow-500' : 'text-slate-700 dark:text-slate-200',
          )}>
            {usage_percent}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(usage_percent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1.5 text-slate-400 dark:text-slate-500 tabular-nums">
          <span>{formatBytes(used_bytes)} used</span>
          <span>{formatBytes(available_bytes)} free</span>
          <span>{formatBytes(total_bytes)} total</span>
        </div>
      </div>

      {/* Per-filesystem table */}
      {filesystems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
            Filesystems
          </p>
          <div className="space-y-2">
            {filesystems.map((fs, i) => (
              <div key={i} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-xs">
                <span className="font-mono text-slate-500 dark:text-slate-400 truncate" title={fs.mount}>
                  {fs.mount}
                </span>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full',
                      fs.use_percent >= 90 ? 'bg-red-500' :
                      fs.use_percent >= 80 ? 'bg-yellow-500' : 'bg-blue-500',
                    )}
                    style={{ width: `${Math.min(fs.use_percent, 100)}%` }}
                  />
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-right tabular-nums">
                  {fs.use_percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
