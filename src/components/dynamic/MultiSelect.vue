<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { ChevronDown, ChevronUp, RotateCcw } from '@lucide/vue'
import Badge from '@/components/ui/Badge.vue'
import FieldLabel from '@/components/ui/FieldLabel.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { useDropdown } from '@/composables/useDropdown'
import { useFieldValues } from '@/composables/useFieldValues'
import { useListKeyboardNav } from '@/composables/useListKeyboardNav'

const props = defineProps<{
  label: string
  fieldId: string
  modelValue: string[]
  description?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { data, isLoading } = useFieldValues(props.fieldId)

const searchTerm = ref('')
const triggerRef = useTemplateRef<HTMLButtonElement>('trigger')
const searchRef = useTemplateRef<HTMLInputElement>('search')
const listboxRef = useTemplateRef<HTMLElement>('listbox')

const { isOpen, containerRef, closeDropdown, toggleDropdown } = useDropdown({
  searchRef,
  triggerRef,
})

const listboxId = computed(() => `multiselect-${props.fieldId}-listbox`)

const displayValue = computed(() => (props.modelValue.length > 0 ? props.modelValue[0] : null))

const additionalCount = computed(() =>
  props.modelValue.length > 1 ? props.modelValue.length - 1 : 0,
)

const filteredItems = computed(() => {
  const items = data.value ?? []
  const term = searchTerm.value.toLowerCase()
  if (!term) return items
  return items.filter((item) => item.value.toLowerCase().includes(term))
})

const itemCount = computed(() => filteredItems.value.length)

function toggleItem(value: string) {
  const next = props.modelValue.includes(value)
    ? props.modelValue.filter((v) => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', next)
}

const {
  activeIndex,
  onSearchKeydown,
  onOptionKeydown: navOptionKeydown,
  resetActiveIndex,
} = useListKeyboardNav({
  isOpen,
  itemCount,
  listboxRef,
  searchRef,
  triggerRef,
  onClose: closeDropdown,
})

function onOptionKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const item = filteredItems.value[index]
    if (item) toggleItem(item.value)
    return
  }
  navOptionKeydown(event, index)
}

watch(searchTerm, resetActiveIndex)
</script>

<template>
  <div ref="containerRef" class="multiselect">
    <FieldLabel :field-id="fieldId" :label="label" :description="description" />
    <button
      :id="`${fieldId}-trigger`"
      ref="trigger"
      type="button"
      class="trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      @click="toggleDropdown"
    >
      <span class="trigger-value">
        <template v-if="displayValue">
          <span class="selected-first">{{ displayValue }}</span>
          <Badge v-if="additionalCount > 0" :count="additionalCount" />
        </template>
        <span v-else class="placeholder">All</span>
      </span>
      <ChevronDown v-if="!isOpen" :size="14" class="chevron" aria-hidden="true" />
      <ChevronUp v-else :size="14" class="chevron" aria-hidden="true" />
    </button>

    <div v-if="isOpen" class="dropdown">
      <div class="search-row">
        <input
          ref="search"
          v-model="searchTerm"
          type="text"
          class="search-input"
          placeholder="Search..."
          aria-label="Filter options"
          @keydown="onSearchKeydown"
        />
        <button
          v-if="searchTerm"
          type="button"
          class="reset-btn"
          aria-label="Clear filter"
          @click="searchTerm = ''"
        >
          <RotateCcw :size="14" aria-hidden="true" />
        </button>
      </div>

      <LoadingSpinner v-if="isLoading" />

      <ul
        v-else
        ref="listbox"
        :id="listboxId"
        role="listbox"
        :aria-label="label"
        aria-multiselectable="true"
        :aria-activedescendant="activeIndex >= 0 ? `${fieldId}-option-${activeIndex}` : undefined"
        class="options-list"
      >
        <li
          v-for="(item, index) in filteredItems"
          :key="item.value"
          :id="`${fieldId}-option-${index}`"
          role="option"
          :aria-selected="modelValue.includes(item.value)"
          class="option"
          :class="{ selected: modelValue.includes(item.value) }"
          tabindex="-1"
          @click="toggleItem(item.value)"
          @keydown="onOptionKeydown($event, index)"
        >
          <span class="option-label">{{ item.value }}</span>
          <span class="option-count">{{ item.count }}</span>
        </li>
        <li v-if="filteredItems.length === 0" role="option" aria-disabled="true" class="no-options">
          No options found
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.multiselect {
  position: relative;
  width: 100%;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: border-color 0.15s;
  cursor: pointer;
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  background: var(--color-surface);
  padding: 0.625rem 0.75rem;
  width: 100%;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: var(--font-family);
  text-align: left;

  &:hover {
    border-color: var(--color-bright-blue);
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.trigger-value {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.375rem;
  overflow: hidden;
}

.placeholder {
  opacity: 0.6;
}

.selected-first {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex-shrink: 0;
  opacity: 0.6;
  color: var(--color-text);
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  background: var(--color-white);
  min-width: 200px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border-bottom: 1px solid var(--color-light-grey);
  padding: 0.5rem;
}

.search-input {
  flex: 1;
  border: 1px solid var(--color-light-grey);
  border-radius: 3px;
  background: var(--color-white);
  padding: 0.375rem 0.5rem;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: var(--font-family);

  &:focus {
    outline: 2px solid var(--color-pink);
    outline-offset: 0;
  }
}

.reset-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: none;
  border-radius: 3px;
  background: transparent;
  padding: 0.375rem;
  color: var(--color-bright-blue);

  &:hover {
    background: var(--color-light-pink);
  }

  &:focus-visible {
    outline: 2px solid var(--color-bright-blue);
    outline-offset: 2px;
  }
}

.options-list {
  margin: 0;
  padding: 0.25rem 0;
  max-height: 240px;
  overflow-y: auto;
  list-style: none;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: var(--font-family);

  &::before {
    flex-shrink: 0;
    width: 1em;
    content: '';
  }

  &:hover {
    background: var(--color-light-pink);
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: -2px;
    background: var(--color-light-pink);
  }

  &.selected {
    background: var(--color-light-pink);
    color: var(--color-dark-blue);

    &::before {
      content: '✓';
    }
  }
}

.option-label {
  flex: 1;
}

.option-count {
  flex-shrink: 0;
  opacity: 0.6;
  font-size: 0.75rem;
}

.no-options {
  padding: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 0.875rem;
  text-align: center;
}
</style>
