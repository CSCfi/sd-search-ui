import { useQuery } from '@tanstack/vue-query'
import type { BeaconResultSetsResponse } from '@/types/beacon.ts'
import { postQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'

export function useSearch() {
  const searchStore = useSearchStore()
  const { committedFilters, hasCommittedFilters } = storeToRefs(searchStore)

  return useQuery<BeaconResultSetsResponse>({
    queryKey: ['search', committedFilters],
    queryFn: () => postQuery(committedFilters.value),
    enabled: hasCommittedFilters,
  })
}
