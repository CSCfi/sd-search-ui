import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import RangePicker from './RangePicker.vue'

// jsdom composedPath() doesn't work with vueuse's capture listener.
// Capture the callback and invoke it directly in the outside-click test.
let clickOutsideCallback: (() => void) | undefined

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    onClickOutside: vi.fn((_target: unknown, callback: () => void) => {
      clickOutsideCallback = callback
      return vi.fn()
    }),
  }
})

describe('RangePicker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    clickOutsideCallback = undefined
  })

  function mountComponent(modelValue = '') {
    return mount(RangePicker, {
      props: { label: 'Age at extraction', modelValue },
    })
  }

  async function openDropdown(w: ReturnType<typeof mountComponent>) {
    await w.find('.trigger').trigger('click')
    await nextTick()
  }

  async function setRange(
    w: ReturnType<typeof mountComponent>,
    from: number,
    to: number,
    unit: string,
  ) {
    const inputs = w.findAll('input[type="number"]')
    await inputs[0]!.setValue(String(from))
    await inputs[1]!.setValue(String(to))
    await w.find('select').setValue(unit)
  }

  // --- ISO 8601 output ---

  it('emits correct range string when all fields are valid — years', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await setRange(w, 40, 50, 'Y')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual(['P40Y-P50Y'])
  })

  it('emits correct range string — months', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await setRange(w, 6, 12, 'M')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual(['P6M-P12M'])
  })

  it('emits correct range string — weeks', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await setRange(w, 4, 8, 'W')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual(['P4W-P8W'])
  })

  it('emits correct range string — days', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await setRange(w, 1, 7, 'D')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual(['P1D-P7D'])
  })

  it('emits empty string when from > to', async () => {
    const w = mountComponent('P40Y-P50Y')
    await openDropdown(w)
    await w.findAll('input[type="number"]')[0]!.setValue('60')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual([''])
  })

  it('emits empty string when from is missing', async () => {
    const w = mountComponent('P40Y-P50Y')
    await openDropdown(w)
    await w.findAll('input[type="number"]')[0]!.setValue('')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual([''])
  })

  it('emits empty string when to is missing', async () => {
    const w = mountComponent('P40Y-P50Y')
    await openDropdown(w)
    await w.findAll('input[type="number"]')[1]!.setValue('')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual([''])
  })

  it('emits empty string when unit is missing', async () => {
    // Unit can't be cleared after selection — test fresh mount: setting from+to without
    // unit must not produce any non-empty emission.
    const w = mountComponent()
    await openDropdown(w)
    await w.findAll('input[type="number"]')[0]!.setValue('40')
    await w.findAll('input[type="number"]')[1]!.setValue('50')
    const emitted = w.emitted('update:modelValue') ?? []
    expect(emitted.flat().filter((v) => v !== '')).toHaveLength(0)
  })

  // --- External reset ---

  it('clears fields when modelValue set to empty string', async () => {
    const w = mountComponent('P40Y-P50Y')
    expect(w.find('.selected-first').text()).toBe('40 – 50 Years')
    await w.setProps({ modelValue: '' })
    expect(w.find('.placeholder').text()).toBe('All')
    expect(w.find('.selected-first').exists()).toBe(false)
  })

  it('populates fields from initial modelValue on mount', () => {
    const w = mountComponent('P20M-P36M')
    expect(w.find('.selected-first').text()).toBe('20 – 36 Months')
  })

  // --- UI ---

  it('shows triggerText when valid range is set', () => {
    const w = mountComponent('P40Y-P50Y')
    expect(w.find('.selected-first').text()).toBe('40 – 50 Years')
    expect(w.find('.placeholder').exists()).toBe(false)
  })

  it('shows "All" placeholder when no range is set', () => {
    const w = mountComponent()
    expect(w.find('.placeholder').text()).toBe('All')
    expect(w.find('.selected-first').exists()).toBe(false)
  })

  it('shows error message when from > to', async () => {
    const w = mountComponent('P40Y-P50Y')
    await openDropdown(w)
    await w.findAll('input[type="number"]')[0]!.setValue('60')
    expect(w.find('[role="alert"]').exists()).toBe(true)
    expect(w.find('[role="alert"]').text()).toContain('From must be less than or equal to To')
  })

  it('does not show error message when from === to', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await setRange(w, 40, 40, 'Y')
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('closes dropdown on outside click', async () => {
    const w = mountComponent()
    await openDropdown(w)
    expect(w.find('.dropdown').exists()).toBe(true)
    clickOutsideCallback!()
    await nextTick()
    expect(w.find('.dropdown').exists()).toBe(false)
  })
})
