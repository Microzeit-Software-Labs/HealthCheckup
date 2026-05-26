import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title   = 'Check failed',
  message,
  onRetry,
}) {
  // Truncate very long error strings so the UI doesn't overflow
  const display = message && message.length > 200
    ? message.slice(0, 197) + '…'
    : message;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
        <AlertTriangle size={18} className="text-red-500 dark:text-red-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
        {title}
      </h3>
      {display && (
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-4">
          {display}
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn-default gap-1.5">
          <RefreshCw size={11} />
          Retry
        </button>
      )}
    </div>
  );
}
