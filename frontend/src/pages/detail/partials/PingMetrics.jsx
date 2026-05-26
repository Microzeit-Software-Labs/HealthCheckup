import clsx from 'clsx';

function Stat({ label, value, highlight = false }) {
  return (
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className={clsx(
        'text-sm font-semibold tabular-nums',
        highlight
          ? 'text-yellow-600 dark:text-yellow-400'
          : 'text-slate-800 dark:text-slate-100',
      )}>
        {value}
      </div>
    </div>
  );
}

export default function PingMetrics({ details }) {
  const { target, latency_ms, packet_loss_pct, packets_transmitted, packets_received } = details;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
      <Stat label="Target"      value={target ?? '—'} />
      <Stat
        label="Avg Latency"
        value={latency_ms != null ? `${latency_ms.toFixed(2)} ms` : '—'}
      />
      <Stat
        label="Packet Loss"
        value={packet_loss_pct != null ? `${packet_loss_pct}%` : '—'}
        highlight={packet_loss_pct > 0}
      />
      <Stat
        label="Packets"
        value={
          packets_transmitted != null
            ? `${packets_received ?? 0} / ${packets_transmitted}`
            : '—'
        }
      />
    </div>
  );
}
