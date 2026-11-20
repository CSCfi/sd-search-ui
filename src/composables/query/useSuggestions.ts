import { computed } from 'vue'
import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getSuggestions } from '@/services/api'
import { useActiveScope } from '@/composables/ui/useActiveScope'

export function useSuggestions(fieldId: string, searchTerm: Ref<string>) {
  const { queryScopeFor } = useActiveScope()

  return useQuery({
    queryKey: computed(
      () => ['suggestions', fieldId, searchTerm.value.trim(), queryScopeFor(fieldId)] as const,
    ),
    queryFn: ({ signal }) =>
      getSuggestions(fieldId, searchTerm.value.trim(), signal, queryScopeFor(fieldId)),
    enabled: computed(() => searchTerm.value.trim().length > 1),
    staleTime: 5 * 60 * 1000,
  })
}
