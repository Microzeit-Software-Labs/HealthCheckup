import { createContext, useCallback, useContext, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import clsx from 'clsx';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
};

const ICON_CLS = {
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error:   'text-red-500',
  info:    'text-blue-500',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', durationMs = 4_000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), durationMs);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast stack */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-72"
      >
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type] ?? Info;
          return (
            <div
              key={id}
              className="flex items-start gap-2.5 card p-3 shadow-card-hover animate-fade-in"
            >
              <Icon size={14} className={clsx('mt-0.5 shrink-0', ICON_CLS[type])} />
              <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 leading-snug">
                {message}
              </span>
              <button
                onClick={() => dismiss(id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
