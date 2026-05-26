import clsx from 'clsx';

/**
 * Section header for grouping content blocks.
 *
 * @param {string}   title    - Primary heading text
 * @param {string}   subtitle - Optional secondary description
 * @param {ReactNode} action  - Optional right-side slot (button, badge, etc.)
 * @param {boolean}  divider  - Show bottom border (default false)
 * @param {string}   className
 */
export default function SectionHeader({ title, subtitle, action, divider = false, className }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-4',
        divider && 'border-b border-slate-200 dark:border-slate-700 pb-2.5',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="page-title truncate">{title}</h2>
        {subtitle && (
          <p className="page-subtitle truncate">{subtitle}</p>
        )}
      </div>
      {action && (
        <div className="shrink-0">{action}</div>
      )}
    </div>
  );
}
