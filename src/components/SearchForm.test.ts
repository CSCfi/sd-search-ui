import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { useSearchStore, type DatasetType } from '@/stores/searchStore'
import type {
  BeaconFilteringGroup,
  BeaconFilteringQualifier,
  BeaconFilteringScope,
  BeaconFilteringTerm,
} from '@/types/beacon'

// Mirrors backend grouping: `animal_species` is in `subject` but only available in
// the non-clinical scope.
const TERMS: BeaconFilteringTerm[] = [
  {
    id: 'dataset_description',
    type: 'text',
    label: 'Dataset description',
    description: '',
    group: 'description',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'anatomical_site',
    type: 'ontology',
    label: 'Anatomical site',
    description: '',
    group: 'subject',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'staining_target',
    type: 'keyword',
    label: 'Staining target',
    description: '',
    group: 'staining',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'diagnosis',
    type: 'ontology',
    label: 'Diagnosis',
    description: '',
    group: 'clinical',
    scopes: ['clinical'],
  },
  {
    id: 'animal_species',
    type: 'ontology',
    label: 'Biological species',
    description: '',
    // Its backend group differs from its scope; panels must still render fields flat.
    group: 'subject',
    scopes: ['non_clinical'],
  },
  {
    id: 'finding',
    type: 'ontology',
    label: 'Finding',
    description: '',
    group: 'non_clinical',
    scopes: ['non_clinical'],
  },
  {
    id: 'finding_severity',
    type: 'ontology',
    label: 'Severity',
    description: '',
    group: 'non_clinical',
    scopes: ['non_clinical'],
  },
]

const GROUPS: BeaconFilteringGroup[] = [
  { id: 'description', label: 'Description' },
  { id: 'subject', label: 'Subject & specimen' },
  { id: 'staining', label: 'Staining' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'non_clinical', label: 'Non-clinical' },
]

const SCOPES: BeaconFilteringScope[] = [
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
]

const QUALIFIERS: BeaconFilteringQualifier[] = [
  {
    id: 'observation',
    label: 'Observation',
    description: 'How the finding or diagnosis is linked to the image.',
    values: ['confirmed', 'candidate'],
    groups: ['diagnosis', 'finding'],
  },
]

const FIELD_SCOPES = new Map<string, string[]>([
  ...TERMS.map((t) => [t.id, t.scopes] as [string, string[]]),
  // A non-rendered scoped field verifies that tab changes prune via the field-scope map
  ['hidden_scope_only', ['non_clinical']],
])

vi.mock('@/composables/useFilteringTerms', () => ({
  useFilteringTerms: () => ({
    data: ref(TERMS),
    isLoading: ref(false),
    isError: ref(false),
  }),
}))

vi.mock('@/composables/useFilteringGroups', () => ({
  useFilteringGroups: () => ({
    data: ref(GROUPS),
    isLoading: ref(false),
    isError: ref(false),
  }),
}))

vi.mock('@/composables/useFilteringScopes', () => ({
  useFilteringScopes: () => ({
    data: ref(SCOPES),
    isLoading: ref(false),
    isError: ref(false),
  }),
}))

vi.mock('@/composables/useFieldScopes', () => ({
  useFieldScopes: () => ({ data: ref(FIELD_SCOPES) }),
}))

// SearchForm requires this mock because this suite does not install VueQueryPlugin.
// Shared refs let the fail-open tests change metadata from pending to resolved after mount.
const filteringQualifiersData = ref<BeaconFilteringQualifier[] | undefined>(QUALIFIERS)
const filteringQualifiersIsError = ref(false)

vi.mock('@/composables/useFilteringQualifiers', () => ({
  useFilteringQualifiers: () => ({
    data: filteringQualifiersData,
    isError: filteringQualifiersIsError,
  }),
}))

const DynamicFieldStub = defineComponent({
  props: { field: { type: Object, required: true } },
  template: '<div class="field-stub" :data-field="field.id" />',
})

const SearchForm = (await import('@/components/SearchForm.vue')).default

// Use one Pinia instance so the test and mounted component share the same store.
let pinia: ReturnType<typeof createPinia>

function mountForm() {
  return mount(SearchForm, {
    global: {
      plugins: [pinia],
      directives: { control: {} },
      stubs: { DynamicField: DynamicFieldStub },
    },
  })
}

type Wrapper = ReturnType<typeof mountForm>

const fieldIds = (wrapper: Wrapper) =>
  wrapper.findAll('.field-stub').map((el) => el.attributes('data-field'))

const sharedFieldIds = (wrapper: Wrapper) =>
  wrapper
    .findAll('.field-stub')
    .filter((el) => el.element.closest('.filter-tab-group') === null)
    .map((el) => el.attributes('data-field'))

const groupLabels = (wrapper: Wrapper) =>
  wrapper.findAll('.group-label').map((el) => el.text().trim())

