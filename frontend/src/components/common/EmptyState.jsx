import { Server } from 'lucide-react';

export default function EmptyState({
  title       = 'No server selected',
  description = 'Select a server from the sidebar, or add one with "Add Server".',
  icon: Icon  = Server,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center select-none">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Icon size={18} className="text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-default mt-4"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
