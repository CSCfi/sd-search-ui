import { useQuery } from '@tanstack/vue-query'
import { getFilteringTerms } from '@/services/api'
import { fieldsConfig } from '@/services/config'

export function useFilteringTerms() {
  return useQuery({
    queryKey: ['filteringTerms'],
    queryFn: getFilteringTerms,
    staleTime: Infinity,
    select: (data) =>
      data.response.filteringTerms.filter((f) => !fieldsConfig.hidden.includes(f.id)),
  })
}
