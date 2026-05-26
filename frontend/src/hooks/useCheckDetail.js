import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const REFRESH_MS = 30_000;

/**
 * Fetches a single health check for the detail page.
 *
 * Returns: { result, loading, refreshing, error, refresh }
 */
export function useCheckDetail(server, checkName, layer) {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['check', server?.id, checkName],

    queryFn: ({ signal }) =>
      layer === 'ssh'
        ? api.runSSHCheck(server, checkName, signal)
        : api.runAPICheck(server, checkName, signal),

    enabled:         !!server,
    refetchInterval: REFRESH_MS,
    retry:           1,
  });

  return {
    result:     data ?? null,
    loading:    isLoading,
    refreshing: isFetching && !isLoading,
    error:      error?.message ?? null,
    refresh:    refetch,
  };
}
