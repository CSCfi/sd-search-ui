import { useQuery } from '@tanstack/vue-query'
import type { BeaconResultSetsResponse } from '@/types/beacon.ts'
import { postQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'

export function useSearch() {
  const searchStore = useSearchStore()
  const { committedFilters, hasCommittedFilters, committedDatasetType, committedQualifiers } =
    storeToRefs(searchStore)

  return useQuery<BeaconResultSetsResponse>({
    queryKey: ['search', committedFilters, committedDatasetType, committedQualifiers],
    // 'all' is the frontend's "no scope" tab — the backend has no such scope, so the field is
    // omitted rather than sent.
    queryFn: () =>
      postQuery(
        committedFilters.value,
        committedDatasetType.value === 'all' ? undefined : committedDatasetType.value,
        committedQualifiers.value,
      ),
    enabled: hasCommittedFilters,
  })
}
