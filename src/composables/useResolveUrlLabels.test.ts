import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, useQueryClient } from '@tanstack/vue-query'
import { getFieldValues, getFilteringTerms } from '@/services/api'
import { useResolveUrlLabels } from '@/composables/useResolveUrlLabels'
import { useSearchStore } from '@/stores/searchStore'
import type { BeaconFilteringTermsResponse, BeaconQueryFilter, FieldValue } from '@/types/beacon'

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/vue-query')>()
  return { ...actual, useQueryClient: vi.fn<() => QueryClient>() }
})

vi.mock('@/services/api', () => ({
  getFilteringTerms: vi.fn<() => Promise<BeaconFilteringTermsResponse>>(),
  getFieldValues: vi.fn<() => Promise<FieldValue[]>>(),
}))

vi.mock('@/router', () => ({
  router: { replace: vi.fn<() => void>() },
}))

const MOCK_TERMS: BeaconFilteringTermsResponse = {
  meta: { apiVersion: '2.0', beaconId: 'test', returnedSchemas: [] },
  response: {
    filteringTerms: [
      {
        id: 'anatomical_site',
        type: 'ontology',
        label: 'Anatomical site',
        description: '',
        scopes: [],
      },
      {
        id: 'staining_procedure',
        type: 'ontologyOrValue',
        label: 'Staining',
        description: '',
        scopes: [],
      },
      { id: 'sex', type: 'keyword', label: 'Sex', description: '', scopes: [] },
    ],
  },
}

const ANATOMICAL_VALUES: FieldValue[] = [
  { value: 'Lung structure', count: 38, concept_id: '39607008' },
  { value: 'Breast structure', count: 42, concept_id: '80248007' },
]

const STAINING_VALUES: FieldValue[] = [
  { value: 'H&E staining technique', count: 20, concept_id: '12710003' },
]

type FetchQueryFn = (options: { queryKey: readonly unknown[] }) => Promise<unknown>

function filter(id: string, value: string | string[]): BeaconQueryFilter {
  return { id, value, operator: '=' }
}

