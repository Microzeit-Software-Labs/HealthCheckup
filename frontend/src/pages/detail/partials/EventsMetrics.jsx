function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">{value}</div>
    </div>
  );
}

export default function EventsMetrics({ details }) {
  const { total_events, latest_event_time, page_sample_size } = details;

  return (
    <div className="grid grid-cols-3 gap-6">
      <Stat label="Total Events"  value={total_events?.toLocaleString() ?? '—'} />
      <Stat label="Latest Event"  value={latest_event_time ?? '—'} />
      <Stat label="Sample Size"   value={page_sample_size  ?? '—'} />
    </div>
  );
}
