import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'

const postQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@/services/api', () => ({
  postQuery: (...args: unknown[]) => postQuery(...args),
}))

const { useClinicalSearch } = await import('./useClinicalSearch')

const Host = defineComponent({
  setup() {
    useClinicalSearch()
    return () => null
  },
})

const DataHost = defineComponent({
  setup() {
    const query = useClinicalSearch()
    return { query }
  },
  template: '<div />',
})

describe('useClinicalSearch', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    postQuery.mockReset()
    postQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'record' },
      responseSummary: { exists: false, numTotalResults: 0 },
      response: { resultSet: [] },
    })
  })

  function mountHost() {
    return mount(Host, { global: { plugins: [pinia, VueQueryPlugin] } })
  }

  function mountDataHost() {
    return mount(DataHost, { global: { plugins: [pinia, VueQueryPlugin] } })
  }

  it('does not query at all before any filters are committed', async () => {
    mountHost()
    await flushPromises()

    expect(postQuery).not.toHaveBeenCalled()
  })

  it('queries with clinical scope when the committed tab is all', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, 'clinical', false)
  })

  it('queries with clinical scope when the committed tab is clinical', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])
    store.setDatasetType('clinical')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, 'clinical', false)
  })

  it('does not query when the committed tab is non_clinical', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).not.toHaveBeenCalled()
  })

  it('uses the committed tab, not the draft one — a tab click alone does not refetch', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()
    expect(postQuery).toHaveBeenCalledTimes(1)

    store.setDatasetType('non_clinical')
    await flushPromises()

    expect(postQuery).toHaveBeenCalledTimes(1)
  })

  it('stops querying once the tab change to non_clinical is committed', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()
    expect(postQuery).toHaveBeenCalledTimes(1)

    store.setDatasetType('non_clinical')
    store.commit()
    await flushPromises()

    // enabled flips false — no second call fires for the clinical query
    expect(postQuery).toHaveBeenCalledTimes(1)
  })

  it('sends includeComplementary when the toggle is committed', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setIncludeComplementary(true)
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, 'clinical', true)
  })

  it('provides complementary datasets when the toggle is committed', async () => {
    postQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'record' },
      responseSummary: { exists: true, numTotalResults: 1 },
      response: {
        resultSet: [
          {
            id: 'set-1',
            setType: 'dataset',
            exists: true,
            results: [
              {
                datasetId: 'ds-1',
                datasetTitle: 'Dataset 1',
                datasetDescription: null,
                datasetUrl: null,
                totalImageCount: 5,
                matchingImageCount: 2,
                imageIds: ['img-1'],
                relatedDatasets: [
                  {
                    datasetId: 'api-related-dataset',
                    datasetTitle: 'API dataset',
                    datasetDescription: null,
                    datasetUrl: null,
                    relationType: 'complementary',
                    resourceTypes: ['annotation'],
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setIncludeComplementary(true)
    store.commit()

    const wrapper = mountDataHost()
    await flushPromises()

    const result = wrapper.vm.query.data.value?.response.resultSet[0]?.results[0] as {
      relatedDatasets?: { datasetId: string }[]
    }
    expect(result.relatedDatasets?.map((dataset) => dataset.datasetId)).toEqual([
      'mock-related-annotation',
      'mock-related-observation',
      'mock-related-image',
    ])
  })

  it('leaves the response unchanged when the toggle is off', async () => {
    const relatedDatasets = [
      {
        datasetId: 'api-related-dataset',
        datasetTitle: 'API dataset',
        datasetDescription: null,
        datasetUrl: null,
        relationType: 'complementary',
        resourceTypes: ['annotation'],
      },
    ]
    postQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'record' },
      responseSummary: { exists: true, numTotalResults: 1 },
      response: {
        resultSet: [
          {
            id: 'set-1',
            setType: 'dataset',
            exists: true,
            results: [
              {
                datasetId: 'ds-1',
                datasetTitle: 'Dataset 1',
                datasetDescription: null,
                datasetUrl: null,
                totalImageCount: 5,
                matchingImageCount: 2,
                imageIds: ['img-1'],
                relatedDatasets,
              },
            ],
          },
        ],
      },
    })
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    const wrapper = mountDataHost()
    await flushPromises()

    const result = wrapper.vm.query.data.value?.response.resultSet[0]?.results[0] as {
      relatedDatasets?: unknown
    }
    expect(result.relatedDatasets).toEqual(relatedDatasets)
  })

  it('changing the committed toggle refetches with the updated filter value', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()
    expect(postQuery).toHaveBeenCalledTimes(1)

    store.setIncludeComplementary(true)
    store.commit()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledTimes(2)
    expect(postQuery).toHaveBeenLastCalledWith(store.committedFilters, 'clinical', true)
  })
})
