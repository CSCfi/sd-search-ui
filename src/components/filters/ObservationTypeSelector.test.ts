import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ObservationTypeSelector from './ObservationTypeSelector.vue'
import { useSearchStore } from '@/stores/searchStore'
import type { BeaconFilteringTerm } from '@/types/beacon'

const FIELD: BeaconFilteringTerm = {
  id: 'observation_type',
  type: 'controlledValue',
  label: 'Observation type',
  description: 'How the finding or diagnosis is linked to the image.',
  scopes: ['clinical', 'non_clinical'],
  controlledValues: ['confirmed', 'candidate'],
}

// Scoped to `[role="radio"]` — tooltip renders a button without that role.
const radios = (wrapper: ReturnType<typeof mountSelector>) => wrapper.findAll('[role="radio"]')

let pinia: ReturnType<typeof createPinia>

function mountSelector(selected: string | null = null) {
  return mount(ObservationTypeSelector, {
    props: { field: FIELD, selected },
    global: { plugins: [pinia] },
  })
}

describe('ObservationTypeSelector', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders All plus one pill per declared value, with title-cased labels', () => {
    const wrapper = mountSelector()
    const labels = radios(wrapper).map((b) => b.text())
    expect(labels).toEqual(['All', 'Confirmed', 'Candidate'])
  })

  it('marks All active when no selection exists', () => {
    const wrapper = mountSelector()
    const buttons = radios(wrapper)
    expect(buttons[0]?.attributes('aria-checked')).toBe('true')
    expect(buttons[1]?.attributes('aria-checked')).toBe('false')
  })

  it('marks the selected value active, not All', () => {
    const wrapper = mountSelector('confirmed')
    const buttons = radios(wrapper)
    expect(buttons[0]?.attributes('aria-checked')).toBe('false')
    expect(buttons[1]?.attributes('aria-checked')).toBe('true')
  })

  it('calls store.setFilter with the value on pill click', async () => {
    const store = useSearchStore()
    const wrapper = mountSelector()
    await radios(wrapper)[2]?.trigger('click')
    expect(store.draftFilters).toEqual([
      { id: 'observation_type', value: 'candidate', operator: '=' },
    ])
  })

  it('calls store.removeFilters when the All pill is clicked', async () => {
    const store = useSearchStore()
    store.setFilter('observation_type', 'confirmed')
    const wrapper = mountSelector('confirmed')
    await radios(wrapper)[0]?.trigger('click')
    expect(store.draftFilters.find((f) => f.id === 'observation_type')).toBeUndefined()
  })

  it('ArrowRight moves selection to the next pill and calls setFilter', async () => {
    const store = useSearchStore()
    const wrapper = mountSelector()
    await radios(wrapper)[0]?.trigger('keydown', { key: 'ArrowRight' })
    expect(store.draftFilters.find((f) => f.id === 'observation_type')?.value).toBe('confirmed')
  })

  it('ArrowLeft from the first pill wraps around to the last pill', async () => {
    const store = useSearchStore()
    const wrapper = mountSelector()
    await radios(wrapper)[0]?.trigger('keydown', { key: 'ArrowLeft' })
    expect(store.draftFilters.find((f) => f.id === 'observation_type')?.value).toBe('candidate')
  })

  it('ArrowDown behaves like ArrowRight and ArrowUp like ArrowLeft', async () => {
    const store = useSearchStore()
    const wrapper = mountSelector('confirmed')
    await radios(wrapper)[1]?.trigger('keydown', { key: 'ArrowDown' })
    expect(store.draftFilters.find((f) => f.id === 'observation_type')?.value).toBe('candidate')
  })

  it('Home selects the first pill (removes filter), End selects the last', async () => {
    const store = useSearchStore()
    store.setFilter('observation_type', 'confirmed')
    const wrapper = mountSelector('confirmed')
    await radios(wrapper)[1]?.trigger('keydown', { key: 'End' })
    expect(store.draftFilters.find((f) => f.id === 'observation_type')?.value).toBe('candidate')
    await radios(wrapper)[1]?.trigger('keydown', { key: 'Home' })
    // Home → All → removeFilters
    expect(store.draftFilters.find((f) => f.id === 'observation_type')).toBeUndefined()
  })

  it('ignores unrelated keys', async () => {
    const store = useSearchStore()
    const wrapper = mountSelector()
    await radios(wrapper)[0]?.trigger('keydown', { key: 'Enter' })
    expect(store.draftFilters.find((f) => f.id === 'observation_type')).toBeUndefined()
  })
})