describe('resolveLabelsFromUrl', () => {
  let mockFetchQuery: ReturnType<typeof vi.fn<FetchQueryFn>>
  let store: ReturnType<typeof useSearchStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useSearchStore()

    mockFetchQuery = vi.fn<FetchQueryFn>().mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'filteringTerms') return Promise.resolve(MOCK_TERMS)
      if (queryKey[0] === 'values' && queryKey[1] === 'anatomical_site')
        return Promise.resolve(ANATOMICAL_VALUES)
      if (queryKey[0] === 'values' && queryKey[1] === 'staining_procedure')
        return Promise.resolve(STAINING_VALUES)
      return Promise.resolve([])
    })

    vi.mocked(useQueryClient).mockReturnValue({
      fetchQuery: mockFetchQuery,
    } as unknown as QueryClient)
  })

  it('requests values for each ontology-backed filter id in the input', async () => {
    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl([
      filter('anatomical_site', '39607008'),
      filter('staining_procedure', '12710003'),
    ])

    const queriedKeys = mockFetchQuery.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] }).queryKey,
    )
    expect(queriedKeys).toContainEqual(['values', 'anatomical_site'])
    expect(queriedKeys).toContainEqual(['values', 'staining_procedure'])
  })

  it('does not fetch field values for keyword-type fields', async () => {
    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl([filter('sex', 'Female'), filter('anatomical_site', '39607008')])

    const queriedKeys = mockFetchQuery.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown[] }).queryKey,
    )
    expect(queriedKeys).not.toContainEqual(['values', 'sex'])
    expect(queriedKeys).toContainEqual(['values', 'anatomical_site'])
  })

  it('fires all field_id requests in parallel, not sequentially', async () => {
    let anatomicalStarted = false
    let stainingStarted = false
    const resolvers: Array<() => void> = []

    mockFetchQuery.mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
      if (queryKey[0] === 'filteringTerms') return Promise.resolve(MOCK_TERMS)
      if (queryKey[1] === 'anatomical_site') {
        anatomicalStarted = true
        return new Promise<FieldValue[]>((resolve) =>
          resolvers.push(() => resolve(ANATOMICAL_VALUES)),
        )
      }
      if (queryKey[1] === 'staining_procedure') {
        stainingStarted = true
        return new Promise<FieldValue[]>((resolve) =>
          resolvers.push(() => resolve(STAINING_VALUES)),
        )
      }
      return Promise.resolve([])
    })

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    const promise = resolveLabelsFromUrl([
      filter('anatomical_site', '39607008'),
      filter('staining_procedure', '12710003'),
    ])

    // Let filteringTerms resolve and composable advance to Promise.all
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    // Both fetches must have started before either resolved
    expect(anatomicalStarted).toBe(true)
    expect(stainingStarted).toBe(true)

    resolvers.forEach((r) => r())
    await promise
  })

  it('sets label on the matching filter when concept_id is found in the response', async () => {
    const filters = [filter('anatomical_site', '39607008')]
    store.initFromUrl(filters)

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)

    expect(store.draftFilters[0]?.label).toEqual(['Lung structure'])
  })

  it('sets label for each matching value in a multi-select filter', async () => {
    const filters = [filter('anatomical_site', ['39607008', '80248007'])]
    store.initFromUrl(filters)

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)

    expect(store.draftFilters[0]?.label).toEqual(['Lung structure', 'Breast structure'])
  })

  it('leaves label unset when concept_id has no match in the response', async () => {
    const filters = [filter('anatomical_site', '99999999')]
    store.initFromUrl(filters)

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)

    expect(store.draftFilters[0]?.label).toBeUndefined()
  })

  it('leaves label unset for ontologyOrValue filters using a free-text value', async () => {
    const filters = [filter('staining_procedure', 'H&E')]
    store.initFromUrl(filters)

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)

    expect(store.draftFilters[0]?.label).toBeUndefined()
  })

  it('updates both draftFilters and committedFilters after initFromUrl', async () => {
    const filters = [filter('anatomical_site', '39607008')]
    store.initFromUrl(filters)

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)

    expect(store.draftFilters[0]?.label).toEqual(['Lung structure'])
    expect(store.committedFilters[0]?.label).toEqual(['Lung structure'])
  })

  it('does not throw when the field values request fails', async () => {
    mockFetchQuery.mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
      if (queryKey[0] === 'filteringTerms') return Promise.resolve(MOCK_TERMS)
      return Promise.reject(new Error('Network error'))
    })

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await expect(
      resolveLabelsFromUrl([filter('anatomical_site', '39607008')]),
    ).resolves.toBeUndefined()
  })

  it('does not set any loading or error state when the request fails', async () => {
    const filters = [filter('anatomical_site', '39607008')]
    store.initFromUrl(filters)

    mockFetchQuery.mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
      if (queryKey[0] === 'filteringTerms') return Promise.resolve(MOCK_TERMS)
      return Promise.reject(new Error('Network error'))
    })

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)

    expect(store.draftFilters[0]?.label).toBeUndefined()
  })

  // Use a real QueryClient here so TanStack Query caching behavior is exercised for real.
  it('does not refetch a field_id already cached by a prior call with the same query key', async () => {
    const realQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(useQueryClient).mockReturnValue(realQueryClient)
    vi.mocked(getFilteringTerms).mockResolvedValue(MOCK_TERMS)
    vi.mocked(getFieldValues).mockResolvedValue(ANATOMICAL_VALUES)

    const filters = [filter('anatomical_site', '39607008')]
    store.initFromUrl(filters)

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)
    await resolveLabelsFromUrl(filters)

    expect(getFilteringTerms).toHaveBeenCalledTimes(1)
    expect(getFieldValues).toHaveBeenCalledTimes(1)

    realQueryClient.clear()
  })

  it('does not re-run when commit() is called after the initial page load', async () => {
    const filters = [filter('anatomical_site', '39607008')]
    store.initFromUrl(filters)

    const { resolveLabelsFromUrl } = useResolveUrlLabels()
    await resolveLabelsFromUrl(filters)

    mockFetchQuery.mockClear()
    store.commit()

    expect(mockFetchQuery).not.toHaveBeenCalled()
  })
})
