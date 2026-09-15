import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'

interface UseDropdownOptions {
  searchRef: Readonly<Ref<HTMLInputElement | null>>
  triggerRef: Readonly<Ref<HTMLButtonElement | null>>
}

interface UseDropdownReturn {
  isOpen: Ref<boolean>
  containerRef: Ref<HTMLElement | null>
  openDropdown: () => void
  closeDropdown: (refocusTrigger?: boolean) => void
  toggleDropdown: () => void
}

export function useDropdown({ searchRef, triggerRef }: UseDropdownOptions): UseDropdownReturn {
  const isOpen = ref(false)
  const containerRef = ref<HTMLElement | null>(null)

  function openDropdown() {
    isOpen.value = true
    void nextTick(() => searchRef.value?.focus())
  }

  function closeDropdown(refocusTrigger = true) {
    isOpen.value = false
    if (refocusTrigger) {
      void nextTick(() => triggerRef.value?.focus())
    }
  }

  function toggleDropdown() {
    if (isOpen.value) {
      closeDropdown()
    } else {
      openDropdown()
    }
  }

  onClickOutside(containerRef, () => closeDropdown(false))

  useEventListener(containerRef, 'focusout', (e: FocusEvent) => {
    if (!containerRef.value?.contains(e.relatedTarget as Node)) {
      closeDropdown(false)
    }
  })

  return { isOpen, containerRef, openDropdown, closeDropdown, toggleDropdown }
}
