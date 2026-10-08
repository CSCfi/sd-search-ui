import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import {
  getFieldValues,
  getFilteringScopes,
  getFilteringTerms,
  interpretFilters,
} from '@/services/api'
import { useAIFilterInput } from '@/composables/query/useAIFilterInput'
import { useSearchStore } from '@/stores/searchStore'
import type {
  AIInterpretation,
  BeaconFilteringScope,
  BeaconFilteringTermsResponse,
  FieldValue,
} from '@/types/beacon'

vi.mock('@/services/api', () => ({
  getFilteringTerms: vi.fn<() => Promise<BeaconFilteringTermsResponse>>(),
  getFilteringScopes: vi.fn<() => Promise<BeaconFilteringScope[]>>(),
  getFieldValues: vi.fn<(fieldId: string, scope?: string) => Promise<FieldValue[]>>(),
  interpretFilters: vi.fn<(query: string, signal: AbortSignal) => Promise<AIInterpretation>>(),
}))

const BOTH = ['clinical', 'non_clinical']

function term(id: string, type: string, scopes: string[], label = id) {
  return { id, type, label, description: '', scopes }
}

const TERMS = {
  meta: { apiVersion: '2.0', beaconId: 'test', returnedSchemas: [] },
  response: {
    filteringTerms: [
      term('sex', 'controlledValue', BOTH, 'Sex'),
      term('age_at_extraction', 'iso8601Range', BOTH, 'Age at extraction'),
      term('dataset_title', 'text', BOTH),
      term('diagnosis', 'ontology', ['clinical'], 'Diagnosis'),
      term('finding', 'ontology', ['non_clinical'], 'Finding'),
    ],
  },
} as BeaconFilteringTermsResponse

const SCOPES: BeaconFilteringScope[] = [
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
]

const DIAGNOSIS_VALUES: FieldValue[] = [{ value: 'Carcinoma', count: 3, concept_id: '68453008' }]

function aiFilter(id: string, value: string | string[]) {
  return { id, value, operator: '=' as const, includeDescendantTerms: false }
}

function respond(interpretation: string, filters: AIInterpretation['filters']) {
  vi.mocked(interpretFilters).mockResolvedValue({ interpretation, filters })
}

function setup() {
  let api!: ReturnType<typeof useAIFilterInput>
  const Host = defineComponent({
    setup() {
      api = useAIFilterInput()
      return () => null
    },
  })
  const wrapper = mount(Host, {
    global: { plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]] },
  })
  return { api, wrapper }
}

