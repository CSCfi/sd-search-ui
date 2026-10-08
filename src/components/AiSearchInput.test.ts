import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, type Ref } from 'vue'
import AiSearchInput from './AiSearchInput.vue'
import type { AIInputState } from '@/composables/query/useAIFilterInput'

const hoisted = vi.hoisted(() => ({
  submit: vi.fn<(text: string) => Promise<boolean>>(),
  cancel: vi.fn<() => void>(),
  dismiss: vi.fn<() => void>(),
}))
let state: Ref<AIInputState>

vi.mock('@/composables/query/useAIFilterInput', () => ({
  useAIFilterInput: () => ({
    state,
    submit: hoisted.submit,
    cancel: hoisted.cancel,
    dismiss: hoisted.dismiss,
  }),
}))

function mountInput() {
  return mount(AiSearchInput)
}

async function type(w: ReturnType<typeof mountInput>, value: string) {
  await w.find('input').setValue(value)
}

describe('AiSearchInput', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    state = ref<AIInputState>({ kind: 'idle' })
    hoisted.submit.mockResolvedValue(true)
  })

  it('disables Apply until the text has a non-whitespace character', async () => {
    const w = mountInput()
    // Vue renders a boolean prop on the c-button custom element as the string 'true' / 'false'.
    const disabled = () => w.find('.btn-apply').attributes('disabled')
    expect(disabled()).toBe('true')
    await type(w, '   ')
    expect(disabled()).toBe('true')
    await type(w, 'male')
    expect(disabled()).toBe('false')
  })

  it('submits the trimmed text on Apply and on Enter', async () => {
    // Failed applies keep the text, so the same text can be submitted twice.
    hoisted.submit.mockResolvedValue(false)
    const w = mountInput()
    await type(w, '  male  ')
    await w.find('.btn-apply').trigger('click')
    await w.find('input').trigger('keydown.enter')
    expect(hoisted.submit).toHaveBeenNthCalledWith(1, 'male')
    expect(hoisted.submit).toHaveBeenNthCalledWith(2, 'male')
  })

  it('clears the text only when the filters were applied', async () => {
    const w = mountInput()
    hoisted.submit.mockResolvedValueOnce(false)
    await type(w, 'male')
    await w.find('.btn-apply').trigger('click')
    await Promise.resolve()
    expect(w.find('input').element.value).toBe('male')

    hoisted.submit.mockResolvedValueOnce(true)
    await w.find('.btn-apply').trigger('click')
    await vi.waitFor(() => expect(w.find('input').element.value).toBe(''))
  })

  it('shows a counter only near the 300 character limit', async () => {
    const w = mountInput()
    await type(w, 'a'.repeat(249))
    expect(w.find('.counter').exists()).toBe(false)
    await type(w, 'a'.repeat(250))
    expect(w.find('.counter').text()).toBe('250 / 300')
  })

  it('shows a loading message and Cancel instead of Apply while loading', async () => {
    state.value = { kind: 'loading' }
    const w = mountInput()
    expect(w.find('.status').text()).toContain('Interpreting your search')
    const button = w.find('.btn-apply')
    expect(button.text()).toBe('Cancel')
    await button.trigger('click')
    expect(hoisted.cancel).toHaveBeenCalledTimes(1)
  })

  it('does not submit while loading, even on Enter', async () => {
    const w = mountInput()
    await type(w, 'male')
    state.value = { kind: 'loading' }
    await w.vm.$nextTick()
    await w.find('input').trigger('keydown.enter')
    expect(hoisted.submit).not.toHaveBeenCalled()
  })

  it('cancels on Escape while loading, and does nothing on Escape otherwise', async () => {
    const w = mountInput()
    await w.find('input').trigger('keydown.esc')
    expect(hoisted.cancel).not.toHaveBeenCalled()

    state.value = { kind: 'loading' }
    await w.vm.$nextTick()
    await w.find('input').trigger('keydown.esc')
    expect(hoisted.cancel).toHaveBeenCalledTimes(1)
  })

  it('shows the interpretation, the tab switch and removed filters on success', () => {
    state.value = {
      kind: 'success',
      interpretation: 'Finding in non-clinical data',
      switchedTo: 'Non-clinical',
      removed: ['Diagnosis'],
    }
    const text = mountInput().find('.status').text()
    expect(text).toContain('Finding in non-clinical data')
    expect(text).toContain('Switched to Non-clinical.')
    expect(text).toContain('Diagnosis')
  })

  it('shows the interpretation with a hint when the text was not understood', () => {
    state.value = { kind: 'not-understood', interpretation: 'That is not a search.' }
    const w = mountInput()
    expect(w.find('.status').text()).toContain('That is not a search.')
    expect(w.find('.status').text()).toContain('Try naming a field')
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it.each([
    ['mixed-scope', 'mixes clinical-only and non-clinical-only'],
    ['error', 'could not be interpreted'],
  ] as const)('announces the %s state as an alert', (kind, expected) => {
    state.value = { kind }
    const alert = mountInput().find('[role="alert"]')
    expect(alert.text()).toContain(expected)
  })

  it('renders interpretation text as plain text, not HTML', () => {
    state.value = { kind: 'not-understood', interpretation: '<img src=x onerror=alert(1)>' }
    const w = mountInput()
    expect(w.find('.status img').exists()).toBe(false)
    expect(w.find('.status').text()).toContain('<img src=x')
  })

  it('dismisses the message with the dismiss button, which has an accessible name', async () => {
    state.value = { kind: 'error' }
    const w = mountInput()
    const button = w.find('.dismiss')
    expect(button.attributes('aria-label')).toBe('Dismiss message')
    await button.trigger('click')
    expect(hoisted.dismiss).toHaveBeenCalledTimes(1)
  })

  it('keeps the live region in the DOM when idle', () => {
    expect(mountInput().find('.status[aria-live="polite"]').exists()).toBe(true)
  })
})
