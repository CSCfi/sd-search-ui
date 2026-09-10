import { computed, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { useListKeyboardNav } from './useListKeyboardNav'

describe('useListKeyboardNav', () => {
  let isOpen: Ref<boolean>
  let itemCount: Ref<number>
  let listboxEl: HTMLElement
  let searchEl: HTMLInputElement
  let onClose: Mock<(refocusTrigger: boolean) => void>
  let nav: ReturnType<typeof useListKeyboardNav>

  function makeOptions(count: number) {
    listboxEl.innerHTML = ''
    for (let i = 0; i < count; i++) {
      const opt = document.createElement('div')
      opt.setAttribute('role', 'option')
      opt.setAttribute('tabindex', '-1')
      listboxEl.appendChild(opt)
    }
  }

  function key(k: string): KeyboardEvent {
    return new KeyboardEvent('keydown', { key: k, bubbles: true })
  }

  beforeEach(() => {
    isOpen = ref<boolean>(true)
    itemCount = ref<number>(3)
    listboxEl = document.createElement('div')
    searchEl = document.createElement('input')
    document.body.appendChild(listboxEl)
    document.body.appendChild(searchEl)
    makeOptions(3)
    onClose = vi.fn<(refocusTrigger: boolean) => void>()
    nav = useListKeyboardNav({
      isOpen,
      itemCount: computed(() => itemCount.value),
      listboxRef: ref(listboxEl),
      searchRef: ref(searchEl),
      onClose,
    })
  })

  afterEach(() => {
    listboxEl.remove()
    searchEl.remove()
  })

  it('focuses the first option on ArrowDown from search when items exist', async () => {
    nav.onSearchKeydown(key('ArrowDown'))
    await nextTick()
    expect(nav.activeIndex.value).toBe(0)
    expect(document.activeElement).toBe(listboxEl.querySelectorAll('[role="option"]')[0])
  })

  it('does nothing on ArrowDown from search when item list is empty', async () => {
    itemCount.value = 0
    makeOptions(0)
    nav.onSearchKeydown(key('ArrowDown'))
    await nextTick()
    expect(nav.activeIndex.value).toBe(-1)
    expect(document.activeElement).not.toBe(listboxEl)
  })

  it('calls onClose(true) on Escape from search', () => {
    nav.onSearchKeydown(key('Escape'))
    expect(onClose).toHaveBeenCalledWith(true)
  })

  it('does not close the dropdown on Tab from search (focusout handles close)', () => {
    nav.onSearchKeydown(key('Tab'))
    expect(isOpen.value).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('focuses the next option on ArrowDown from an option', async () => {
    nav.onOptionKeydown(key('ArrowDown'), 0)
    await nextTick()
    expect(nav.activeIndex.value).toBe(1)
    expect(document.activeElement).toBe(listboxEl.querySelectorAll('[role="option"]')[1])
  })

  it('does nothing on ArrowDown from the last option', async () => {
    nav.activeIndex.value = 2
    nav.onOptionKeydown(key('ArrowDown'), 2) // index 2 = last of 3
    await nextTick()
    expect(nav.activeIndex.value).toBe(2)
  })

  it('focuses the previous option on ArrowUp from an option', async () => {
    nav.onOptionKeydown(key('ArrowUp'), 2)
    await nextTick()
    expect(nav.activeIndex.value).toBe(1)
    expect(document.activeElement).toBe(listboxEl.querySelectorAll('[role="option"]')[1])
  })

  it('returns focus to search and resets activeIndex on ArrowUp from the first option', async () => {
    nav.onOptionKeydown(key('ArrowUp'), 0)
    await nextTick()
    expect(nav.activeIndex.value).toBe(-1)
    expect(document.activeElement).toBe(searchEl)
  })

  it('calls onClose(true) on Escape from an option', () => {
    nav.onOptionKeydown(key('Escape'), 1)
    expect(onClose).toHaveBeenCalledWith(true)
  })

  it('does not close the dropdown on Tab from an option (focusout handles close)', () => {
    nav.onOptionKeydown(key('Tab'), 1)
    expect(isOpen.value).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('resets activeIndex to -1 when isOpen becomes false', async () => {
    nav.activeIndex.value = 1
    isOpen.value = false
    await nextTick()
    expect(nav.activeIndex.value).toBe(-1)
  })
})
