import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { storeToRefs } from 'pinia'
import { getFieldValues } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore'

export function useFieldValues(fieldId: string) {
  const { datasetType } = storeToRefs(useSearchStore())

  return useQuery({
    queryKey: computed(() => ['values', fieldId, datasetType.value] as const),
    queryFn: () => getFieldValues(fieldId, datasetType.value),
    staleTime: 4 * 60 * 60 * 1000,
  })
}
