import { useQuery } from '@tanstack/vue-query'
import { getFilteringQualifiers } from '@/services/api'

export function useFilteringQualifiers() {
  return useQuery({
    queryKey: ['filteringQualifiers'],
    queryFn: getFilteringQualifiers,
    staleTime: Infinity,
  })
}
