import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import type {
  BeaconFilteringGroup,
  BeaconFilteringScope,
  BeaconFilteringTerm,
} from '@/types/beacon'

// Minimal scaffold, mirroring SearchForm.test.ts, but with useFilteringQualifiers failing —
// covers "the form still renders and search still works when /filtering_qualifiers errors."
const TERMS: BeaconFilteringTerm[] = [
  {
    id: 'dataset_description',
    type: 'text',
    label: 'Dataset description',
    description: '',
    ui_group: 'description',
    scopes: ['clinical', 'non_clinical'],
  },
]

const GROUPS: BeaconFilteringGroup[] = [{ id: 'description', label: 'Description', border: false }]

const SCOPES: BeaconFilteringScope[] = [
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
]

vi.mock('@/composables/useFilteringTerms', () => ({
  useFilteringTerms: () => ({ data: ref(TERMS), isLoading: ref(false), isError: ref(false) }),
}))

vi.mock('@/composables/useFilteringGroups', () => ({
  useFilteringGroups: () => ({ data: ref(GROUPS), isLoading: ref(false), isError: ref(false) }),
}))

vi.mock('@/composables/useFilteringScopes', () => ({
  useFilteringScopes: () => ({ data: ref(SCOPES), isLoading: ref(false), isError: ref(false) }),
}))

vi.mock('@/composables/useFieldScopes', () => ({
  useFieldScopes: () => ({ data: ref(new Map()) }),
}))

vi.mock('@/composables/useFilteringQualifiers', () => ({
  useFilteringQualifiers: () => ({ data: ref(undefined), isError: ref(true) }),
}))

const DynamicFieldStub = {
  props: { field: { type: Object, required: true } },
  template: '<div class="field-stub" :data-field="field.id" />',
}

const SearchForm = (await import('@/components/SearchForm.vue')).default

describe('SearchForm — qualifier request failure', () => {
  it('renders the form and hides the selector when /filtering_qualifiers fails', () => {
    setActivePinia(createPinia())
    const wrapper = mount(SearchForm, {
      global: {
        plugins: [],
        directives: { control: {} },
        stubs: { DynamicField: DynamicFieldStub },
      },
    })
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('.qualifier-selector').exists()).toBe(false)
  })

  it('drops a URL-restored qualifier and announces it when /filtering_qualifiers fails', () => {
    setActivePinia(createPinia())
    const store = useSearchStore()
    store.initFromUrl([], undefined, { observation: 'confirmed' })

    const wrapper = mount(SearchForm, {
      global: {
        plugins: [],
        directives: { control: {} },
        stubs: { DynamicField: DynamicFieldStub },
      },
    })

    expect(store.draftQualifiers).toEqual({})
    expect(store.committedQualifiers).toEqual({})
    expect(wrapper.find('[role="status"]').text()).toContain('could not be checked')
  })
})
