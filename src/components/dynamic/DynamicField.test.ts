import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import DynamicField from './DynamicField.vue'
import TextInput from './TextField.vue'
import MultiSelect from './MultiSelect.vue'
import OntologyPicker from './OntologyPicker.vue'
import RangePicker from './RangePicker.vue'
import { useSearchStore } from '@/stores/searchStore'
import type { BeaconFilteringTerm } from '@/types/beacon'

function makeField(overrides: Partial<BeaconFilteringTerm> = {}): BeaconFilteringTerm {
  return {
    id: 'test_field',
    type: 'text',
    label: 'Test Field',
    description: '',
    scopes: [],
    ...overrides,
  }
}

describe('DynamicField', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountField(field: BeaconFilteringTerm) {
    return mount(DynamicField, {
      props: { field },
      global: {
        plugins: [pinia, VueQueryPlugin],
        directives: { control: {} },
      },
    })
  }

  it('renders TextInput for type=text', () => {
    const wrapper = mountField(makeField({ type: 'text' }))
    expect(wrapper.findComponent(TextInput).exists()).toBe(true)
    expect(wrapper.findComponent(MultiSelect).exists()).toBe(false)
  })

  it('renders MultiSelect for type=controlledValue', () => {
    const wrapper = mountField(makeField({ type: 'controlledValue' }))
    expect(wrapper.findComponent(MultiSelect).exists()).toBe(true)
    expect(wrapper.findComponent(TextInput).exists()).toBe(false)
  })

  it('renders OntologyPicker for type=ontology', () => {
    const wrapper = mountField(makeField({ type: 'ontology' }))
    expect(wrapper.findComponent(OntologyPicker).exists()).toBe(true)
    expect(wrapper.findComponent(TextInput).exists()).toBe(false)
  })

  it('renders OntologyPicker for type=ontologyOrValue', () => {
    const wrapper = mountField(makeField({ type: 'ontologyOrValue' }))
    expect(wrapper.findComponent(OntologyPicker).exists()).toBe(true)
    expect(wrapper.findComponent(TextInput).exists()).toBe(false)
  })

  it('renders RangePicker for type=iso8601Range', () => {
    const wrapper = mountField(makeField({ type: 'iso8601Range' }))
    expect(wrapper.findComponent(RangePicker).exists()).toBe(true)
    expect(wrapper.findComponent(TextInput).exists()).toBe(false)
  })

  it('renders nothing and logs warning for unknown type', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const field = makeField({
      id: 'bad_field',
      type: 'unknown' as unknown as BeaconFilteringTerm['type'],
    })
    const wrapper = mountField(field)

    expect(wrapper.findComponent(TextInput).exists()).toBe(false)
    expect(wrapper.findComponent(MultiSelect).exists()).toBe(false)
    expect(wrapper.findComponent(OntologyPicker).exists()).toBe(false)
    expect(wrapper.findComponent(RangePicker).exists()).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[DynamicField]'))
  })

  it('passes current store value to child component', () => {
    const store = useSearchStore()
    store.setFilter('dataset_description', 'lung carcinoma')

    const wrapper = mountField(makeField({ id: 'dataset_description', type: 'text' }))

    expect(wrapper.findComponent(TextInput).props('modelValue')).toBe('lung carcinoma')
  })

  it('calls searchStore.setFilter when child emits update:modelValue', () => {
    const wrapper = mountField(makeField({ id: 'dataset_description', type: 'text' }))

    const store = useSearchStore()
    const setFilterSpy = vi.spyOn(store, 'setFilter')

    wrapper.findComponent(TextInput).vm.$emit('update:modelValue', 'cancer')

    expect(setFilterSpy).toHaveBeenCalledWith('dataset_description', 'cancer')
  })

  it('passes allowFreeText=false to OntologyPicker for type=ontology', () => {
    const wrapper = mountField(makeField({ type: 'ontology' }))
    expect(wrapper.findComponent(OntologyPicker).props('allowFreeText')).toBe(false)
  })

  it('passes allowFreeText=true to OntologyPicker for type=ontologyOrValue', () => {
    const wrapper = mountField(makeField({ type: 'ontologyOrValue' }))
    expect(wrapper.findComponent(OntologyPicker).props('allowFreeText')).toBe(true)
  })

  it('defaults includeDescendantTerms=true when no toggle emitted', () => {
    const wrapper = mountField(makeField({ id: 'anatomical_site', type: 'ontology' }))
    const store = useSearchStore()
    const setFilterSpy = vi.spyOn(store, 'setFilter')

    wrapper.findComponent(OntologyPicker).vm.$emit('update:modelValue', ['80248007'])

    expect(setFilterSpy).toHaveBeenCalledWith('anatomical_site', ['80248007'], true)
  })

  it('passes includeDescendantTerms=false to setFilter after toggle then select', () => {
    const wrapper = mountField(makeField({ id: 'anatomical_site', type: 'ontology' }))
    const store = useSearchStore()
    const setFilterSpy = vi.spyOn(store, 'setFilter')

    const picker = wrapper.findComponent(OntologyPicker)
    picker.vm.$emit('update:includeDescendantTerms', false)
    picker.vm.$emit('update:modelValue', ['80248007'])

    expect(setFilterSpy).toHaveBeenCalledWith('anatomical_site', ['80248007'], false)
  })

  it('passes existing store array to OntologyPicker on mount', () => {
    const store = useSearchStore()
    store.setFilter('anatomical_site', ['80248007', '64033007'], true)

    const wrapper = mountField(makeField({ id: 'anatomical_site', type: 'ontology' }))

    expect(wrapper.findComponent(OntologyPicker).props('modelValue')).toEqual([
      '80248007',
      '64033007',
    ])
  })
})
