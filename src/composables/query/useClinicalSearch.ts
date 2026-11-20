import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { BeaconResultSetsResponse } from '@/types/beacon.ts'
import { postQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'
import { useActiveScope } from '@/composables/ui/useActiveScope'

export function useClinicalSearch() {
  const store = useSearchStore()
  const { committedFilters, committedIncludeComplementary } = storeToRefs(store)
  const { committedScope } = useActiveScope()

  return useQuery<BeaconResultSetsResponse>({
    queryKey: ['search', 'clinical', committedFilters, committedIncludeComplementary],
    queryFn: () =>
      postQuery(committedFilters.value, 'clinical', committedIncludeComplementary.value),
    enabled: computed(
      () =>
        store.hasCommittedFilters &&
        (committedScope.value === 'all' || committedScope.value === 'clinical'),
    ),
  })
}
