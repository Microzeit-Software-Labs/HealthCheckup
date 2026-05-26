import clsx from 'clsx';

/** Single shimmer block. Compose for custom skeleton layouts. */
export default function Skeleton({ className }) {
  return <div className={clsx('rounded shimmer', className)} />;
}

/** One or more shimmer text lines. `lines` controls how many rows. */
export function SkeletonText({ lines = 1, className }) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={clsx(
            'h-3 rounded shimmer',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  );
}

/** Fixed-size shimmer block with optional aspect ratio. */
export function SkeletonBlock({ width, height, className }) {
  return (
    <div
      className={clsx('rounded shimmer shrink-0', className)}
      style={{ width, height }}
    />
  );
}
