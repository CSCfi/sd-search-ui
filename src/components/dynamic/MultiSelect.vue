<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { ChevronDown, ChevronUp, RotateCcw } from '@lucide/vue'
import Badge from '@/components/ui/Badge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { useDropdown } from '@/composables/useDropdown'
import { useFieldValues } from '@/composables/useFieldValues'
import { useListKeyboardNav } from '@/composables/useListKeyboardNav'

const props = defineProps<{
  label: string
  fieldId: string
  modelValue: string[]
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
  const term = searchTerm.value.toLowerCase()
  if (!term) return data.value
  return data.value.filter((item) => item.value.toLowerCase().includes(term))
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
    <label :id="`${fieldId}-label`" class="field-label">{{ label }}</label>
    <button
      :id="`${fieldId}-trigger`"
      ref="trigger"
      type="button"
      class="trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      :aria-labelledby="`${fieldId}-label`"
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
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-family);
  font-size: 0.875rem;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--color-bright-blue);
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}

.field-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  font-weight: var(--font-weight-subheading);
  color: var(--color-white);
  opacity: 0.8;
  white-space: nowrap;
  cursor: default;
}

.trigger-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  overflow: hidden;
}

.placeholder {
  opacity: 0.6;
}

.selected-first {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron {
  flex-shrink: 0;
  color: var(--color-text);
  opacity: 0.6;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--color-white);
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  min-width: 200px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--color-light-grey);
}

.search-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--color-light-grey);
  border-radius: 3px;
  font-size: 0.875rem;
  font-family: var(--font-family);
  color: var(--color-text);
  background: var(--color-white);

  &:focus {
    outline: 2px solid var(--color-pink);
    outline-offset: 0;
  }
}

.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-bright-blue);
  border-radius: 3px;

  &:hover {
    background: var(--color-light-pink);
  }

  &:focus-visible {
    outline: 2px solid var(--color-bright-blue);
    outline-offset: 2px;
  }
}

.options-list {
  list-style: none;
  margin: 0;
  padding: 0.25rem 0;
  max-height: 240px;
  overflow-y: auto;
}

.option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: var(--font-family);

  &::before {
    content: '';
    width: 1em;
    flex-shrink: 0;
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
  font-size: 0.75rem;
  opacity: 0.6;
  flex-shrink: 0;
}

.no-options {
  padding: 0.75rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  font-style: italic;
}
</style>
