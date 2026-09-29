import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { BeaconResultSetsResponse } from '@/types/beacon.ts'
import type { BigPictureDatasetResult, RelatedDataset } from '@/types/bigpicture.ts'
import { postQuery } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore.ts'
import { storeToRefs } from 'pinia'

function getMockRelatedDatasets(): RelatedDataset[] {
  return [
    {
      datasetId: 'mock-related-annotation',
      datasetTitle: 'Mock annotation dataset',
      datasetDescription: 'Mock complementary annotation data generated for local development.',
      datasetUrl: null,
      relationType: 'complementary',
      resourceTypes: ['annotation'],
    },
    {
      datasetId: 'mock-related-observation',
      datasetTitle: 'Mock observation dataset',
      datasetDescription: 'Mock complementary observation data generated for local development.',
      datasetUrl: null,
      relationType: 'complementary',
      resourceTypes: ['observation'],
    },
    {
      datasetId: 'mock-related-image',
      datasetTitle: 'Mock image dataset',
      datasetDescription:
        'Mock complementary dataset containing image entities for local development.',
      datasetUrl: null,
      relationType: 'complementary',
      resourceTypes: ['image'],
    },
  ]
}

export function useClinicalSearch() {
  const store = useSearchStore()
  const { committedFilters, committedDatasetType, committedIncludeComplementary } =
    storeToRefs(store)

  return useQuery<BeaconResultSetsResponse>({
    queryKey: ['search', 'clinical', committedFilters, committedIncludeComplementary],
    queryFn: () =>
      postQuery(committedFilters.value, 'clinical', committedIncludeComplementary.value),
    enabled: computed(
      () =>
        store.hasCommittedFilters &&
        (committedDatasetType.value === 'all' || committedDatasetType.value === 'clinical'),
    ),
    select: (data) => {
      if (!committedIncludeComplementary.value) return data
      return {
        ...data,
        response: {
          resultSet: data.response.resultSet.map((resultSet) => ({
            ...resultSet,
            results: (resultSet.results as BigPictureDatasetResult[]).map((result) => ({
              ...result,
              relatedDatasets: getMockRelatedDatasets(),
            })),
          })),
        },
      }
    },
  })
}
