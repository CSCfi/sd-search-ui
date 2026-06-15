import { useQuery } from '@tanstack/vue-query'
import { getFieldValues } from '@/services/api'

export function useFieldValues(fieldId: string) {
  return useQuery({
    queryKey: ['values', fieldId],
    queryFn: () => getFieldValues(fieldId),
    staleTime: 4 * 60 * 60 * 1000,
  })
}
