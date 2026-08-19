import { computed } from 'vue'
import type { Ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { getSuggestions } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore'

export function useSuggestions(fieldId: string, searchTerm: Ref<string>) {
  const { datasetType, draftQualifiers } = storeToRefs(useSearchStore())

  const qualifiers = computed(() => {
    const value = { ...draftQualifiers.value }
    return Object.keys(value).length > 0 ? value : undefined
  })

  return useQuery({
    queryKey: computed(
      () =>
        [
          'suggestions',
          fieldId,
          searchTerm.value.trim(),
          datasetType.value,
          qualifiers.value,
        ] as const,
    ),
    queryFn: ({ signal }) =>
      getSuggestions(fieldId, searchTerm.value.trim(), signal, datasetType.value, qualifiers.value),
    enabled: computed(() => searchTerm.value.trim().length > 1),
    staleTime: 5 * 60 * 1000,
  })
}
