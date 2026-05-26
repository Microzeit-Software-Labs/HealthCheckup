export function formatRelativeTime(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 10_000)    return 'Just now';
    if (diff < 60_000)    return `${Math.floor(diff / 1_000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
}

export function formatDateTime(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export function formatBytes(bytes) {
  if (bytes == null || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}
