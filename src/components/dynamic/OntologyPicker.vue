<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { ChevronDown, ChevronUp, RotateCcw } from '@lucide/vue'
import Badge from '@/components/ui/Badge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { useDropdown } from '@/composables/useDropdown'
import { useFieldValues } from '@/composables/useFieldValues'
import { useListKeyboardNav } from '@/composables/useListKeyboardNav'
import { useSuggestions } from '@/composables/useSuggestions'

interface PickerItem {
  term: string
  concept_id: string | null
  count?: number
}

const props = defineProps<{
  label: string
  fieldId: string
  modelValue: string[]
  allowFreeText: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:includeDescendantTerms': [value: boolean]
}>()

const searchTerm = ref('')
const selectedItems = ref<PickerItem[]>([])
const includeDescendantTerms = ref(true)

const triggerRef = useTemplateRef<HTMLButtonElement>('trigger')
const searchRef = useTemplateRef<HTMLInputElement>('search')
const listboxRef = useTemplateRef<HTMLElement>('listbox')

const { isOpen, containerRef, closeDropdown, toggleDropdown } = useDropdown({
  searchRef,
  triggerRef,
})

const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestions(
  props.fieldId,
  searchTerm,
)
const { data: valuesData, isLoading: valuesLoading } = useFieldValues(props.fieldId)

const listboxId = computed(() => `ontology-${props.fieldId}-listbox`)

const isLoading = computed(() =>
  searchTerm.value.length >= 2 ? suggestionsLoading.value : valuesLoading.value,
)

const rawItems = computed<PickerItem[]>(() => {
  if (searchTerm.value.length >= 2) return suggestionsData.value
  return valuesData.value.map((item) => ({
    term: item.value,
    count: item.count,
    concept_id: item.concept_id,
  }))
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

function isSelected(item: PickerItem): boolean {
  const key = item.concept_id ?? item.term
  return selectedItems.value.some((s) => (s.concept_id ?? s.term) === key)
}

function toggleItem(item: PickerItem) {
  const key = item.concept_id ?? item.term
  const exists = selectedItems.value.some((s) => (s.concept_id ?? s.term) === key)

  if (exists) {
    selectedItems.value = selectedItems.value.filter((s) => (s.concept_id ?? s.term) !== key)
  } else {
    selectedItems.value.push(item)
    searchTerm.value = ''
  }

  emit(
    'update:modelValue',
    selectedItems.value.map((s) => s.concept_id ?? s.term),
  )
}

function onDescendantsChange(event: Event) {
  includeDescendantTerms.value = (event.target as HTMLInputElement).checked
  emit('update:includeDescendantTerms', includeDescendantTerms.value)
}

const {
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

watch(
  () => props.modelValue,
  (values) => {
    if (values.length === 0) selectedItems.value = []
  },
)
</script>

<template>
  <div ref="containerRef" class="ontology-picker">
    <label :for="`${fieldId}-trigger`" class="field-label">{{ label }}</label>
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
          <span class="selected-first">{{ selectedItems[0]?.term }}</span>
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
          role="combobox"
          :aria-expanded="isOpen"
          aria-autocomplete="list"
          :aria-controls="listboxId"
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
        aria-multiselectable="true"
        class="options-list"
      >
        <li
          v-for="(item, index) in filteredSuggestions"
          :key="item.concept_id ?? item.term"
          :id="`${fieldId}-option-${index}`"
          role="option"
          :aria-selected="isSelected(item)"
          class="option"
          :class="{ selected: isSelected(item) }"
          tabindex="-1"
          @click="toggleItem(item)"
          @keydown="onOptionKeydown($event, index)"
        >
          <span class="option-label">{{ item.term }}</span>
          <span v-if="item.count !== undefined" class="option-count">{{ item.count }}</span>
        </li>
        <li v-if="filteredSuggestions.length === 0 && searchTerm.length >= 2" class="no-options">
          No results found
        </li>
      </ul>

      <div class="descendants-toggle">
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

.descendants-toggle {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--color-light-grey);
}

.descendants-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  cursor: pointer;

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: var(--color-dark-blue);
  }
}
</style>
