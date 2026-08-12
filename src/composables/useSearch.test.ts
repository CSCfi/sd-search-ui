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

const { useSearch } = await import('./useSearch')

const Host = defineComponent({
  setup() {
    useSearch()
    return () => null
  },
})

describe('useSearch — requestedScope wiring', () => {
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

  it('passes undefined for the all scope — the backend has no such scope', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, undefined)
  })

  it('passes the committed scope id when one is committed', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])
    store.setDatasetType('clinical')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledWith(store.committedFilters, 'clinical')
  })

  it('does not query at all before any filters are committed', async () => {
    mountHost()
    await flushPromises()

    expect(postQuery).not.toHaveBeenCalled()
  })

  it('uses the committed scope, not the draft one — a tab click alone does not refetch', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()
    expect(postQuery).toHaveBeenCalledTimes(1)

    store.setDatasetType('clinical')
    await flushPromises()

    expect(postQuery).toHaveBeenCalledTimes(1)
    expect(postQuery).toHaveBeenLastCalledWith(store.committedFilters, undefined)
  })

  it('refetches with the new scope once the tab change is committed', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    mountHost()
    await flushPromises()

    store.setDatasetType('non_clinical')
    store.commit()
    await flushPromises()

    expect(postQuery).toHaveBeenCalledTimes(2)
    expect(postQuery).toHaveBeenLastCalledWith(store.committedFilters, 'non_clinical')
  })
})