// Throws rather than returning undefined: a negative class assertion against a missing group
// would pass vacuously and hide a group that stopped rendering.
const groupByLabel = (wrapper: Wrapper, label: string) => {
  const group = wrapper
    .findAll('.group')
    .find((el) => el.find('.group-label').text().trim() === label)
  if (!group) throw new Error(`no group rendered with label "${label}"`)
  return group
}

// Panels are keyed by their scope class rather than by index, so a reordered scope list cannot
// make an assertion silently target the wrong panel.
const panel = (wrapper: Wrapper, scope: string) => {
  const pane = wrapper.find(`.filter-tab-panel--${scope}`)
  if (!pane.exists()) throw new Error(`no panel rendered for scope "${scope}"`)
  return pane
}

const panelFieldIds = (wrapper: Wrapper, scope: string) =>
  panel(wrapper, scope)
    .findAll('.field-stub')
    .map((el) => el.attributes('data-field'))

async function selectTab(wrapper: Wrapper, id: string) {
  await wrapper.find(`#tab-btn-${id}`).trigger('click')
}

describe('SearchForm — scope tabs', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('builds the tab strip from the fetched scopes, with All data first', () => {
    const wrapper = mountForm()
    expect(wrapper.findAll('[role="tab"]').map((t) => t.text())).toEqual([
      'All data',
      'Clinical',
      'Non-clinical',
    ])
  })

  it('renders fields shared by every scope above the tabs', () => {
    const wrapper = mountForm()
    expect(sharedFieldIds(wrapper)).toEqual([
      'dataset_description',
      'anatomical_site',
      'staining_target',
    ])
  })

  it('renders each scope-only field inside its own panel on the all tab', () => {
    const wrapper = mountForm()
    const ids = fieldIds(wrapper)
    expect(ids).toContain('diagnosis')
    expect(ids).toContain('finding')
    expect(ids).toContain('finding_severity')
  })

  it('does not render duplicate fields on any tab', async () => {
    const wrapper = mountForm()
    for (const tab of ['all', 'clinical', 'non_clinical']) {
      await selectTab(wrapper, tab)
      const ids = fieldIds(wrapper)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('shows only clinical fields on the clinical tab', async () => {
    const wrapper = mountForm()
    await selectTab(wrapper, 'clinical')
    const ids = fieldIds(wrapper)
    expect(ids).toContain('diagnosis')
    expect(ids).not.toContain('finding')
    expect(ids).not.toContain('finding_severity')
  })

  it('shows only non-clinical fields on the non_clinical tab', async () => {
    const wrapper = mountForm()
    await selectTab(wrapper, 'non_clinical')
    const ids = fieldIds(wrapper)
    expect(ids).toContain('finding')
    expect(ids).not.toContain('diagnosis')
  })

  it('renders scope panel fields flat, with no group heading of their own', () => {
    const wrapper = mountForm()
    expect(panel(wrapper, 'non_clinical').findAll('.group-label')).toHaveLength(0)
    expect(panel(wrapper, 'clinical').findAll('.group-label')).toHaveLength(0)
    expect(groupLabels(wrapper)).toEqual(['Description', 'Subject & specimen', 'Staining'])
  })

  it('orders panel fields by group, then by field', () => {
    const wrapper = mountForm()
    expect(panelFieldIds(wrapper, 'non_clinical')).toEqual([
      'animal_species',
      'finding',
      'finding_severity',
    ])
  })

  it('borders a group listed in fieldsConfig.bordered, above the tabs', () => {
    const wrapper = mountForm()
    expect(groupByLabel(wrapper, 'Staining').classes()).toContain('group--border')
  })

  it('does not border a group not listed in fieldsConfig.bordered', () => {
    const wrapper = mountForm()
    for (const label of ['Description', 'Subject & specimen']) {
      expect(groupByLabel(wrapper, label).classes()).not.toContain('group--border')
    }
  })

  it('borders a scope panel whose id is in fieldsConfig.bordered', () => {
    const wrapper = mountForm()
    expect(panel(wrapper, 'clinical').classes()).toContain('filter-tab-panel--border')
    expect(panel(wrapper, 'non_clinical').classes()).toContain('filter-tab-panel--border')
  })

  it('keys the panel border colour on the scope id', () => {
    const wrapper = mountForm()
    expect(panel(wrapper, 'non_clinical').classes()).toContain('filter-tab-panel--non_clinical')
    expect(panel(wrapper, 'clinical').classes()).not.toContain('filter-tab-panel--non_clinical')
  })

  it('resets a ?tab= value that matches no fetched scope', () => {
    const store = useSearchStore()
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }], 'garbage' as DatasetType)
    mountForm()
    expect(store.datasetType).toBe('all')
    expect(store.committedDatasetType).toBe('all')
  })
})

