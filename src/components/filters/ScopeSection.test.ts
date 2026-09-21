import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { useSearchStore, type DatasetType } from '@/stores/searchStore'
import type { BeaconFilteringScope, BeaconFilteringTerm } from '@/types/beacon'
import type { ResolvedGroup } from '@/types/config'

const TERMS: BeaconFilteringTerm[] = [
  {
    id: 'dataset_description',
    type: 'text',
    label: 'Dataset description',
    description: '',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'anatomical_site',
    type: 'ontology',
    label: 'Anatomical site',
    description: '',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'staining_target',
    type: 'keyword',
    label: 'Staining target',
    description: '',
    scopes: ['clinical', 'non_clinical'],
  },
  {
    id: 'diagnosis',
    type: 'ontology',
    label: 'Diagnosis',
    description: '',
    scopes: ['clinical'],
  },
  {
    id: 'animal_species',
    type: 'ontology',
    label: 'Biological species',
    description: '',
    scopes: ['non_clinical'],
  },
  {
    id: 'finding',
    type: 'ontology',
    label: 'Finding',
    description: '',
    scopes: ['non_clinical'],
  },
  {
    id: 'finding_severity',
    type: 'ontology',
    label: 'Severity',
    description: '',
    scopes: ['non_clinical'],
  },
]

const termById = (id: string) => TERMS.find((t) => t.id === id)!

// Resolved groups matching the real groups.yaml structure. Groups.yaml is the authority for
// field membership and render order. animal_species and finding are in non_clinical (not subject).
// finding_severity is in finding_details which has parent: non_clinical — renders as a subgroup.
const RESOLVED_GROUPS: ResolvedGroup[] = [
  { id: 'description', label: 'Description', fields: [termById('dataset_description')] },
  { id: 'subject', label: 'Subject & specimen', fields: [termById('anatomical_site')] },
  { id: 'staining', label: 'Staining', fields: [termById('staining_target')] },
  { id: 'clinical', label: 'Clinical', fields: [termById('diagnosis')] },
  {
    id: 'non_clinical',
    label: 'Non-clinical',
    fields: [termById('animal_species'), termById('finding')],
  },
  {
    id: 'finding_details',
    label: 'Finding details',
    parent: 'non_clinical',
    fields: [termById('finding_severity')],
  },
]

const SCOPES: BeaconFilteringScope[] = [
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
]

const FIELD_SCOPES = new Map<string, string[]>([
  ...TERMS.map((t) => [t.id, t.scopes] as [string, string[]]),
  // A non-rendered scoped field verifies that tab changes prune via the field-scope map
  ['hidden_scope_only', ['non_clinical']],
])

vi.mock('@/composables/query/useFilteringTerms', () => ({
  useFilteringTerms: () => ({
    data: ref(TERMS),
    isLoading: ref(false),
    isError: ref(false),
  }),
}))

vi.mock('@/composables/query/useResolvedGroups', () => ({
  useResolvedGroups: () => ({
    groups: computed(() => RESOLVED_GROUPS),
  }),
}))

vi.mock('@/composables/query/useFilteringScopes', () => ({
  useFilteringScopes: () => ({
    data: ref(SCOPES),
    isLoading: ref(false),
    isError: ref(false),
  }),
}))

vi.mock('@/composables/ui/useFieldScopes', () => ({
  useFieldScopes: () => ({ data: ref(FIELD_SCOPES) }),
}))

vi.mock('@/services/config', () => ({
  fieldsConfig: {
    header: [],
    hidden: [],
    hidden_description: [],
    bordered: ['staining', 'clinical', 'non_clinical', 'finding_details'],
    hidden_scopes: [],
  },
}))

const DynamicFieldStub = defineComponent({
  props: { field: { type: Object, required: true } },
  template: '<div class="field-stub" :data-field="field.id" />',
})

const ScopeSection = (await import('@/components/filters/ScopeSection.vue')).default

// Use one Pinia instance so the test and mounted component share the same store.
let pinia: ReturnType<typeof createPinia>

function mountSection() {
  return mount(ScopeSection, {
    global: {
      plugins: [pinia],
      directives: { control: {} },
      stubs: { DynamicField: DynamicFieldStub },
    },
  })
}

type Wrapper = ReturnType<typeof mountSection>

const fieldIds = (wrapper: Wrapper) =>
  wrapper.findAll('.field-stub').map((el) => el.attributes('data-field'))

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

const subgroupLabels = (wrapper: Wrapper, scope: string) =>
  panel(wrapper, scope)
    .findAll('.subgroup-label')
    .map((el) => el.text().trim())

const subgroupFieldIds = (wrapper: Wrapper, scope: string, subgroupLabel: string) => {
  const subgroups = panel(wrapper, scope).findAll('.subgroup')
  const sg = subgroups.find((el) => el.find('.subgroup-label').text().trim() === subgroupLabel)
  if (!sg) throw new Error(`no subgroup with label "${subgroupLabel}" in panel "${scope}"`)
  return sg.findAll('.field-stub').map((el) => el.attributes('data-field'))
}

async function selectTab(wrapper: Wrapper, id: string) {
  await wrapper.find(`#tab-btn-${id}`).trigger('click')
}

