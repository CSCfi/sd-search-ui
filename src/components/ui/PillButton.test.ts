import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PillButton from './PillButton.vue'

describe('PillButton', () => {
  it('renders a button with type="button"', () => {
    const wrapper = mount(PillButton)
    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  it('applies the active modifier class when active', () => {
    const wrapper = mount(PillButton, { props: { active: true } })
    expect(wrapper.classes()).toContain('pill--active')
  })

  it('omits the active modifier class when not active', () => {
    const wrapper = mount(PillButton)
    expect(wrapper.classes()).not.toContain('pill--active')
  })

  it('passes role and aria-checked through to the button via attribute fallthrough', () => {
    const wrapper = mount(PillButton, {
      attrs: { role: 'radio', 'aria-checked': 'true' },
    })
    expect(wrapper.attributes('role')).toBe('radio')
    expect(wrapper.attributes('aria-checked')).toBe('true')
  })

  it('emits a native click that a parent @click handler receives', async () => {
    const onClick = vi.fn<() => void>()
    const wrapper = mount(PillButton, { attrs: { onClick } })
    await wrapper.trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
