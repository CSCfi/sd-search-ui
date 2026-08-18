<script setup lang="ts">
import type { BeaconFilteringQualifier } from '@/types/beacon'
import PillButton from '@/components/ui/PillButton.vue'
import FieldInfoTooltip from '@/components/ui/FieldInfoTooltip.vue'

const props = defineProps<{
  qualifiers: BeaconFilteringQualifier[]
  selected: Record<string, string>
}>()

const emit = defineEmits<{ change: [qualifierId: string, value: string] }>()

// Backend qualifier values are plain strings with no display label, so the label
// is derived. Underscores are separators in `DatasetType` values, so treat them
// as word breaks here too.
const displayLabel = (value: string) =>
  value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

// ARIA radio-group keyboard behaviour: arrow keys move selection and DOM focus
// between pills in the same group (roving tabindex — see :tabindex in the template).
// Mirrors the pattern in FilterTabGroup.vue's onTabKeydown.
function onQualifierKeydown(event: KeyboardEvent, qualifierId: string, values: string[]) {
  const options = ['all', ...values]
  const currentValue = props.selected[qualifierId] || 'all'
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
  emit('change', qualifierId, next)

  const container = event.currentTarget as HTMLElement
  const buttons = container.querySelectorAll<HTMLButtonElement>('[role="radio"]')
  buttons[nextIndex]?.focus()
}
</script>

<template>
  <div class="qualifier-selector">
    <div v-for="qualifier in qualifiers" :key="qualifier.id" class="qualifier-group">
      <div class="qualifier-label-row">
        <span :id="`qualifier-label-${qualifier.id}`" class="qualifier-label">
          {{ qualifier.label }}
        </span>
        <FieldInfoTooltip
          v-if="qualifier.description"
          :field-id="`qualifier-${qualifier.id}`"
          :description="qualifier.description"
        />
      </div>
      <div
        class="qualifier-pills"
        role="radiogroup"
        :aria-labelledby="`qualifier-label-${qualifier.id}`"
        @keydown="onQualifierKeydown($event, qualifier.id, qualifier.values)"
      >
        <PillButton
          role="radio"
          :tabindex="!selected[qualifier.id] ? 0 : -1"
          :active="!selected[qualifier.id]"
          :aria-checked="!selected[qualifier.id]"
          @click="emit('change', qualifier.id, 'all')"
        >
          All
        </PillButton>
        <PillButton
          v-for="value in qualifier.values"
          :key="value"
          role="radio"
          :tabindex="selected[qualifier.id] === value ? 0 : -1"
          :active="selected[qualifier.id] === value"
          :aria-checked="selected[qualifier.id] === value"
          @click="emit('change', qualifier.id, value)"
        >
          {{ displayLabel(value) }}
        </PillButton>
      </div>
      <p class="qualifier-hint">Applies to diagnosis and finding filters.</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.qualifier-group + .qualifier-group {
  margin-top: 1.25rem;
}

.qualifier-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.qualifier-label-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.qualifier-label {
  color: var(--color-white);
  font-weight: var(--font-weight-subheading);
  font-size: 1rem;
}

.qualifier-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.qualifier-hint {
  margin: 0.5rem 0 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8125rem;
}
</style>