describe('SearchForm — qualifier selector', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  // The mocked ref is shared across every test in this file (see the mock above) — restore it
  // so a test that simulates an in-flight/failed fetch can't leak into the next test.
  afterEach(() => {
    filteringQualifiersData.value = QUALIFIERS
    filteringQualifiersIsError.value = false
  })

  it('renders the qualifier selector inside the tab group header, above the tab strip', () => {
    const wrapper = mountForm()
    const header = wrapper.find('.tab-header')
    expect(header.exists()).toBe(true)
    expect(header.find('.qualifier-selector').exists()).toBe(true)
  })

  it('resets a ?qualifiers= value naming an undeclared qualifier id, and announces it', () => {
    const store = useSearchStore()
    store.initFromUrl([], undefined, { nosuch: 'confirmed' })
    const wrapper = mountForm()
    expect(store.draftQualifiers).toEqual({})
    expect(store.committedQualifiers).toEqual({})
    expect(wrapper.find('[role="status"]').text()).toContain('not recognised')
  })

  it('resets a ?qualifiers= value naming an undeclared value for a real qualifier', () => {
    const store = useSearchStore()
    store.initFromUrl([], undefined, { observation: 'bogus' })
    mountForm()
    expect(store.draftQualifiers).toEqual({})
    expect(store.committedQualifiers).toEqual({})
  })

  it('keeps a valid ?qualifiers= value once the qualifier list resolves, and commits it', () => {
    const store = useSearchStore()
    store.initFromUrl([], undefined, { observation: 'confirmed' })
    mountForm()
    expect(store.draftQualifiers).toEqual({ observation: 'confirmed' })
    expect(store.committedQualifiers).toEqual({ observation: 'confirmed' })
  })

  it('does not commit a URL qualifier until the qualifier list resolves (fail-open)', async () => {
    filteringQualifiersData.value = undefined // simulate the request still being in flight

    const store = useSearchStore()
    store.initFromUrl([], undefined, { observation: 'confirmed' })
    mountForm()

    expect(store.draftQualifiers).toEqual({ observation: 'confirmed' })
    expect(store.committedQualifiers).toEqual({})

    filteringQualifiersData.value = QUALIFIERS
    await flushPromises()

    expect(store.committedQualifiers).toEqual({ observation: 'confirmed' })
  })

  it('drops a URL qualifier and announces it when /filtering_qualifiers fails outright', () => {
    filteringQualifiersData.value = undefined
    filteringQualifiersIsError.value = true

    const store = useSearchStore()
    store.initFromUrl([], undefined, { observation: 'confirmed' })
    const wrapper = mountForm()

    expect(store.draftQualifiers).toEqual({})
    expect(store.committedQualifiers).toEqual({})
    expect(wrapper.find('[role="status"]').text()).toContain('could not be checked')
  })
})

describe('SearchForm — copy filter URL', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('includes the qualifier alongside filters in the copied URL', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])
    store.setQualifier('observation', 'confirmed')

    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mountForm()
    await wrapper.find('.btn-copy').trigger('click')
    await flushPromises()

    const url = new URL(writeText.mock.calls[0]?.[0] as string)
    expect(url.searchParams.get('diagnosis')).toBe('64033007')
    expect(url.searchParams.get('qualifiers')).toBe('observation:confirmed')
  })

  it('omits the qualifiers param when no qualifier is selected', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])

    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mountForm()
    await wrapper.find('.btn-copy').trigger('click')
    await flushPromises()

    const url = new URL(writeText.mock.calls[0]?.[0] as string)
    expect(url.searchParams.has('qualifiers')).toBe(false)
  })
})

describe('SearchForm — pruning filters on tab switch', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('drops draft filters whose field is outside the new scope', async () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007'])
    store.setFilter('finding', ['12710003'])

    const wrapper = mountForm()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters.map((f) => f.id)).toEqual(['anatomical_site'])
  })

  it('drops a hidden out-of-scope field too', async () => {
    const store = useSearchStore()
    store.setFilter('hidden_scope_only', ['447612001'])

    const wrapper = mountForm()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters).toEqual([])
  })

  it('keeps filters for ids absent from the field-scope map', async () => {
    const store = useSearchStore()
    store.setFilter('unknown_field', 'x')

    const wrapper = mountForm()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters.map((f) => f.id)).toEqual(['unknown_field'])
  })

  it('drops nothing when switching to the all tab', async () => {
    const store = useSearchStore()
    store.setFilter('finding', ['12710003'])

    const wrapper = mountForm()
    await selectTab(wrapper, 'clinical')
    store.setFilter('finding', ['12710003'])
    await selectTab(wrapper, 'all')

    expect(store.draftFilters.map((f) => f.id)).toEqual(['finding'])
  })

  it('leaves committed filters untouched so the visible results still match', async () => {
    const store = useSearchStore()
    store.setFilter('finding', ['12710003'])
    store.commit()

    const wrapper = mountForm()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters).toEqual([])
    expect(store.committedFilters.map((f) => f.id)).toEqual(['finding'])
    expect(store.committedDatasetType).toBe('all')
  })

  it('announces the dropped filters by label', async () => {
    const store = useSearchStore()
    store.setFilter('finding', ['12710003'])

    const wrapper = mountForm()
    await selectTab(wrapper, 'clinical')

    const announcement = wrapper.find('[role="status"]').text()
    expect(announcement).toContain('1 filter removed')
    expect(announcement).toContain('Finding')
  })
})
