import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { useSearchStore, type DatasetType } from '@/stores/searchStore'
import type {
  BeaconFilteringGroup,
  BeaconFilteringScope,
  BeaconFilteringTerm,
} from '@/types/beacon'

// Mirrors the real backend: every field is either in both scopes or in exactly one, and the
// `ui_group` values are the backend's own — `animal_species` sits in `subject` even though it
// only exists in the non-clinical scope.
const TERMS: BeaconFilteringTerm[] = [
  {
    id: 'dataset_description',
    type: 'text',
    label: 'Dataset description',
    description: '',
    ui_group: 'description',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'anatomical_site',
    type: 'ontology',
    label: 'Anatomical site',
    description: '',
    ui_group: 'subject',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'staining_target',
    type: 'keyword',
    label: 'Staining target',
    description: '',
    ui_group: 'staining',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'diagnosis',
    type: 'ontology',
    label: 'Diagnosis',
    description: '',
    ui_group: 'clinical',
    scopes: ['clinical'],
  },
  {
    id: 'animal_species',
    type: 'ontology',
    label: 'Biological species',
    description: '',
    // Deliberately `subject`, not `non_clinical` — as in the backend. It must still render
    // flat in the non-clinical panel, with no "Subject & specimen" heading of its own.
    ui_group: 'subject',
    scopes: ['non_clinical'],
  },
  {
    id: 'finding',
    type: 'ontology',
    label: 'Finding',
    description: '',
    ui_group: 'non_clinical',
    scopes: ['non_clinical'],
  },
  {
    id: 'finding_severity',
    type: 'ontology',
    label: 'Severity',
    description: '',
    ui_group: 'non_clinical',
    scopes: ['non_clinical'],
  },
]

// Mirrors the backend: `clinical` / `non_clinical` are scope panels, and only some groups
// carry the `border` flag.
const GROUPS: BeaconFilteringGroup[] = [
  { id: 'description', label: 'Description', border: false },
  { id: 'subject', label: 'Subject & specimen', border: false },
  { id: 'staining', label: 'Staining', border: true },
  { id: 'clinical', label: 'Clinical', border: true },
  { id: 'non_clinical', label: 'Non-clinical', border: true },
]

const SCOPES: BeaconFilteringScope[] = [
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
]

const FIELD_SCOPES = new Map<string, string[]>([
  ...TERMS.map((t) => [t.id, t.scopes] as [string, string[]]),
  // Synthetic: a scope-only field that never reaches the visible term list, e.g. one with
  // `ui_display: false`. It must still be prunable on a tab switch. The backend has no such
  // field right now, so there is nothing real to borrow here.
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

// Stands in for DynamicField so the field id is assertable without mounting the real inputs.
const DynamicFieldStub = defineComponent({
  props: { field: { type: Object, required: true } },
  template: '<div class="field-stub" :data-field="field.id" />',
})

const SearchForm = (await import('@/components/SearchForm.vue')).default

// The active pinia, shared between the test's useSearchStore() and the mounted component —
// mounting with a fresh createPinia() would give the component a different store instance.
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
  const pane = wrapper.find(`.filter-tab-pane--${scope}`)
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
    // Only the shared groups above the tabs carry headings. `animal_species` sits in the
    // `subject` group, so a per-group render would repeat "Subject & specimen" in the panel.
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

  it('borders a group the backend flagged, above the tabs', () => {
    const wrapper = mountForm()
    expect(groupByLabel(wrapper, 'Staining').classes()).toContain('group--border')
  })

  it('does not border a group without the flag', () => {
    const wrapper = mountForm()
    for (const label of ['Description', 'Subject & specimen']) {
      expect(groupByLabel(wrapper, label).classes()).not.toContain('group--border')
    }
  })

  it('borders a scope panel whose group carries the flag', () => {
    const wrapper = mountForm()
    expect(panel(wrapper, 'clinical').classes()).toContain('filter-tab-pane--border')
    expect(panel(wrapper, 'non_clinical').classes()).toContain('filter-tab-pane--border')
  })

  it('keys the panel border colour on the scope id', () => {
    const wrapper = mountForm()
    // The accent class is per scope; clinical keeps the default border colour.
    expect(panel(wrapper, 'non_clinical').classes()).toContain('filter-tab-pane--non_clinical')
    expect(panel(wrapper, 'clinical').classes()).not.toContain('filter-tab-pane--non_clinical')
  })

  it('resets a ?tab= value that matches no fetched scope', () => {
    const store = useSearchStore()
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }], 'garbage' as DatasetType)
    mountForm()
    expect(store.datasetType).toBe('all')
    expect(store.committedDatasetType).toBe('all')
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
