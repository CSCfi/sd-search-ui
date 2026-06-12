import { computed } from 'vue'
import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { fetchSuggestions } from '@/services/suggestionsApi'

export function useSuggestions(fieldId: string, searchTerm: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['suggestions', fieldId, searchTerm.value.trim()] as const),
    queryFn: ({ signal }) => fetchSuggestions(fieldId, searchTerm.value.trim(), signal),
    enabled: computed(() => searchTerm.value.trim().length > 1),
    staleTime: 5 * 60 * 1000,
  })
}
