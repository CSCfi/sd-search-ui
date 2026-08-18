import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QualifierSelector from './QualifierSelector.vue'
import type { BeaconFilteringQualifier } from '@/types/beacon'

const QUALIFIERS: BeaconFilteringQualifier[] = [
  {
    id: 'observation',
    label: 'Observation',
    description: 'How the finding or diagnosis is linked to the image.',
    values: ['confirmed', 'candidate'],
    groups: ['diagnosis', 'finding'],
  },
]

function mountSelector(selected: Record<string, string> = {}) {
  return mount(QualifierSelector, {
    props: { qualifiers: QUALIFIERS, selected },
  })
}

// Scoped to `[role="radio"]` rather than every `<button>` — the qualifier label also renders
// a `FieldInfoTooltip`, whose info-icon is a `<button>` with no `role="radio"` and no
// `aria-checked`. Selecting on the ARIA role is also what actually matters here.
const radios = (wrapper: ReturnType<typeof mountSelector>) => wrapper.findAll('[role="radio"]')

describe('QualifierSelector', () => {
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
    const wrapper = mountSelector({ observation: 'confirmed' })
    const buttons = radios(wrapper)
    expect(buttons[0]?.attributes('aria-checked')).toBe('false')
    expect(buttons[1]?.attributes('aria-checked')).toBe('true')
  })

  it('emits change with the qualifier id and value on pill click', async () => {
    const wrapper = mountSelector()
    await radios(wrapper)[2]?.trigger('click')
    expect(wrapper.emitted('change')).toEqual([['observation', 'candidate']])
  })

  it('emits change with "all" when the All pill is clicked', async () => {
    const wrapper = mountSelector({ observation: 'confirmed' })
    await radios(wrapper)[0]?.trigger('click')
    expect(wrapper.emitted('change')).toEqual([['observation', 'all']])
  })

  it('every pill carries aria-checked', () => {
    const wrapper = mountSelector()
    const buttons = radios(wrapper)
    expect(buttons.every((b) => b.attributes('aria-checked') !== undefined)).toBe(true)
  })

  it('renders one radiogroup per qualifier, labelled by the qualifier label', () => {
    const wrapper = mountSelector()
    const group = wrapper.find('[role="radiogroup"]')
    expect(group.attributes('aria-labelledby')).toBe('qualifier-label-observation')
  })

  it('gives only the checked pill tabindex 0, all others -1 (roving tabindex)', () => {
    const wrapper = mountSelector({ observation: 'confirmed' })
    const buttons = radios(wrapper)
    expect(buttons.map((b) => b.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
  })

  it('ArrowRight moves selection to the next pill and emits change', async () => {
    const wrapper = mountSelector()
    await radios(wrapper)[0]?.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('change')).toEqual([['observation', 'confirmed']])
  })

  it('ArrowLeft from the first pill wraps around to the last pill', async () => {
    const wrapper = mountSelector()
    await radios(wrapper)[0]?.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('change')).toEqual([['observation', 'candidate']])
  })

  it('ArrowDown behaves like ArrowRight and ArrowUp like ArrowLeft', async () => {
    const wrapper = mountSelector({ observation: 'confirmed' })
    await radios(wrapper)[1]?.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('change')).toEqual([['observation', 'candidate']])
  })

  it('Home selects the first pill, End selects the last', async () => {
    const wrapper = mountSelector({ observation: 'confirmed' })
    await radios(wrapper)[1]?.trigger('keydown', { key: 'End' })
    await radios(wrapper)[1]?.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('change')).toEqual([
      ['observation', 'candidate'],
      ['observation', 'all'],
    ])
  })

  it('ignores unrelated keys', async () => {
    const wrapper = mountSelector()
    await radios(wrapper)[0]?.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('change')).toBeUndefined()
  })
})
