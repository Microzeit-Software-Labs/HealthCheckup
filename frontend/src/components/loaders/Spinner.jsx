import clsx from 'clsx';

const SIZES = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' };

export default function Spinner({ size = 'md', className }) {
  return (
    <svg
      className={clsx('animate-spin text-blue-500', SIZES[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle
        className="opacity-20"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="3"
      />
      <path
        className="opacity-80"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}
