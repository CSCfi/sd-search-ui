import { useQuery } from '@tanstack/vue-query'
import { getFilteringTerms } from '@/services/api'

export function useFilteringTerms() {
  return useQuery({
    queryKey: ['filteringTerms'],
    queryFn: getFilteringTerms,
    staleTime: Infinity,
    select: (data) => data.response.filteringTerms.filter((f) => f.ui_display !== false),
  })
}
