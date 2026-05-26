import Skeleton from '../loaders/Skeleton';

/** Placeholder matching exact CheckCard layout — shown while result is loading. */
export default function SkeletonCard() {
  return (
    <div className="card border-l-4 border-l-slate-200 dark:border-l-slate-700">
      <div className="p-4">
        {/* Header: label + badge */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Message lines */}
        <Skeleton className="h-3 w-full mb-1.5" />
        <Skeleton className="h-3 w-3/4 mb-3" />

        {/* Footer timestamp */}
        <Skeleton className="h-2.5 w-20" />
      </div>
    </div>
  );
}
