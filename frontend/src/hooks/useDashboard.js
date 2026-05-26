import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const REFRESH_MS = 30_000; // auto-refresh every 30s

/**
 * Fetches all SSH + API health checks for a server in parallel.
 * React Query handles caching, dedup, and auto-refresh.
 *
 * Returns: { results: { [service_name]: HealthCheckResult }, loading, refreshing, error, refresh }
 */
export function useDashboard(server) {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['dashboard', server?.id],

    queryFn: async ({ signal }) => {
      // Fire both layers concurrently; partial failures still return partial results
      const [sshSettled, apiSettled] = await Promise.allSettled([
        api.runAllSSH(server, signal),
        api.runAllAPI(server, signal),
      ]);

      const map = {};

      if (sshSettled.status === 'fulfilled') {
        const arr = Array.isArray(sshSettled.value) ? sshSettled.value : [];
        arr.forEach((r) => { if (r?.service_name) map[r.service_name] = r; });
      }

      if (apiSettled.status === 'fulfilled') {
        const arr = Array.isArray(apiSettled.value) ? apiSettled.value : [];
        arr.forEach((r) => { if (r?.service_name) map[r.service_name] = r; });
      }

      // Surface a combined error only when BOTH layers failed
      if (sshSettled.status === 'rejected' && apiSettled.status === 'rejected') {
        throw sshSettled.reason;
      }

      return map;
    },

    enabled:         !!server,
    refetchInterval: REFRESH_MS,
    retry:           1,
  });

  return {
    results:    data ?? {},
    loading:    isLoading,
    refreshing: isFetching && !isLoading,
    error:      error?.message ?? null,
    refresh:    refetch,
  };
}