describe('useAIFilterInput', () => {
  let store: ReturnType<typeof useSearchStore>

  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    store = useSearchStore()
    vi.mocked(getFilteringTerms).mockResolvedValue(TERMS)
    vi.mocked(getFilteringScopes).mockResolvedValue(SCOPES)
    vi.mocked(getFieldValues).mockResolvedValue(DIAGNOSIS_VALUES)
  })

  it('writes the returned filters, commits once and reports success', async () => {
    respond('Male, age 18 to 30', [
      aiFilter('sex', 'Male'),
      aiFilter('age_at_extraction', 'P18Y-P30Y'),
    ])
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    expect(await api.submit('male, age 18 to 30')).toBe(true)

    expect(store.draftFilters.map((f) => [f.id, f.value])).toEqual([
      ['sex', 'Male'],
      ['age_at_extraction', 'P18Y-P30Y'],
    ])
    expect(commit).toHaveBeenCalledTimes(1)
    expect(store.committedFilters).toHaveLength(2)
    expect(api.state.value).toEqual({
      kind: 'success',
      interpretation: 'Male, age 18 to 30',
      removed: [],
    })
  })

  it('does not send the current filters or a scope with the request', async () => {
    respond('Male', [aiFilter('sex', 'Male')])
    const { api } = setup()
    await api.submit('male')
    expect(vi.mocked(interpretFilters).mock.calls[0]?.[0]).toBe('male')
  })

  it('replaces only the returned field and leaves other draft fields alone', async () => {
    store.setFilter('sex', 'Male')
    store.setFilter('age_at_extraction', 'P40Y-P50Y')
    respond('Female', [aiFilter('sex', 'Female')])
    const { api } = setup()

    await api.submit('female')

    expect(store.draftFilters.find((f) => f.id === 'sex')?.value).toBe('Female')
    expect(store.draftFilters.find((f) => f.id === 'age_at_extraction')?.value).toBe('P40Y-P50Y')
    expect(store.draftFilters).toHaveLength(2)
  })

  it('labels ontology concept ids and falls back to the id when not listed', async () => {
    respond('Carcinoma', [aiFilter('diagnosis', ['68453008', '111'])])
    const { api } = setup()
    await api.submit('carcinoma')
    const diagnosis = store.draftFilters.find((f) => f.id === 'diagnosis')
    expect(diagnosis).toMatchObject({
      value: ['68453008', '111'],
      label: ['Carcinoma', '111'],
      includeDescendantTerms: true,
    })
  })

  it('fetches ontology labels before writing anything', async () => {
    respond('Carcinoma', [aiFilter('diagnosis', ['68453008'])])
    const setFilter = vi.spyOn(store, 'setFilter')
    const { api } = setup()
    await api.submit('carcinoma')
    const fetchOrder = vi.mocked(getFieldValues).mock.invocationCallOrder[0]!
    const writeOrder = setFilter.mock.invocationCallOrder[0]!
    expect(fetchOrder).toBeLessThan(writeOrder)
  })

  it('applies nothing when a label lookup fails', async () => {
    store.setFilter('sex', 'Male')
    respond('Carcinoma', [aiFilter('sex', 'Female'), aiFilter('diagnosis', ['68453008'])])
    vi.mocked(getFieldValues).mockRejectedValue(new Error('boom'))
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    expect(await api.submit('female carcinoma')).toBe(false)

    expect(api.state.value).toEqual({ kind: 'error' })
    expect(store.draftFilters).toEqual([{ id: 'sex', value: 'Male', operator: '=' }])
    expect(commit).not.toHaveBeenCalled()
  })

  it('shows not understood and changes nothing for an empty filter list', async () => {
    respond('That is not a search.', [])
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    expect(await api.submit('hello')).toBe(false)

    expect(api.state.value).toEqual({
      kind: 'not-understood',
      interpretation: 'That is not a search.',
    })
    expect(store.draftFilters).toEqual([])
    expect(commit).not.toHaveBeenCalled()
  })

  it('drops fields hidden in fields.yaml and treats a response with only those as not understood', async () => {
    respond('Title lung', [aiFilter('dataset_title', 'lung')])
    const { api } = setup()
    expect(await api.submit('title lung')).toBe(false)
    expect(api.state.value.kind).toBe('not-understood')
    expect(store.draftFilters).toEqual([])
  })

  it('applies the visible fields when only some returned fields are hidden', async () => {
    respond('Male, title lung', [aiFilter('dataset_title', 'lung'), aiFilter('sex', 'Male')])
    const { api } = setup()
    expect(await api.submit('x')).toBe(true)
    expect(store.draftFilters.map((f) => f.id)).toEqual(['sex'])
  })

  it('errors and applies nothing when an age value cannot be shown', async () => {
    respond('Age', [aiFilter('sex', 'Male'), aiFilter('age_at_extraction', 'P60Y-P40Y')])
    const { api } = setup()
    expect(await api.submit('x')).toBe(false)
    expect(api.state.value).toEqual({ kind: 'error' })
    expect(store.draftFilters).toEqual([])
  })

  it('switches to the single scope of the returned fields before writing filters', async () => {
    store.setFilter('diagnosis', ['68453008'])
    respond('Finding', [aiFilter('finding', ['68453008'])])
    const switchScope = vi.spyOn(store, 'switchScope')
    const setFilter = vi.spyOn(store, 'setFilter')
    const { api } = setup()

    await api.submit('finding')

    expect(store.datasetType).toBe('non_clinical')
    expect(switchScope.mock.invocationCallOrder[0]).toBeLessThan(
      setFilter.mock.invocationCallOrder.at(-1)!,
    )
    expect(api.state.value).toEqual({
      kind: 'success',
      interpretation: 'Finding',
      switchedTo: 'Non-clinical',
      removed: ['Diagnosis'],
    })
    expect(store.committedDatasetType).toBe('non_clinical')
  })

  it('keeps the active tab when only shared fields are returned', async () => {
    store.setDatasetType('clinical')
    respond('Male', [aiFilter('sex', 'Male')])
    const { api } = setup()
    await api.submit('male')
    expect(store.datasetType).toBe('clinical')
  })

  it('changes nothing and reports a mixed scope for clinical-only plus non-clinical-only fields', async () => {
    respond('Both', [aiFilter('diagnosis', ['68453008']), aiFilter('finding', ['1'])])
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    expect(await api.submit('x')).toBe(false)

    expect(api.state.value).toEqual({ kind: 'mixed-scope' })
    expect(store.draftFilters).toEqual([])
    expect(store.datasetType).toBe('all')
    expect(commit).not.toHaveBeenCalled()
  })

  it('reports an error and changes nothing when the request fails', async () => {
    vi.mocked(interpretFilters).mockRejectedValue({ status: 503, title: 'Service error.' })
    const { api } = setup()
    expect(await api.submit('x')).toBe(false)
    expect(api.state.value).toEqual({ kind: 'error' })
    expect(store.draftFilters).toEqual([])
  })

  it('cancel aborts the request and leaves no message and no changes', async () => {
    let signal!: AbortSignal
    vi.mocked(interpretFilters).mockImplementation(
      (_query, s) =>
        new Promise((_resolve, reject) => {
          signal = s
          s.addEventListener('abort', () => reject({ status: 0, title: 'canceled' }))
        }),
    )
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    const pending = api.submit('male')
    await flushPromises()
    expect(api.state.value).toEqual({ kind: 'loading' })
    api.cancel()

    expect(await pending).toBe(false)
    expect(signal.aborted).toBe(true)
    expect(api.state.value).toEqual({ kind: 'idle' })
    expect(store.draftFilters).toEqual([])
    expect(commit).not.toHaveBeenCalled()
  })

  it('writes nothing when cancelled while labels are still loading', async () => {
    respond('Carcinoma', [aiFilter('diagnosis', ['68453008'])])
    let release!: (v: FieldValue[]) => void
    vi.mocked(getFieldValues).mockReturnValue(new Promise((r) => (release = r)))
    const { api } = setup()

    const pending = api.submit('carcinoma')
    await flushPromises()
    api.cancel()
    release(DIAGNOSIS_VALUES)

    expect(await pending).toBe(false)
    expect(store.draftFilters).toEqual([])
    expect(api.state.value).toEqual({ kind: 'idle' })
  })

  it('aborts the request when the component unmounts', async () => {
    let signal!: AbortSignal
    vi.mocked(interpretFilters).mockImplementation((_q, s) => {
      signal = s
      return new Promise(() => {})
    })
    const { api, wrapper } = setup()
    void api.submit('male')
    await flushPromises()
    wrapper.unmount()
    expect(signal.aborted).toBe(true)
  })

  it('allows one request at a time', async () => {
    vi.mocked(interpretFilters).mockReturnValue(new Promise(() => {}))
    const { api } = setup()
    void api.submit('a')
    await flushPromises()
    expect(await api.submit('b')).toBe(false)
    expect(interpretFilters).toHaveBeenCalledTimes(1)
  })

  it('keeps the message after its own writes but dismisses it on a manual filter change', async () => {
    respond('Male', [aiFilter('sex', 'Male')])
    const { api } = setup()
    await api.submit('male')
    expect(api.state.value.kind).toBe('success')

    store.setFilter('sex', 'Female')
    expect(api.state.value).toEqual({ kind: 'idle' })
  })

  it('dismisses the message on clear search, also when no filters were set', async () => {
    respond('Nope', [])
    const { api } = setup()
    await api.submit('hello')
    expect(api.state.value.kind).toBe('not-understood')

    store.clearFilters()
    expect(api.state.value).toEqual({ kind: 'idle' })
  })

  it('keeps the loading state when the form is edited while the request runs', async () => {
    vi.mocked(interpretFilters).mockReturnValue(new Promise(() => {}))
    const { api } = setup()
    void api.submit('x')
    await flushPromises()
    store.setFilter('sex', 'Male')
    expect(api.state.value).toEqual({ kind: 'loading' })
  })
})
