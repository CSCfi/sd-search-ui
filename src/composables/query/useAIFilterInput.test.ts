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
  BeaconQueryFilter,
  FieldValue,
} from '@/types/beacon'

vi.mock('@/services/api', () => ({
  getFilteringTerms: vi.fn<() => Promise<BeaconFilteringTermsResponse>>(),
  getFilteringScopes: vi.fn<() => Promise<BeaconFilteringScope[]>>(),
  getFieldValues: vi.fn<(fieldId: string, scope?: string) => Promise<FieldValue[]>>(),
  interpretFilters:
    vi.fn<
      (
        request: { query: string; filters: BeaconQueryFilter[] },
        signal: AbortSignal,
      ) => Promise<AIInterpretation>
    >(),
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

function respond(interpretation: string, filters: AIInterpretation['filters'], answerable = true) {
  vi.mocked(interpretFilters).mockResolvedValue({ interpretation, answerable, filters })
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
      aiFilter('age_at_extraction', ['P18Y-P30Y']),
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

  it('accepts list values for sex and age, as the backend sends them', async () => {
    respond('Males aged 20 to 60', [
      aiFilter('sex', ['Male']),
      aiFilter('age_at_extraction', ['P20Y-P60Y']),
    ])
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    expect(await api.submit('males aged 20 to 60')).toBe(true)

    expect(api.state.value.kind).toBe('success')
    expect(store.draftFilters.find((f) => f.id === 'age_at_extraction')?.value).toBe('P20Y-P60Y')
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('keeps accepting a plain string age', async () => {
    respond('Age 18 to 30', [aiFilter('age_at_extraction', 'P18Y-P30Y')])
    const { api } = setup()
    expect(await api.submit('age 18 to 30')).toBe(true)
    expect(store.draftFilters.find((f) => f.id === 'age_at_extraction')?.value).toBe('P18Y-P30Y')
  })

  it('errors and applies nothing when the age list holds two ranges', async () => {
    respond('Age', [aiFilter('age_at_extraction', ['P10Y-P20Y', 'P30Y-P40Y'])])
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()
    expect(await api.submit('x')).toBe(false)
    expect(api.state.value).toEqual({ kind: 'error' })
    expect(store.draftFilters).toEqual([])
    expect(commit).not.toHaveBeenCalled()
  })

  it('sends the instruction with the draft filters and no scope', async () => {
    store.setFilter('sex', 'Male')
    store.setDatasetType('clinical')
    respond('Male', [aiFilter('sex', 'Male')])
    const { api } = setup()
    await api.submit('male')
    const [request] = vi.mocked(interpretFilters).mock.calls[0]!
    expect(request).toEqual({
      query: 'male',
      filters: [{ id: 'sex', value: 'Male', operator: '=' }],
    })
  })

  it('sends an empty filter list when the form has no filters', async () => {
    respond('Male', [aiFilter('sex', 'Male')])
    const { api } = setup()
    await api.submit('male')
    expect(vi.mocked(interpretFilters).mock.calls[0]?.[0].filters).toEqual([])
  })

  it('replaces the whole draft: an absent field is cleared and a value is replaced', async () => {
    store.setFilter('sex', 'Male')
    store.setFilter('age_at_extraction', 'P40Y-P50Y')
    respond('Female', [aiFilter('sex', ['Female'])])
    const { api } = setup()

    expect(await api.submit('female, no age')).toBe(true)

    expect(store.draftFilters.map((f) => [f.id, f.value])).toEqual([['sex', ['Female']]])
    expect(store.committedFilters).toHaveLength(1)
  })

  it('keeps a hand-edited filter that the response returns unchanged', async () => {
    store.setFilter('age_at_extraction', 'P40Y-P50Y')
    respond('Male', [aiFilter('sex', 'Male'), aiFilter('age_at_extraction', 'P40Y-P50Y')])
    const { api } = setup()
    await api.submit('male')
    expect(store.draftFilters.find((f) => f.id === 'age_at_extraction')?.value).toBe('P40Y-P50Y')
    expect(store.draftFilters).toHaveLength(2)
  })

  it('clears the form and commits when answerable with an empty list', async () => {
    store.setFilter('sex', 'Male')
    store.commit()
    respond('Removed all filters', [])
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    expect(await api.submit('remove all filters')).toBe(true)

    expect(store.draftFilters).toEqual([])
    expect(store.committedFilters).toEqual([])
    expect(commit).toHaveBeenCalledTimes(1)
    expect(api.state.value.kind).toBe('success')
  })

  it('leaves draft filters not shown in the form alone', async () => {
    store.setFilter('dataset_title', 'lung')
    respond('Male', [aiFilter('sex', 'Male')])
    const { api } = setup()
    await api.submit('male')
    expect(store.draftFilters.map((f) => f.id)).toEqual(['dataset_title', 'sex'])
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

  it('takes labels from the draft for selected concept ids and fetches only for new ones', async () => {
    store.setFilter('diagnosis', ['68453008'], ['Carcinoma'], true)
    respond('More', [aiFilter('diagnosis', ['68453008'])])
    const { api } = setup()
    await api.submit('same')
    expect(getFieldValues).not.toHaveBeenCalled()
    expect(store.draftFilters.find((f) => f.id === 'diagnosis')?.label).toEqual(['Carcinoma'])

    respond('More', [aiFilter('diagnosis', ['68453008', '111'])])
    await api.submit('add one')
    expect(getFieldValues).toHaveBeenCalledTimes(1)
    expect(store.draftFilters.find((f) => f.id === 'diagnosis')?.label).toEqual([
      'Carcinoma',
      '111',
    ])
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

  it('shows not understood and changes nothing when the text is not answerable', async () => {
    store.setFilter('sex', 'Male')
    respond('That is not a search.', [aiFilter('sex', 'Male')], false)
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    expect(await api.submit('hello')).toBe(false)

    expect(api.state.value).toEqual({
      kind: 'not-understood',
      interpretation: 'That is not a search.',
    })
    expect(store.draftFilters).toEqual([{ id: 'sex', value: 'Male', operator: '=' }])
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

  it('derives the scope over the complete response, including unchanged filters', async () => {
    store.setFilter('diagnosis', ['68453008'])
    respond('Add finding', [aiFilter('diagnosis', ['68453008']), aiFilter('finding', ['1'])])
    const { api } = setup()

    expect(await api.submit('also finding')).toBe(false)

    expect(api.state.value).toEqual({ kind: 'mixed-scope' })
    expect(store.draftFilters).toEqual([{ id: 'diagnosis', value: ['68453008'], operator: '=' }])
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
    respond('Nope', [], false)
    const { api } = setup()
    await api.submit('hello')
    expect(api.state.value.kind).toBe('not-understood')

    store.clearFilters()
    expect(api.state.value).toEqual({ kind: 'idle' })
  })

  it.each([
    [
      'a filter change',
      (store: ReturnType<typeof useSearchStore>) => store.setFilter('sex', 'Male'),
    ],
    [
      'a tab switch',
      (store: ReturnType<typeof useSearchStore>) => store.setDatasetType('clinical'),
    ],
  ])('aborts silently and applies nothing on %s while loading', async (_name, change) => {
    let signal!: AbortSignal
    vi.mocked(interpretFilters).mockImplementation(
      (_request, s) =>
        new Promise((_resolve, reject) => {
          signal = s
          s.addEventListener('abort', () => reject({ status: 0, title: 'canceled' }))
        }),
    )
    const commit = vi.spyOn(store, 'commit')
    const { api } = setup()

    const pending = api.submit('x')
    await flushPromises()
    change(store)

    expect(await pending).toBe(false)
    expect(signal.aborted).toBe(true)
    expect(api.state.value).toEqual({ kind: 'idle' })
    expect(commit).not.toHaveBeenCalled()
    expect(store.draftFilters.length).toBeLessThanOrEqual(1)
  })

  it('does not abort itself with its own writes', async () => {
    respond('Male', [aiFilter('sex', 'Male')])
    const { api } = setup()
    expect(await api.submit('male')).toBe(true)
    expect(api.state.value.kind).toBe('success')
  })
})
