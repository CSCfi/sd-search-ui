import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'
import { pluralize } from '@/utils/pluralize'

const postQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const postNonClinicalQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getFilteringTerms = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@/services/api', () => ({
  postQuery: (...args: unknown[]) => postQuery(...args),
  postNonClinicalQuery: (...args: unknown[]) => postNonClinicalQuery(...args),
  getFilteringTerms: (...args: unknown[]) => getFilteringTerms(...args),
}))

const { default: ResultsBanner } = await import('./ResultsBanner.vue')

describe('ResultsBanner — result counts', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    postQuery.mockReset()
    postNonClinicalQuery.mockReset()
    getFilteringTerms.mockReset()
    getFilteringTerms.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedSchemas: [] },
      response: { filteringTerms: [] },
    })
    postQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'record' },
      responseSummary: { exists: true, numTotalResults: 12 },
      response: { resultSet: [] },
    })
    postNonClinicalQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'count' },
      responseSummary: { exists: true, numTotalResults: 340 },
    })
  })

  function mountComponent() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return mount(ResultsBanner, {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    })
  }

  it('shows both counts when the all tab is active', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain(pluralize(12, 'clinical dataset', 'clinical datasets'))
    expect(wrapper.text()).toContain(pluralize(340, 'non-clinical image', 'non-clinical images'))
  })

  it('shows only the clinical count when the clinical tab is active', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain(`${pluralize(12, 'dataset', 'datasets')} found`)
    expect(wrapper.text()).not.toContain('non-clinical')
  })

  it('shows only the non-clinical count when the non_clinical tab is active', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain(`${pluralize(340, 'image', 'images')} found`)
    expect(wrapper.text()).not.toContain('datasets found')
  })

  it('shows no count before a search is committed', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.result-count').exists()).toBe(false)
  })
})
