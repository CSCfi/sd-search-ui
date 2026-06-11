import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import OntologyPicker from './OntologyPicker.vue'

const MOCK_SUGGESTIONS = vi.hoisted((): { term: string; concept_id: string | null }[] => [
  { term: 'Breast structure', concept_id: '80248007' },
  { term: 'Lung structure', concept_id: '39607008' },
  { term: 'Antibody', concept_id: null },
])

const MOCK_VALUES = vi.hoisted(
  (): { value: string; count: number; concept_id: string | null }[] => [
    { value: 'Breast structure', count: 42, concept_id: '80248007' },
    { value: 'Lung structure', count: 38, concept_id: '39607008' },
  ],
)

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

vi.mock('@/composables/useFieldValues', async () => {
  const { ref } = await import('vue')
  return {
    useFieldValues: vi.fn(() => ({
      data: ref(MOCK_VALUES),
      isLoading: ref(false),
      isError: ref(false),
    })),
  }
})

// Simulates TanStack Query `enabled: term.length > 1` — no data returned for short terms.
vi.mock('@/composables/useSuggestions', async () => {
  const { ref, watchEffect } = await import('vue')
  return {
    useSuggestions: vi.fn((_fieldId: string, searchTerm: { value: string }) => {
      const data = ref([] as typeof MOCK_SUGGESTIONS)
      watchEffect(() => {
        data.value = searchTerm.value.length >= 2 ? MOCK_SUGGESTIONS : []
      })
      return { data, isLoading: ref(false), isError: ref(false) }
    }),
  }
})

describe('OntologyPicker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountComponent(
    overrides: Partial<{
      label: string
      fieldId: string
      modelValue: string[]
      allowFreeText: boolean
    }> = {},
  ) {
    return mount(OntologyPicker, {
      props: {
        label: 'Anatomical Site',
        fieldId: 'anatomical_site',
        modelValue: [],
        allowFreeText: false,
        ...overrides,
      },
    })
  }

  async function openDropdown(w: ReturnType<typeof mountComponent>) {
    await w.find('.trigger').trigger('click')
    await nextTick()
  }

  async function typeSearch(w: ReturnType<typeof mountComponent>, term: string) {
    await w.find('.search-input').setValue(term)
    await nextTick()
  }

  it('shows "All" when nothing selected', () => {
    const w = mountComponent()
    expect(w.find('.placeholder').text()).toBe('All')
    expect(w.find('.selected-first').exists()).toBe(false)
  })

  it('shows first selected term in trigger', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'br')
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Breast'))!
      .trigger('click')
    await nextTick()
    await w.find('.trigger').trigger('click') // close
    await nextTick()
    expect(w.find('.selected-first').text()).toBe('Breast structure')
    expect(w.find('.placeholder').exists()).toBe(false)
  })

  it('shows +N badge when multiple selected', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'xx')
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Breast'))!
      .trigger('click')
    await nextTick()
    await typeSearch(w, 'xx') // searchTerm cleared on selection — retype to show options
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Lung'))!
      .trigger('click')
    await nextTick()
    await w.find('.trigger').trigger('click') // close
    await nextTick()
    expect(w.find('.selected-first').text()).toBe('Breast structure')
    expect(w.find('.badge').text()).toBe('+1')
  })

  it('shows field values when dropdown opens or term is less than 2 characters', async () => {
    const w = mountComponent()
    await openDropdown(w)
    expect(w.findAll('.option-label').map((o) => o.text())).toContain('Breast structure')
    await typeSearch(w, 'b')
    expect(w.findAll('.option-label').map((o) => o.text())).toContain('Breast structure')
  })

  it('fetches suggestions when term is 2+ characters', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'br')
    expect(w.findAll('[role="option"]').length).toBeGreaterThan(0)
  })

  it('filters by allowFreeText — hides concept_id=null items when false', async () => {
    const w = mountComponent({ allowFreeText: false })
    await openDropdown(w)
    await typeSearch(w, 'xx')
    const texts = w.findAll('[role="option"]').map((o) => o.text())
    expect(texts).toContain('Breast structure')
    expect(texts).toContain('Lung structure')
    expect(texts).not.toContain('Antibody')
  })

  it('shows both ontology and free-text items when allowFreeText=true', async () => {
    const w = mountComponent({ allowFreeText: true })
    await openDropdown(w)
    await typeSearch(w, 'xx')
    const texts = w.findAll('[role="option"]').map((o) => o.text())
    expect(texts).toContain('Breast structure')
    expect(texts).toContain('Antibody')
  })

  it('emits concept_id when SNOMED item selected', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'br')
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Breast'))!
      .trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['80248007']])
  })

  it('emits term string when free-text item selected (concept_id=null)', async () => {
    const w = mountComponent({ allowFreeText: true })
    await openDropdown(w)
    await typeSearch(w, 'xx')
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Antibody'))!
      .trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([['Antibody']])
  })

  it('emits array of values when multiple items selected', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'xx')
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Breast'))!
      .trigger('click')
    await nextTick()
    await typeSearch(w, 'xx') // retype — searchTerm cleared on selection
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Lung'))!
      .trigger('click')
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual([['80248007', '39607008']])
  })

  it('deselects item when clicked again', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'xx')
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Breast'))!
      .trigger('click') // select — searchTerm clears
    await nextTick()
    await typeSearch(w, 'xx')
    await w
      .findAll('[role="option"]')
      .find((o) => o.text().includes('Breast'))!
      .trigger('click') // deselect
    const emitted = w.emitted('update:modelValue')!
    expect(emitted[emitted.length - 1]).toEqual([[]])
  })

  it('keeps dropdown open after selection', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'xx')
    await w.findAll('[role="option"]')[0]!.trigger('click')
    await nextTick()
    expect(w.find('[role="listbox"]').exists()).toBe(true)
  })

  it('emits includeDescendantTerms=true by default', async () => {
    const w = mountComponent()
    await openDropdown(w)
    const checkbox = w.find('input[type="checkbox"]').element as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('emits includeDescendantTerms=false when checkbox unchecked', async () => {
    const w = mountComponent()
    await openDropdown(w)
    const checkbox = w.find('input[type="checkbox"]').element as HTMLInputElement
    checkbox.checked = false
    await w.find('input[type="checkbox"]').trigger('change')
    expect(w.emitted('update:includeDescendantTerms')?.[0]).toEqual([false])
  })

  it('trigger has correct aria-expanded', async () => {
    const w = mountComponent()
    expect(w.find('.trigger').attributes('aria-expanded')).toBe('false')
    await openDropdown(w)
    expect(w.find('.trigger').attributes('aria-expanded')).toBe('true')
  })

  it('selected options have aria-selected=true', async () => {
    const w = mountComponent()
    await openDropdown(w)
    await typeSearch(w, 'xx')
    const breastOption = w.findAll('[role="option"]').find((o) => o.text().includes('Breast'))!
    await breastOption.trigger('click')
    await nextTick()
    await typeSearch(w, 'xx')
    const reRendered = w.findAll('[role="option"]').find((o) => o.text().includes('Breast'))!
    expect(reRendered.attributes('aria-selected')).toBe('true')
    const lungOption = w.findAll('[role="option"]').find((o) => o.text().includes('Lung'))!
    expect(lungOption.attributes('aria-selected')).toBe('false')
  })
})
