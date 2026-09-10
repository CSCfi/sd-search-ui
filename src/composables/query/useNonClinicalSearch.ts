import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { BeaconCountResponse } from '@/types/beacon.ts'
import { postNonClinicalQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'

export function useNonClinicalSearch() {
  const store = useSearchStore()
  const { committedFilters, committedDatasetType } = storeToRefs(store)

  return useQuery<BeaconCountResponse>({
    queryKey: ['search', 'non_clinical', committedFilters],
    queryFn: () => postNonClinicalQuery(committedFilters.value),
    enabled: computed(
      () =>
        store.hasCommittedFilters &&
        (committedDatasetType.value === 'all' || committedDatasetType.value === 'non_clinical'),
    ),
  })
}
