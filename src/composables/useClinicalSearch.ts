import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { BeaconResultSetsResponse } from '@/types/beacon.ts'
import { postQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'

export function useClinicalSearch() {
  const store = useSearchStore()
  const { committedFilters, committedDatasetType, committedQualifiers } = storeToRefs(store)

  return useQuery<BeaconResultSetsResponse>({
    queryKey: ['search', 'clinical', committedFilters, committedQualifiers],
    queryFn: () => postQuery(committedFilters.value, 'clinical', committedQualifiers.value),
    enabled: computed(
      () =>
        store.hasCommittedFilters &&
        (committedDatasetType.value === 'all' || committedDatasetType.value === 'clinical'),
    ),
  })
}
