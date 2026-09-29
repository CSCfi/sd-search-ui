import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { useSearchStore } from '@/stores/searchStore'
import type { RelatedDataset } from '@/types/bigpicture'

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

function complement(id: string, overrides: Partial<RelatedDataset> = {}): RelatedDataset {
  return {
    datasetId: id,
    datasetTitle: `Title ${id}`,
    datasetDescription: `Description ${id}`,
    datasetUrl: null,
    relationType: 'complementary',
    resourceTypes: ['annotation'],
    ...overrides,
  }
}

function primaryResult(id: string, relatedDatasets: RelatedDataset[] | undefined = undefined) {
  return {
    datasetId: id,
    datasetTitle: `Primary ${id}`,
    datasetDescription: 'A primary dataset',
    datasetUrl: null,
    totalImageCount: 10,
    matchingImageCount: 5,
    imageIds: ['img-1'],
    ...(relatedDatasets !== undefined ? { relatedDatasets } : {}),
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

  beforeEach(() => {
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

  function commitSearch() {
    const store = useSearchStore()
    store.setFilter('sex', 'Female')
    store.commit()
    return store
  }

  it('toggle OFF: hides complementary rows even when the response carries them', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1', [complement('mock-a')])]))
    commitSearch()

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('.complement-row').exists()).toBe(false)
  })

  it('toggle ON: renders complementary rows filtered to relationType "complementary"', async () => {
    postQuery.mockResolvedValue(
      mockResponse([
        primaryResult('ds-1', [
          complement('mock-a'),
          complement('mock-b', { relationType: 'derived' }),
        ]),
      ]),
    )
    const store = commitSearch()
    store.setIncludeComplementary(true)
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    const rows = wrapper.findAll('.complement-row')
    expect(rows).toHaveLength(1)
    expect(wrapper.text()).toContain('Title mock-a')
    expect(wrapper.text()).not.toContain('Title mock-b')
  })

  it('complement checkbox is disabled until its primary is selected', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1', [complement('mock-a')])]))
    const store = commitSearch()
    store.setIncludeComplementary(true)
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    const complementCheckbox = wrapper.find('#select-ds-1-mock-a')
    expect(complementCheckbox.attributes('disabled')).toBeDefined()
    expect(complementCheckbox.attributes('aria-describedby')).toBe('complement-disabled-hint')

    await wrapper.find('#select-ds-1').setValue(true)

    expect(wrapper.find('#select-ds-1-mock-a').attributes('disabled')).toBeUndefined()
  })

  it('unchecking the primary clears its complements from the selection', async () => {
    postQuery.mockResolvedValue(mockResponse([primaryResult('ds-1', [complement('mock-a')])]))
    const store = commitSearch()
    store.setIncludeComplementary(true)
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-1-mock-a').setValue(true)
    expect(wrapper.find('.bulk-count').text()).toContain('2 selected')

    await wrapper.find('#select-ds-1').setValue(false)

    expect(wrapper.find('.bulk-action-bar').exists()).toBe(false)
  })

  it('a shared complement survives when another primary that owns it is still selected', async () => {
    postQuery.mockResolvedValue(
      mockResponse([
        primaryResult('ds-1', [complement('mock-shared')]),
        primaryResult('ds-2', [complement('mock-shared')]),
      ]),
    )
    const store = commitSearch()
    store.setIncludeComplementary(true)
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-2').setValue(true)
    await wrapper.find('#select-ds-1-mock-shared').setValue(true)

    // Deselect ds-1 only — ds-2 still selected and still owns mock-shared
    await wrapper.find('#select-ds-1').setValue(false)

    expect(wrapper.find('#select-ds-2-mock-shared').element).toBeTruthy()
    // Checked state is driven by the same shared id in the selection Set
    const sharedCheckboxUnderDs2 = wrapper.find('#select-ds-2-mock-shared')
    expect((sharedCheckboxUnderDs2.element as HTMLInputElement).checked).toBe(true)
  })

  it('the primary row REMS URL includes primary + its selected complements only (Q14)', async () => {
    postQuery.mockResolvedValue(
      mockResponse([primaryResult('ds-1', [complement('mock-a'), complement('mock-b')])]),
    )
    const store = commitSearch()
    store.setIncludeComplementary(true)
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-1-mock-a').setValue(true)
    // mock-b intentionally left unselected

    await wrapper.find('.btn-access').trigger('click')

    expect(buildRemsUrl).toHaveBeenCalledWith(['ds-1', 'mock-a'])
    expect(windowOpenSpy).toHaveBeenCalled()
  })

  it('bulk REMS URL contains each selected id once, even when shared across primaries', async () => {
    postQuery.mockResolvedValue(
      mockResponse([
        primaryResult('ds-1', [complement('mock-shared')]),
        primaryResult('ds-2', [complement('mock-shared')]),
      ]),
    )
    const store = commitSearch()
    store.setIncludeComplementary(true)
    store.commit()

    const wrapper = mountComponent()
    await flushPromises()

    await wrapper.find('#select-ds-1').setValue(true)
    await wrapper.find('#select-ds-2').setValue(true)
    await wrapper.find('#select-ds-1-mock-shared').setValue(true)

    await wrapper.find('.btn-bulk-access').trigger('click')

    const calledWith = buildRemsUrl.mock.calls.at(-1)?.[0] as string[]
    expect(calledWith.filter((id) => id === 'mock-shared')).toHaveLength(1)
    expect(calledWith).toEqual(expect.arrayContaining(['ds-1', 'ds-2', 'mock-shared']))
  })
})
