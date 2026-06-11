import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import MultiSelect from './MultiSelect.vue'

vi.mock('@/composables/useFieldValues', async () => {
  const { ref } = await import('vue')
  return {
    useFieldValues: vi.fn(() => ({
      data: ref([
        { value: 'Male', count: 42, concept_id: null },
        { value: 'Female', count: 38, concept_id: null },
        { value: 'Unknown', count: 5, concept_id: null },
      ]),
      isLoading: ref(false),
    })),
  }
})

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

describe('MultiSelect', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountComponent(modelValue: string[] = []) {
    return mount(MultiSelect, {
      props: { label: 'Species', fieldId: 'test', modelValue },
    })
  }

  async function openDropdown(w: ReturnType<typeof mountComponent>) {
    await w.find('.trigger').trigger('click')
    await nextTick()
  }

  it('shows "All" when nothing selected', () => {
    const w = mountComponent([])
    expect(w.find('.placeholder').text()).toBe('All')
    expect(w.find('.selected-first').exists()).toBe(false)
  })

  it('shows first selected value and +N badge when multiple selected', () => {
    const w = mountComponent(['Male', 'Female', 'Unknown'])
    expect(w.find('.selected-first').text()).toBe('Male')
    expect(w.find('.badge').text()).toBe('+2')
  })

  it('opens dropdown on trigger click', async () => {
    const w = mountComponent()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    await openDropdown(w)
    expect(w.find('[role="listbox"]').exists()).toBe(true)
  })

  it('closes dropdown on trigger click when open', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await w.find('.trigger').trigger('click')
    await nextTick()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })

  it('closes dropdown on Escape', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await w.find('input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })

  it('closes dropdown on outside click', async () => {
    const w = mountComponent()
    await openDropdown(w)
    clickOutsideCallback!()
    await nextTick()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })

  it('keeps dropdown open after item selection', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await w.findAll('[role="option"]')[0]!.trigger('click')
    await nextTick()
    expect(w.find('[role="listbox"]').exists()).toBe(true)
  })

  it('emits selected value on item click', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await w.findAll('[role="option"]')[0]!.trigger('click') // Male
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['Male']])
  })

  it('emits without value when selected item clicked again', async () => {
    const w = mountComponent(['Male'])
    await openDropdown(w)
    const maleOption = w.findAll('[role="option"]').find((o) => o.text().includes('Male'))
    await maleOption!.trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([[]])
  })

  it('emits multiple values when multiple items selected', async () => {
    const w = mountComponent(['Male'])
    await openDropdown(w)
    await w.findAll('[role="option"]')[1]!.trigger('click') // Female
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['Male', 'Female']])
  })

  it('filters options by search term', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await w.find('input').setValue('unk')
    await nextTick()
    const options = w.findAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]!.text()).toContain('Unknown')
  })

  it('shows no-options message when search has no matches', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await w.find('input').setValue('xyz')
    await nextTick()
    expect(w.find('.no-options').exists()).toBe(true)
    expect(w.find('[role="option"]').exists()).toBe(false)
  })

  it('clears search on reset click', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await w.find('input').setValue('mal')
    await nextTick()
    await w.find('.reset-btn').trigger('click')
    await nextTick()
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
    expect(w.find('.reset-btn').exists()).toBe(false)
  })

  it('trigger has correct aria-expanded when open and closed', async () => {
    const w = mountComponent()
    expect(w.find('.trigger').attributes('aria-expanded')).toBe('false')
    await openDropdown(w)
    expect(w.find('.trigger').attributes('aria-expanded')).toBe('true')
  })

  it('selected options have aria-selected=true', async () => {
    const w = mountComponent(['Male'])
    await openDropdown(w)
    const maleOption = w.findAll('[role="option"]').find((o) => o.text().includes('Male'))
    expect(maleOption!.attributes('aria-selected')).toBe('true')
  })

  it('unselected options have aria-selected=false', async () => {
    const w = mountComponent(['Male'])
    await openDropdown(w)
    const femaleOption = w.findAll('[role="option"]').find((o) => o.text().includes('Female'))
    expect(femaleOption!.attributes('aria-selected')).toBe('false')
  })
})
