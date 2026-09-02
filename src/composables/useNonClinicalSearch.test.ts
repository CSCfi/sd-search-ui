import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'

const postNonClinicalQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@/services/api', () => ({
  postNonClinicalQuery: (...args: unknown[]) => postNonClinicalQuery(...args),
}))

const { useNonClinicalSearch } = await import('./useNonClinicalSearch')

const Host = defineComponent({
  setup() {
    useNonClinicalSearch()
    return () => null
  },
})

describe('useNonClinicalSearch', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    postNonClinicalQuery.mockReset()
    postNonClinicalQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'count' },
      responseSummary: { exists: false, numTotalResults: 0 },
    })
  })

  function mountHost() {
    return mount(Host, { global: { plugins: [pinia, VueQueryPlugin] } })
  }

  it('does not query at all before any filters are committed', async () => {
    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).not.toHaveBeenCalled()
  })

  it('queries when the committed tab is all', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).toHaveBeenCalledWith(store.committedFilters, {})
  })

  it('queries when the committed tab is non_clinical', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).toHaveBeenCalledWith(store.committedFilters, {})
  })

  it('does not query when the committed tab is clinical', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('clinical')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).not.toHaveBeenCalled()
  })

  it('uses the committed tab, not the draft one — a tab click alone does not refetch', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()
    expect(postNonClinicalQuery).toHaveBeenCalledTimes(1)

    store.setDatasetType('clinical')
    await flushPromises()

    expect(postNonClinicalQuery).toHaveBeenCalledTimes(1)
  })

  it('passes committed qualifiers as bare values', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])
    store.setQualifier('observation', 'confirmed')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).toHaveBeenCalledWith(store.committedFilters, {
      observation: 'confirmed',
    })
  })
})
