import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'
import { fieldsConfig } from '@/services/config'

const postNonClinicalQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getFilteringTerms = vi.fn<() => Promise<unknown>>()
const getFilteringScopes = vi.fn<() => Promise<unknown>>()

vi.mock('@/services/api', () => ({
  getFilteringTerms: () => getFilteringTerms(),
  getFilteringScopes: () => getFilteringScopes(),
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
  const originalScopeTabs = fieldsConfig.scope_tabs

  afterEach(() => {
    fieldsConfig.scope_tabs = originalScopeTabs
  })

  beforeEach(() => {
    // These cases pick the scope with setDatasetType, which only counts with scope tabs on.
    fieldsConfig.scope_tabs = true
    pinia = createPinia()
    setActivePinia(pinia)
    getFilteringTerms.mockReset()
    getFilteringTerms.mockResolvedValue({ response: { filteringTerms: [] } })
    getFilteringScopes.mockReset()
    getFilteringScopes.mockResolvedValue([])
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

    expect(postNonClinicalQuery).toHaveBeenCalledWith(store.committedFilters)
  })

  it('queries when the committed tab is non_clinical', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).toHaveBeenCalledWith(store.committedFilters)
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
})

describe('useNonClinicalSearch — scope derived from filters (scope_tabs off)', () => {
  let pinia: ReturnType<typeof createPinia>
  const originalScopeTabs = fieldsConfig.scope_tabs

  const term = (id: string, scopes: string[]) => ({ id, scopes })

  beforeEach(() => {
    fieldsConfig.scope_tabs = false
    pinia = createPinia()
    setActivePinia(pinia)
    postNonClinicalQuery.mockReset()
    postNonClinicalQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'count' },
      responseSummary: { exists: false, numTotalResults: 0 },
    })
    getFilteringScopes.mockReset()
    getFilteringScopes.mockResolvedValue([
      { id: 'clinical', label: 'Clinical', description: '' },
      { id: 'non_clinical', label: 'Non-clinical', description: '' },
    ])
    getFilteringTerms.mockReset()
    getFilteringTerms.mockResolvedValue({
      response: {
        filteringTerms: [
          term('sex', ['clinical', 'non_clinical']),
          term('diagnosis', ['clinical']),
          term('finding', ['non_clinical']),
        ],
      },
    })
  })

  afterEach(() => {
    fieldsConfig.scope_tabs = originalScopeTabs
  })

  function commit(...ids: string[]) {
    const store = useSearchStore()
    for (const id of ids) store.setFilter(id, 'x')
    store.commit()
    return store
  }

  function mountHost() {
    return mount(Host, { global: { plugins: [pinia, VueQueryPlugin] } })
  }

  it('queries with only shared filters', async () => {
    commit('sex')
    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).toHaveBeenCalledTimes(1)
  })

  it('queries when a non-clinical-only filter is committed', async () => {
    commit('finding')
    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).toHaveBeenCalledTimes(1)
  })

  it('does not query when a clinical-only filter is committed', async () => {
    commit('diagnosis')
    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).not.toHaveBeenCalled()
  })

  it('does not query when committed filters mix both scopes', async () => {
    commit('diagnosis', 'finding')
    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).not.toHaveBeenCalled()
  })

  it('does not query while field scopes are still loading', async () => {
    getFilteringTerms.mockReturnValue(new Promise(() => {}))
    commit('sex')
    mountHost()
    await flushPromises()

    expect(postNonClinicalQuery).not.toHaveBeenCalled()
  })
})
