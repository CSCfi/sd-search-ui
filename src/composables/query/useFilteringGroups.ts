import { useQuery } from '@tanstack/vue-query'
import { getFilteringGroups } from '@/services/api'

export function useFilteringGroups() {
  return useQuery({
    queryKey: ['filteringGroups'],
    queryFn: getFilteringGroups,
    staleTime: Infinity,
  })
}
