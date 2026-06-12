import { useQuery } from '@tanstack/vue-query'
import { fetchFieldValues } from '@/services/fieldValuesApi'

export function useFieldValues(fieldId: string) {
  return useQuery({
    queryKey: ['values', fieldId],
    queryFn: () => fetchFieldValues(fieldId),
    staleTime: 4 * 60 * 60 * 1000,
  })
}
