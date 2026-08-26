import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'

const getFilteringTerms = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@/services/api', () => ({
  getFilteringTerms: (...args: unknown[]) => getFilteringTerms(...args),
}))

const { default: ResultsBanner } = await import('./ResultsBanner.vue')

describe('ResultsBanner', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    getFilteringTerms.mockReset()
    getFilteringTerms.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedSchemas: [] },
      response: {
        filteringTerms: [{ id: 'sex', type: 'controlledValue', label: 'Sex', description: '' }],
      },
    })
  })

  function mountComponent() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return mount(ResultsBanner, {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    })
  }

  it('shows active filter tags with resolved labels', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Sex')
    expect(wrapper.text()).toContain('Female')
  })

  it('shows nothing before a search is committed', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.results-banner').exists()).toBe(false)
  })
})
