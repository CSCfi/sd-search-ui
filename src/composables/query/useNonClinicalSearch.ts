import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { BeaconCountResponse } from '@/types/beacon.ts'
import { postNonClinicalQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'
import { useActiveScope } from '@/composables/ui/useActiveScope'

export function useNonClinicalSearch() {
  const store = useSearchStore()
  const { committedFilters } = storeToRefs(store)
  const { committedScope } = useActiveScope()

  return useQuery<BeaconCountResponse>({
    queryKey: ['search', 'non_clinical', committedFilters],
    queryFn: () => postNonClinicalQuery(committedFilters.value),
    enabled: computed(
      () =>
        store.hasCommittedFilters &&
        (committedScope.value === 'all' || committedScope.value === 'non_clinical'),
    ),
  })
}
