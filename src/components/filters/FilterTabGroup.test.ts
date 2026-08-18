import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterTabGroup from './FilterTabGroup.vue'
import type { BeaconFilteringScope } from '@/types/beacon'

const SCOPES: BeaconFilteringScope[] = [
  { id: 'clinical', label: 'Clinical', description: '' },
  { id: 'non_clinical', label: 'Non-clinical', description: '' },
]

function mountGroup(slots: Record<string, string> = {}) {
  return mount(FilterTabGroup, {
    props: { modelValue: 'all', scopes: SCOPES },
    slots,
  })
}

describe('FilterTabGroup — header slot', () => {
  it('renders no header wrapper when no header slot is passed', () => {
    const wrapper = mountGroup({ default: '<div class="panel-content" />' })
    expect(wrapper.find('.tab-header').exists()).toBe(false)
  })

  it('renders header slot content inside the header wrapper, above the tab strip', () => {
    const wrapper = mountGroup({
      header: '<div class="header-content">header</div>',
      default: '<div class="panel-content" />',
    })
    const header = wrapper.find('.tab-header')
    expect(header.exists()).toBe(true)
    expect(header.find('.header-content').exists()).toBe(true)

    // Header must precede the tab strip in DOM order, not just exist somewhere in the tree.
    const children = [...wrapper.element.children]
    const headerIndex = children.findIndex((el) => el.classList.contains('tab-header'))
    const stripIndex = children.findIndex((el) => el.classList.contains('tab-strip'))
    expect(headerIndex).toBeGreaterThanOrEqual(0)
    expect(headerIndex).toBeLessThan(stripIndex)
  })
})
