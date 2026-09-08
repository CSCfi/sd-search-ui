import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ObservationTypeSelector from './ObservationTypeSelector.vue'
import type { BeaconFilteringQualifier } from '@/types/beacon'

const QUALIFIER: BeaconFilteringQualifier = {
  id: 'observation',
  label: 'Observation type',
  description: 'How the finding or diagnosis is linked to the image.',
  values: ['confirmed', 'candidate'],
  groups: ['diagnosis', 'finding'],
}

function mountSelector(selected?: string) {
  return mount(ObservationTypeSelector, {
    props: { qualifier: QUALIFIER, selected },
  })
}

const toggleInput = (wrapper: ReturnType<typeof mountSelector>) =>
  wrapper.find<HTMLInputElement>('input[role="switch"]')

describe('ObservationTypeSelector', () => {
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
    expect(wrapper.emitted('change')).toEqual([['observation', 'confirmed']])
  })

  it('emits change with all when toggling off', async () => {
    const wrapper = mountSelector('confirmed')
    const input = toggleInput(wrapper)
    input.element.checked = false
    await input.trigger('change')
    expect(wrapper.emitted('change')).toEqual([['observation', 'all']])
  })

  it('renders tooltip when qualifier has a description', () => {
    const wrapper = mountSelector()
    expect(wrapper.findComponent({ name: 'FieldInfoTooltip' }).exists()).toBe(true)
  })
})
