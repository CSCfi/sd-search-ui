import { nextTick, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'

interface UseListKeyboardNavOptions {
  isOpen: Ref<boolean>
  itemCount: ComputedRef<number>
  listboxRef: Readonly<Ref<HTMLElement | null>>
  searchRef: Readonly<Ref<HTMLInputElement | null>>
  triggerRef?: Readonly<Ref<HTMLButtonElement | null>>
  onClose: (refocusTrigger: boolean) => void
}

interface UseListKeyboardNavReturn {
  activeIndex: Ref<number>
  onSearchKeydown: (event: KeyboardEvent) => void
  onOptionKeydown: (event: KeyboardEvent, index: number) => void
  resetActiveIndex: () => void
}

export function useListKeyboardNav(options: UseListKeyboardNavOptions): UseListKeyboardNavReturn {
  const { isOpen, itemCount, listboxRef, searchRef, onClose } = options

  const activeIndex = ref(-1)

  function resetActiveIndex() {
    activeIndex.value = -1
  }

  // Reset when dropdown closes regardless of how it was closed
  watch(isOpen, (open) => {
    if (!open) activeIndex.value = -1
  })

  function focusOption(index: number) {
    nextTick(() => {
      const opts = listboxRef.value?.querySelectorAll<HTMLElement>('[role="option"]')
      opts?.[index]?.focus()
    })
  }

  function onSearchKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (itemCount.value > 0) {
          activeIndex.value = 0
          focusOption(0)
        }
        break
      case 'Escape':
        onClose(true)
        break
      case 'Tab':
        isOpen.value = false
        break
    }
  }

  function onOptionKeydown(event: KeyboardEvent, index: number) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (index < itemCount.value - 1) {
          activeIndex.value = index + 1
          focusOption(index + 1)
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (index === 0) {
          activeIndex.value = -1
          nextTick(() => searchRef.value?.focus())
        } else {
          activeIndex.value = index - 1
          focusOption(index - 1)
        }
        break
      case 'Escape':
        onClose(true)
        break
      case 'Tab':
        isOpen.value = false
        break
    }
  }

  return { activeIndex, onSearchKeydown, onOptionKeydown, resetActiveIndex }
}
