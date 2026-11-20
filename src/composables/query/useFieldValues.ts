import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getFieldValues } from '@/services/api'
import { useActiveScope } from '@/composables/ui/useActiveScope'

export function useFieldValues(fieldId: string) {
  const { queryScopeFor } = useActiveScope()

  return useQuery({
    queryKey: computed(() => ['values', fieldId, queryScopeFor(fieldId)] as const),
    queryFn: () => getFieldValues(fieldId, queryScopeFor(fieldId)),
    staleTime: 4 * 60 * 60 * 1000,
  })
}
