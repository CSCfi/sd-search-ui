import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
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
]

const termById = (id: string) => TERMS.find((t) => t.id === id)!

// Resolved groups matching the real groups.yaml structure.
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
]

const SCOPES: BeaconFilteringScope[] = [
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
]

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

vi.mock('@/services/config', () => ({
  fieldsConfig: {
    header: [],
    hidden: [],
    hidden_description: [],
    bordered: ['staining', 'clinical', 'non_clinical'],
    hidden_scopes: [],
  },
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

const sharedFieldIds = (wrapper: Wrapper) =>
  wrapper.findAll('.field-stub').map((el) => el.attributes('data-field'))

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

describe('SearchForm — shared field grid', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders only shared fields (present in every scope) above the tabs', () => {
    const wrapper = mountForm()
    expect(sharedFieldIds(wrapper)).toEqual([
      'dataset_description',
      'anatomical_site',
      'staining_target',
    ])
  })

  it('does not render scope-only fields in the shared grid', () => {
    const wrapper = mountForm()
    const ids = sharedFieldIds(wrapper)
    expect(ids).not.toContain('diagnosis')
    expect(ids).not.toContain('finding')
  })

  it('groups shared fields under their group labels', () => {
    const wrapper = mountForm()
    expect(groupLabels(wrapper)).toEqual(['Description', 'Subject & specimen', 'Staining'])
  })

  it('borders a group listed in fieldsConfig.bordered', () => {
    const wrapper = mountForm()
    expect(groupByLabel(wrapper, 'Staining').classes()).toContain('group--border')
  })

  it('does not border a group not listed in fieldsConfig.bordered', () => {
    const wrapper = mountForm()
    expect(groupByLabel(wrapper, 'Description').classes()).not.toContain('group--border')
  })
})

describe('SearchForm — copy filter URL', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('includes filters in the copied URL', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])

    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mountForm()
    await wrapper.find('.btn-copy').trigger('click')
    await flushPromises()

    const url = new URL(writeText.mock.calls[0]?.[0] as string)
    expect(url.searchParams.get('diagnosis')).toBe('64033007')
  })

  it('includes observation_type filter when selected', async () => {
    const store = useSearchStore()
    store.setFilter('diagnosis', ['64033007'])
    store.setFilter('observation_type', 'confirmed')

    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    const wrapper = mountForm()
    await wrapper.find('.btn-copy').trigger('click')
    await flushPromises()

    const url = new URL(writeText.mock.calls[0]?.[0] as string)
    expect(url.searchParams.get('diagnosis')).toBe('64033007')
    expect(url.searchParams.get('observation_type')).toBe('confirmed')
  })
})
