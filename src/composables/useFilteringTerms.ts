import { useQuery } from '@tanstack/vue-query'
import { fetchFilteringTerms } from '@/services/filteringTermsApi'

const HIDDEN_FIELD_IDS = new Set(['dataset_title'])

export function useFilteringTerms() {
  return useQuery({
    queryKey: ['filteringTerms'],
    queryFn: fetchFilteringTerms,
    staleTime: Infinity,
    select: (data) => ({
      ...data,
      response: {
        filteringTerms: data.response.filteringTerms.filter((f) => !HIDDEN_FIELD_IDS.has(f.id)),
      },
    }),
  })
}
