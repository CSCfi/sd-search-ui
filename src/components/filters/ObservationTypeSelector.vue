<script setup lang="ts">
import type { BeaconFilteringTerm } from '@/types/beacon'
import PillButton from '@/components/ui/PillButton.vue'
import FieldInfoTooltip from '@/components/ui/FieldInfoTooltip.vue'
import { useSearchStore } from '@/stores/searchStore'

const props = defineProps<{
  field: BeaconFilteringTerm
  selected: string | null
}>()

const store = useSearchStore()

// Convert backend snake_case values to display labels.
const displayLabel = (value: string) =>
  value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

// "All" means no observation_type filter is sent to the backend — it is not a value,
// just the absence of one.
function selectAll() {
  store.removeFilters([props.field.id])
}

function selectValue(value: string) {
  store.setFilter(props.field.id, value)
}

// ARIA radio-group keyboard behaviour: arrow keys move selection and DOM focus
// between pills (roving tabindex). Mirrors the pattern in FilterTabGroup.vue.
function onKeydown(event: KeyboardEvent) {
  const values = props.field.controlledValues ?? []
  const options = ['all', ...values]
  const currentValue = props.selected ?? 'all'
  const currentIndex = options.indexOf(currentValue)

  let nextIndex: number | null = null
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % options.length
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + options.length) % options.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = options.length - 1
  } else {
    return
  }

  event.preventDefault()
  const next = options[nextIndex]
  if (next === undefined) return
  if (next === 'all') {
    selectAll()
  } else {
    selectValue(next)
  }

  const container = event.currentTarget as HTMLElement
  const buttons = container.querySelectorAll<HTMLButtonElement>('[role="radio"]')
  buttons[nextIndex]?.focus()
}
</script>

<template>
  <div class="observation-type-selector">
    <div class="label-row">
      <span :id="`obs-label-${field.id}`" class="field-label">
        {{ field.label }}
      </span>
      <FieldInfoTooltip
        v-if="field.description"
        :field-id="`obs-${field.id}`"
        :description="field.description"
      />
    </div>
    <div
      class="pills"
      role="radiogroup"
      :aria-labelledby="`obs-label-${field.id}`"
      @keydown="onKeydown"
    >
      <PillButton
        role="radio"
        :tabindex="selected === null ? 0 : -1"
        :active="selected === null"
        :aria-checked="selected === null"
        @click="selectAll"
      >
        All
      </PillButton>
      <PillButton
        v-for="value in field.controlledValues"
        :key="value"
        role="radio"
        :tabindex="selected === value ? 0 : -1"
        :active="selected === value"
        :aria-checked="selected === value"
        @click="selectValue(value)"
      >
        {{ displayLabel(value) }}
      </PillButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.observation-type-selector {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.label-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.field-label {
  color: var(--color-white);
  font-weight: var(--font-weight-subheading);
  font-size: 1rem;
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
