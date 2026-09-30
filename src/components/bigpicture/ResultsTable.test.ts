import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'
import { fieldsConfig } from '@/services/config'

const postQuery = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getFilteringScopes = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue([
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
])
const buildRemsUrl = vi.fn<(ids: string | string[]) => string>()

vi.mock('@/services/api', () => ({
  postQuery: (...args: unknown[]) => postQuery(...args),
  getFilteringScopes: (...args: unknown[]) => getFilteringScopes(...args),
}))

vi.mock('@/utils/rems', () => ({
  buildRemsUrl: (ids: string | string[]) => buildRemsUrl(ids),
}))

const { default: ResultsTable } = await import('./ResultsTable.vue')

const COMPLEMENTS = ['related-annotation', 'related-observation', 'related-image']
const RELATED_DATASETS = [
  ['annotation', 'Related annotation dataset'],
  ['observation', 'Related observation dataset'],
  ['image', 'Related image dataset'],
].map(([type, title]) => ({
  datasetId: `related-${type}`,
  datasetTitle: title,
  datasetDescription: null,
  datasetUrl: null,
  relationType: 'complementary',
  resourceTypes: [type],
}))

function primaryResult(id: string) {
  return {
    datasetId: id,
    datasetTitle: `Primary ${id}`,
    datasetDescription: 'A primary dataset',
    datasetUrl: null,
    totalImageCount: 10,
    matchingImageCount: 5,
    imageIds: ['img-1'],
    relatedDatasets: RELATED_DATASETS,
  }
}

function mockResponse(results: ReturnType<typeof primaryResult>[]) {
  return {
    meta: { apiVersion: 'v2.0', beaconId: 'test', returnedGranularity: 'record' },
    responseSummary: { exists: results.length > 0, numTotalResults: results.length },
    response: {
      resultSet: [{ id: 'set-1', setType: 'dataset', exists: true, results }],
    },
  }
}

describe('ResultsTable — complementary datasets', () => {
  let pinia: ReturnType<typeof createPinia>
  let windowOpenSpy: ReturnType<typeof vi.spyOn>
  const originalComplementary = fieldsConfig.complementary

  afterEach(() => {
    fieldsConfig.complementary = originalComplementary
  })

  beforeEach(() => {
    fieldsConfig.complementary = true
    pinia = createPinia()
    setActivePinia(pinia)
    postQuery.mockReset()
    buildRemsUrl.mockReset()
    buildRemsUrl.mockImplementation((ids: string | string[]) => {
      return Array.isArray(ids) ? `rems?resource=${ids.join('&resource=')}` : `rems?resource=${ids}`
    })
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  function mountComponent() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return mount(ResultsTable, {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    })
  }

  function commitSearch(includeComplementary = true) {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.setIncludeComplementary(includeComplementary)
    store.commit()
    return store
  }

  it('toggle OFF: hides complementary rows from results', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1')]))
    commitSearch(false)

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.complement-row').exists()).toBe(false)
  })

  it('toggle ON: renders a row for each complementary dataset', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1')]))
    commitSearch()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.findAll('.complement-row')).toHaveLength(COMPLEMENTS.length)
    expect(wrapper.text()).toContain('Related annotation dataset')
  })

  it('complement checkbox is disabled until its primary is selected', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1')]))
    commitSearch()

    const wrapper = mountComponent()
    await flushPromises()

    const complementCheckbox = wrapper.find('#select-ds-1-related-annotation')
    expect(complementCheckbox.attributes('disabled')).toBeDefined()
    expect(complementCheckbox.attributes('aria-describedby')).toBe('complement-disabled-hint')

    await wrapper.find('#select-ds-1').setValue(true)

    expect(wrapper.find('#select-ds-1-related-annotation').attributes('disabled')).toBeUndefined()
  })

  it('unchecking the primary clears its complements from the selection', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1')]))
    commitSearch()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-1-related-annotation').setValue(true)
    expect(wrapper.find('.bulk-count').text()).toContain('2 selected')

    await wrapper.find('#select-ds-1').setValue(false)

    expect(wrapper.find('.bulk-action-bar').exists()).toBe(false)
  })

  it('a shared complement survives when another primary that owns it is still selected', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1'), primaryResult('ds-2')]))
    commitSearch()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-2').setValue(true)
    await wrapper.find('#select-ds-1-related-annotation').setValue(true)

    // Deselect ds-1 only — ds-2 still selected and still owns the shared complement
    await wrapper.find('#select-ds-1').setValue(false)

    const sharedCheckboxUnderDs2 = wrapper.find('#select-ds-2-related-annotation')
    expect(sharedCheckboxUnderDs2.exists()).toBe(true)
    // Checked state is driven by the same shared id in the selection Set
    expect((sharedCheckboxUnderDs2.element as HTMLInputElement).checked).toBe(true)
  })

  it('the primary row REMS URL includes primary + its selected complements only', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1')]))
    commitSearch()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-1-related-annotation').setValue(true)
    // other complements intentionally left unselected

    await wrapper.find('.btn-access').trigger('click')

    expect(buildRemsUrl).toHaveBeenCalledWith(['ds-1', 'related-annotation'])
    expect(windowOpenSpy).toHaveBeenCalled()
  })

  it('bulk REMS URL contains each selected id once, even when shared across primaries', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1'), primaryResult('ds-2')]))
    commitSearch()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-2').setValue(true)
    await wrapper.find('#select-ds-1-related-annotation').setValue(true)

    await wrapper.find('.btn-bulk-access').trigger('click')

    const calledWith = buildRemsUrl.mock.calls.at(-1)?.[0] as string[]
    expect(calledWith.filter((id) => id === 'related-annotation')).toHaveLength(1)
    expect(calledWith).toEqual(expect.arrayContaining(['ds-1', 'ds-2', 'related-annotation']))
  })
})
