import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { getFieldValues } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore'

export function useFieldValues(fieldId: string) {
  const { datasetType, draftQualifiers } = storeToRefs(useSearchStore())

  const qualifiers = computed(() => {
    const value = { ...draftQualifiers.value }
    return Object.keys(value).length > 0 ? value : undefined
  })

  return useQuery({
    queryKey: computed(() => ['values', fieldId, datasetType.value, qualifiers.value] as const),
    queryFn: () => getFieldValues(fieldId, datasetType.value, qualifiers.value),
    staleTime: 4 * 60 * 60 * 1000,
  })
}
