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

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, 'clinical', {})
  })

  it('queries with clinical scope when the committed tab is clinical', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])
    store.setDatasetType('clinical')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, 'clinical', {})
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

  it('passes committed qualifiers as bare values', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])
    store.setQualifier('observation', 'confirmed')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, 'clinical', {
      observation: 'confirmed',
    })
  })
})
