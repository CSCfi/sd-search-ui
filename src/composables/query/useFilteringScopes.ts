import { useQuery } from '@tanstack/vue-query'
import { getFilteringScopes } from '@/services/api'

export function useFilteringScopes() {
  return useQuery({
    queryKey: ['filteringScopes'],
    queryFn: getFilteringScopes,
    staleTime: Infinity,
  })
}
