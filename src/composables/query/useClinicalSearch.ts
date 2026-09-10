import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { BeaconResultSetsResponse } from '@/types/beacon.ts'
import { postQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'

export function useClinicalSearch() {
  const store = useSearchStore()
  const { committedFilters, committedDatasetType } = storeToRefs(store)

  return useQuery<BeaconResultSetsResponse>({
    queryKey: ['search', 'clinical', committedFilters],
    queryFn: () => postQuery(committedFilters.value, 'clinical'),
    enabled: computed(
      () =>
        store.hasCommittedFilters &&
        (committedDatasetType.value === 'all' || committedDatasetType.value === 'clinical'),
    ),
  })
}
