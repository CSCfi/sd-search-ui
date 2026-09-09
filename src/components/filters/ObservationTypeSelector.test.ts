import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ObservationTypeSelector from './ObservationTypeSelector.vue'
import type { BeaconFilteringTerm } from '@/types/beacon'

const FIELD: BeaconFilteringTerm = {
  id: 'observation_type',
  type: 'controlledValue',
  label: 'Observation type',
  description: 'How the finding or diagnosis is linked to the image.',
  scopes: ['clinical', 'non_clinical'],
  controlledValues: ['confirmed', 'candidate'],
}

let pinia: ReturnType<typeof createPinia>

function mountSelector(selected: string | null = null) {
  return mount(ObservationTypeSelector, {
    props: { field: FIELD, selected },
    global: { plugins: [pinia] },
  })
}

const toggleInput = (wrapper: ReturnType<typeof mountSelector>) =>
  wrapper.find<HTMLInputElement>('input[role="switch"]')

describe('ObservationTypeSelector', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders toggle unchecked when selected is undefined', () => {
    const wrapper = mountSelector()
    expect(toggleInput(wrapper).element.checked).toBe(false)
  })

  it('renders toggle checked when selected is confirmed', () => {
    const wrapper = mountSelector('confirmed')
    expect(toggleInput(wrapper).element.checked).toBe(true)
  })

  it('emits change with confirmed when toggling on', async () => {
    const wrapper = mountSelector()
    const input = toggleInput(wrapper)
    input.element.checked = true
    await input.trigger('change')
    expect(wrapper.emitted('change')).toEqual([['observation_type', 'confirmed']])
  })

  it('emits change with all when toggling off', async () => {
    const wrapper = mountSelector('confirmed')
    const input = toggleInput(wrapper)
    input.element.checked = false
    await input.trigger('change')
    expect(wrapper.emitted('change')).toEqual([['observation_type', 'all']])
  })

  it('renders tooltip when qualifier has a description', () => {
    const wrapper = mountSelector()
    expect(wrapper.findComponent({ name: 'FieldInfoTooltip' }).exists()).toBe(true)
  })
})
