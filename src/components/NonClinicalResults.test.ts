import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'

const postNonClinicalQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getFilteringScopes = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue([
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
])

vi.mock('@/services/api', () => ({
  postNonClinicalQuery: (...args: unknown[]) => postNonClinicalQuery(...args),
  getFilteringScopes: (...args: unknown[]) => getFilteringScopes(...args),
}))

const { default: NonClinicalResults } = await import('./NonClinicalResults.vue')

describe('NonClinicalResults', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    postNonClinicalQuery.mockReset()
  })

  // retry: false — the isError tests below assert on the first rejection, not after
  // TanStack Query's default retry/backoff has run its course.
  function mountComponent() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return mount(NonClinicalResults, {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    })
  }

  it('renders nothing before a search is committed', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.non-clinical-results').exists()).toBe(false)
  })

  it('renders nothing when the committed tab is clinical only', async () => {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.non-clinical-results').exists()).toBe(false)
  })

  it('renders the matching image count once the query resolves', async () => {
    postNonClinicalQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'count' },
      responseSummary: { exists: true, numTotalResults: 42 },
    })

    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Matching non-clinical images')
    expect(wrapper.text()).toContain('42')
  })

  it('shows the empty state, not a zero count, when there are no matches', async () => {
    postNonClinicalQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'count' },
      responseSummary: { exists: false, numTotalResults: 0 },
    })

    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('No matching non-clinical images')
    expect(wrapper.find('.btn-apply-non-clinical').exists()).toBe(false)
  })

  it('never renders dataset identity fields, even if the mocked response carried them', async () => {
    postNonClinicalQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'count' },
      responseSummary: { exists: true, numTotalResults: 7 },
      // A backend regression could still attach these — the component must not read or
      // render them regardless of what shows up in the response payload.
      response: {
        resultSet: [
          {
            id: 'leaked-dataset-id',
            setType: 'dataset',
            exists: true,
            results: [
              {
                datasetId: 'leaked-dataset-id',
                datasetTitle: 'Leaked Title',
                datasetDescription: 'Leaked description',
                datasetUrl: 'https://example.com/leaked',
                totalImageCount: 7,
                matchingImageCount: 7,
                imageIds: ['img-1'],
              },
            ],
          },
        ],
      },
    })

    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).not.toContain('leaked-dataset-id')
    expect(wrapper.text()).not.toContain('Leaked Title')
    expect(wrapper.text()).not.toContain('Leaked description')
    expect(wrapper.html()).not.toContain('https://example.com/leaked')
  })

  it('shows a spinner instead of the count/button while loading', () => {
    postNonClinicalQuery.mockReturnValue(new Promise(() => {})) // never resolves

    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    const wrapper = mountComponent()

    expect(wrapper.find('.loading').exists()).toBe(true)
    expect(wrapper.find('.btn-apply-non-clinical').exists()).toBe(false)
  })

  it('shows an error banner instead of the count/button on error', async () => {
    postNonClinicalQuery.mockRejectedValue(new Error('network error'))

    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.find('.btn-apply-non-clinical').exists()).toBe(false)
  })

  it('shows the apply button once the count resolves with matches', async () => {
    postNonClinicalQuery.mockResolvedValue({
      meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'count' },
      responseSummary: { exists: true, numTotalResults: 42 },
    })

    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setDatasetType('non_clinical')
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.btn-apply-non-clinical').exists()).toBe(true)
    expect(wrapper.text()).toContain('Image access is subject to approval')
  })
})