describe('ScopeSection — scope tabs', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('builds the tab strip from the fetched scopes, with All data first', () => {
    const wrapper = mountSection()
    expect(wrapper.findAll('[role="tab"]').map((t) => t.text())).toEqual([
      'All data',
      'Clinical',
      'Non-clinical',
    ])
  })

  it('renders each scope-only field inside its own panel on the all tab', () => {
    const wrapper = mountSection()
    const ids = fieldIds(wrapper)
    expect(ids).toContain('diagnosis')
    expect(ids).toContain('finding')
    expect(ids).toContain('finding_severity')
  })

  it('does not render duplicate fields on any tab', async () => {
    const wrapper = mountSection()
    for (const tab of ['all', 'clinical', 'non_clinical']) {
      await selectTab(wrapper, tab)
      const ids = fieldIds(wrapper)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('shows only clinical fields on the clinical tab', async () => {
    const wrapper = mountSection()
    await selectTab(wrapper, 'clinical')
    const ids = fieldIds(wrapper)
    expect(ids).toContain('diagnosis')
    expect(ids).not.toContain('finding')
    expect(ids).not.toContain('finding_severity')
  })

  it('shows only non-clinical fields on the non_clinical tab', async () => {
    const wrapper = mountSection()
    await selectTab(wrapper, 'non_clinical')
    const ids = fieldIds(wrapper)
    expect(ids).toContain('finding')
    expect(ids).not.toContain('diagnosis')
  })

  it('renders root-group panel fields flat, with no group-label heading of their own', () => {
    const wrapper = mountSection()
    // Root-group fields (no parent on the group) stay flat — no .group-label inside panels.
    expect(panel(wrapper, 'non_clinical').findAll('.group-label')).toHaveLength(0)
    expect(panel(wrapper, 'clinical').findAll('.group-label')).toHaveLength(0)
  })

  it('renders a child group as a subgroup with its own heading inside the parent scope panel', () => {
    const wrapper = mountSection()
    expect(subgroupLabels(wrapper, 'non_clinical')).toEqual(['Finding details'])
    expect(panel(wrapper, 'clinical').findAll('.subgroup-label')).toHaveLength(0)
  })

  it('orders panel fields by groups.yaml order — flat fields before subgroup fields', () => {
    const wrapper = mountSection()
    // panelFieldIds scans all .field-stub in the panel; flat fields render before subgroup fields.
    expect(panelFieldIds(wrapper, 'non_clinical')).toEqual([
      'animal_species',
      'finding',
      'finding_severity',
    ])
  })

  it('orders subgroup fields by groups.yaml order', () => {
    const wrapper = mountSection()
    expect(subgroupFieldIds(wrapper, 'non_clinical', 'Finding details')).toEqual([
      'finding_severity',
    ])
  })

  it('borders a scope panel whose id is in fieldsConfig.bordered', () => {
    const wrapper = mountSection()
    expect(panel(wrapper, 'clinical').classes()).toContain('filter-tab-panel--border')
    expect(panel(wrapper, 'non_clinical').classes()).toContain('filter-tab-panel--border')
  })

  it('keys the panel border colour on the scope id', () => {
    const wrapper = mountSection()
    expect(panel(wrapper, 'non_clinical').classes()).toContain('filter-tab-panel--non_clinical')
    expect(panel(wrapper, 'clinical').classes()).not.toContain('filter-tab-panel--non_clinical')
  })

  it('resets a ?tab= value that matches no fetched scope', () => {
    const store = useSearchStore()
    store.initFromUrl([{ id: 'sex', value: 'Female', operator: '=' }], 'garbage' as DatasetType)
    mountSection()
    expect(store.datasetType).toBe('all')
    expect(store.committedDatasetType).toBe('all')
  })
})

describe('ScopeSection — pruning filters on tab switch', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('drops draft filters whose field is outside the new scope', async () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007'])
    store.setFilter('finding', ['12710003'])

    const wrapper = mountSection()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters.map((f) => f.id)).toEqual(['anatomical_site'])
  })

  it('drops a hidden out-of-scope field too', async () => {
    const store = useSearchStore()
    store.setFilter('hidden_scope_only', ['447612001'])

    const wrapper = mountSection()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters).toEqual([])
  })

  it('keeps filters for ids absent from the field-scope map', async () => {
    const store = useSearchStore()
    store.setFilter('unknown_field', 'x')

    const wrapper = mountSection()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters.map((f) => f.id)).toEqual(['unknown_field'])
  })

  it('drops nothing when switching to the all tab', async () => {
    const store = useSearchStore()
    store.setFilter('finding', ['12710003'])

    const wrapper = mountSection()
    await selectTab(wrapper, 'clinical')
    store.setFilter('finding', ['12710003'])
    await selectTab(wrapper, 'all')

    expect(store.draftFilters.map((f) => f.id)).toEqual(['finding'])
  })

  it('leaves committed filters untouched so the visible results still match', async () => {
    const store = useSearchStore()
    store.setFilter('finding', ['12710003'])
    store.commit()

    const wrapper = mountSection()
    await selectTab(wrapper, 'clinical')

    expect(store.draftFilters).toEqual([])
    expect(store.committedFilters.map((f) => f.id)).toEqual(['finding'])
    expect(store.committedDatasetType).toBe('all')
  })

  it('announces the dropped filters by label', async () => {
    const store = useSearchStore()
    store.setFilter('finding', ['12710003'])

    const wrapper = mountSection()
    await selectTab(wrapper, 'clinical')

    const announcement = wrapper.find('[role="status"]').text()
    expect(announcement).toContain('1 filter removed')
    expect(announcement).toContain('Finding')
  })
})
