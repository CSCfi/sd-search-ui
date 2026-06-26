<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { ChevronDown, ChevronUp, RotateCcw } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import Badge from '@/components/ui/Badge.vue'
import FieldLabel from '@/components/ui/FieldLabel.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { useDropdown } from '@/composables/useDropdown'
import { useFieldValues } from '@/composables/useFieldValues'
import { useListKeyboardNav } from '@/composables/useListKeyboardNav'
import { useSuggestions } from '@/composables/useSuggestions'
import type { FieldValue } from '@/types/beacon.ts'

const props = defineProps<{
  label: string
  fieldId: string
  modelValue: string[]
  allowFreeText: boolean
  description?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:includeDescendantTerms': [value: boolean]
  'update:displayLabels': [labels: string[]]
}>()

const searchTerm = ref('')
const selectedItems = ref<FieldValue[]>([])
const includeDescendantTerms = ref(false)

const debouncedTerm = refDebounced(searchTerm, 500)

const triggerRef = useTemplateRef<HTMLButtonElement>('trigger')
const searchRef = useTemplateRef<HTMLInputElement>('search')
const listboxRef = useTemplateRef<HTMLElement>('listbox')

const { isOpen, containerRef, closeDropdown, toggleDropdown } = useDropdown({
  searchRef,
  triggerRef,
})

const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestions(
  props.fieldId,
  debouncedTerm,
)
const { data: valuesData, isLoading: valuesLoading } = useFieldValues(props.fieldId)

const listboxId = computed(() => `ontology-${props.fieldId}-listbox`)

const isLoading = computed(() =>
  searchTerm.value.length >= 2 ? suggestionsLoading.value : valuesLoading.value,
)

const rawItems = computed<FieldValue[]>(() => {
  if (searchTerm.value.length >= 2) {
    return suggestionsData.value ?? []
  }
  return valuesData.value ?? []
})

const filteredSuggestions = computed(() => {
  if (!props.allowFreeText) {
    return rawItems.value.filter((item) => item.concept_id !== null)
  }
  return rawItems.value
})

const itemCount = computed(() => filteredSuggestions.value.length)

const additionalCount = computed(() =>
  selectedItems.value.length > 1 ? selectedItems.value.length - 1 : 0,
)

const hasOntologyItems = computed(() => {
  return filteredSuggestions.value.some((item) => item.concept_id !== null)
})

function isSelected(item: FieldValue): boolean {
  const key = item.concept_id ?? item.value
  return selectedItems.value.some((s) => (s.concept_id ?? s.value) === key)
}

function toggleItem(item: FieldValue) {
  const key = item.concept_id ?? item.value
  const exists = selectedItems.value.some((s) => (s.concept_id ?? s.value) === key)

  if (exists) {
    selectedItems.value = selectedItems.value.filter((s) => (s.concept_id ?? s.value) !== key)
  } else {
    selectedItems.value.push(item)
    searchTerm.value = ''
  }

  emit(
    'update:displayLabels',
    selectedItems.value.map((s) => s.value),
  )
  emit(
    'update:modelValue',
    selectedItems.value.map((s) => s.concept_id ?? s.value),
  )
}

function onDescendantsChange(event: Event) {
  includeDescendantTerms.value = (event.target as HTMLInputElement).checked
  emit('update:includeDescendantTerms', includeDescendantTerms.value)
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
    const item = filteredSuggestions.value[index]
    if (item) toggleItem(item)
    return
  }
  navOptionKeydown(event, index)
}

watch(searchTerm, resetActiveIndex)

// Resolves selectedItems from an externally-set modelValue (e.g. URL query params
// via initFromUrl) when the picker mounts with a pre-filled value.
watch(
  [() => props.modelValue, valuesData],
  ([values]) => {
    if (values.length === 0) {
      selectedItems.value = []
      return
    }

    // Resolve only on first population — toggleItem owns updates after that.
    if (selectedItems.value.length > 0) return

    const data = valuesData.value
    if (!data) return

    selectedItems.value = values.map((v) => {
      const match = data.find((d) => (d.concept_id ?? d.value) === v)
      return match ?? { value: v, count: 0, concept_id: null }
    })
  },
  { immediate: true },
)
</script>

<template>
  <div ref="containerRef" class="ontology-picker">
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
        <template v-if="selectedItems.length > 0">
          <span class="selected-first">{{ selectedItems[0]?.value }}</span>
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
          aria-label="Search options"
          @keydown="onSearchKeydown"
        />
        <button
          v-if="searchTerm"
          type="button"
          class="reset-btn"
          aria-label="Clear search"
          @click="searchTerm = ''"
        >
          <RotateCcw :size="14" aria-hidden="true" />
        </button>
      </div>

      <LoadingSpinner v-if="isLoading" />

      <ul
        v-else
        :id="listboxId"
        ref="listbox"
        role="listbox"
        :aria-label="label"
        :aria-activedescendant="activeIndex >= 0 ? `${fieldId}-option-${activeIndex}` : undefined"
        aria-multiselectable="true"
        class="options-list"
      >
        <li
          v-for="(item, index) in filteredSuggestions"
          :key="item.concept_id ?? item.value"
          :id="`${fieldId}-option-${index}`"
          role="option"
          :aria-selected="isSelected(item)"
          class="option"
          :class="{ selected: isSelected(item) }"
          tabindex="-1"
          @click="toggleItem(item)"
          @keydown="onOptionKeydown($event, index)"
        >
          <span class="option-label">{{ item.value }}</span>
          <span v-if="item.count > 0" class="option-count">{{ item.count }}</span>
        </li>
        <li v-if="filteredSuggestions.length === 0 && searchTerm.length >= 2" class="no-options">
          No results found
        </li>
      </ul>

      <div v-if="hasOntologyItems" class="descendants-toggle">
        <label class="descendants-label">
          <input type="checkbox" :checked="includeDescendantTerms" @change="onDescendantsChange" />
          Include descendant terms
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ontology-picker {
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
  color: var(--color-text-secondary);
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
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.no-options {
  padding: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: 0.875rem;
  text-align: center;
}

.descendants-toggle {
  border-top: 1px solid var(--color-light-grey);
  padding: 0.5rem 0.75rem;
}

.descendants-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.8125rem;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: var(--color-dark-blue);
  }
}
</style>
