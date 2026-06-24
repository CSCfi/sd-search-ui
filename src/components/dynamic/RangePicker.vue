<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import { useDropdown } from '@/composables/useDropdown'

const props = defineProps<{
  label: string
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

type Unit = 'Y' | 'M' | 'W' | 'D'

const from = ref<number | null>(null)
const to = ref<number | null>(null)
const unit = ref<Unit | null>(null)

const unitOptions: { value: Unit; label: string }[] = [
  { value: 'Y', label: 'Years' },
  { value: 'M', label: 'Months' },
  { value: 'W', label: 'Weeks' },
  { value: 'D', label: 'Days' },
]

const instanceId = useId()
const fieldId = computed(
  () =>
    `${props.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${instanceId}`,
)
const fromId = computed(() => `${fieldId.value}-from`)
const toId = computed(() => `${fieldId.value}-to`)
const unitId = computed(() => `${fieldId.value}-unit`)
const hintId = computed(() => `${fieldId.value}-hint`)
const errorId = computed(() => `${fieldId.value}-error`)

const hasError = computed(() => from.value !== null && to.value !== null && from.value > to.value)

const triggerText = computed(() => {
  if (from.value === null || to.value === null || unit.value === null) return null
  if (hasError.value) return null
  const unitLabel = unitOptions.find((o) => o.value === unit.value)?.label ?? ''
  return `${from.value} – ${to.value} ${unitLabel}`
})

const triggerRef = useTemplateRef<HTMLButtonElement>('trigger')
const fromRef = useTemplateRef<HTMLInputElement>('fromInput')

const { isOpen, containerRef, closeDropdown, toggleDropdown } = useDropdown({
  searchRef: fromRef,
  triggerRef,
})

const RANGE_RE = /^P(\d+)([YMWD])-P(\d+)([YMWD])$/

// Sync external modelValue → internal from/to/unit state.
// Runs immediately on mount to populate fields if an initial value is provided.
// Also handles programmatic resets — when clearFilters() sets modelValue to '',
// this clears the internal fields so the UI reflects the reset.
watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      from.value = null
      to.value = null
      unit.value = null
      return
    }
    const m = val.match(RANGE_RE)
    if (!m) return
    from.value = Number(m[1])
    to.value = Number(m[3])
    unit.value = m[2] as Unit
  },
  { immediate: true },
)

function onFromInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '') {
    from.value = null
    return
  }
  const n = Number(raw)
  from.value = Number.isFinite(n) ? n : null
}

function onToInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  if (raw === '') {
    to.value = null
    return
  }
  const n = Number(raw)
  to.value = Number.isFinite(n) ? n : null
}

function onUnitChange(event: Event) {
  unit.value = (event.target as HTMLSelectElement).value as Unit
}

// Sync internal from/to/unit state → emit update:modelValue.
// Emits a valid ISO 8601 range string (e.g. "P40Y-P50Y") only when all three
// fields are set and from <= to. Emits '' in all other cases so the parent
// store removes this filter entirely.
watch([from, to, unit], () => {
  if (from.value === null || to.value === null || unit.value === null) {
    if (props.modelValue !== '') {
      emit('update:modelValue', '')
    }
    return
  }
  if (from.value > to.value) {
    if (props.modelValue !== '') {
      emit('update:modelValue', '')
    }
    return
  }
  const newVal = `P${from.value}${unit.value}-P${to.value}${unit.value}`
  if (props.modelValue !== newVal) {
    emit('update:modelValue', newVal)
  }
})
</script>

<template>
  <div ref="containerRef" class="range-picker">
    <label :for="`${fieldId}-trigger`" class="field-label">{{ label }}</label>
    <button
      :id="`${fieldId}-trigger`"
      ref="trigger"
      type="button"
      class="trigger"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-controls="`${fieldId}-popup`"
      @click="toggleDropdown"
    >
      <span class="trigger-value">
        <span v-if="triggerText" class="selected-first">{{ triggerText }}</span>
        <span v-else class="placeholder">All</span>
      </span>
      <ChevronDown v-if="!isOpen" :size="14" class="chevron" aria-hidden="true" />
      <ChevronUp v-else :size="14" class="chevron" aria-hidden="true" />
    </button>

    <div v-if="isOpen" :id="`${fieldId}-popup`" class="dropdown">
      <div
        class="range-content"
        role="group"
        :aria-labelledby="`${fieldId}-legend`"
        @keydown.esc="closeDropdown()"
      >
        <span :id="`${fieldId}-legend`" class="visually-hidden">{{ label }} range</span>

        <div class="inputs-row">
          <div class="input-group">
            <label :for="fromId" class="input-label">From</label>
            <input
              :id="fromId"
              ref="fromInput"
              type="number"
              min="0"
              class="number-input"
              :class="{ error: hasError }"
              :aria-describedby="`${hintId}${hasError ? ' ' + errorId : ''}`"
              :value="from ?? ''"
              @input="onFromInput"
              @keydown.esc="closeDropdown()"
            />
          </div>

          <div class="input-group">
            <label :for="toId" class="input-label">To</label>
            <input
              :id="toId"
              type="number"
              min="0"
              class="number-input"
              :class="{ error: hasError }"
              :aria-describedby="`${hintId}${hasError ? ' ' + errorId : ''}`"
              :value="to ?? ''"
              @input="onToInput"
              @keydown.esc="closeDropdown()"
            />
          </div>

          <div class="input-group">
            <label :for="unitId" class="input-label">Unit</label>
            <select
              :id="unitId"
              class="unit-select"
              :value="unit ?? ''"
              @change="onUnitChange"
              @keydown.esc="closeDropdown()"
            >
              <option value="" disabled>Select</option>
              <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <span :id="hintId" class="visually-hidden">From must be less than or equal to To</span>

        <span v-if="hasError" :id="errorId" role="alert" class="error-message">
          From must be less than or equal to To
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.range-picker {
  position: relative;
  width: 100%;
}

.field-label {
  display: block;
  opacity: 0.8;
  cursor: default;
  margin-bottom: 0.25rem;
  color: var(--color-white);
  font-weight: var(--font-weight-subheading);
  font-size: 0.75rem;
  white-space: nowrap;
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

.range-content {
  padding: 0.75rem;
}

.inputs-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.25rem;
}

.input-label {
  opacity: 0.7;
  color: var(--color-text);
  font-weight: var(--font-weight-body);
  font-size: 0.6875rem;
}

.number-input,
.unit-select {
  transition: border-color 0.15s;
  box-sizing: border-box;
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  background: var(--color-white);
  padding: 0.5rem;
  width: 100%;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: var(--font-family);

  &:hover {
    border-color: var(--color-bright-blue);
  }

  &:focus {
    outline: 2px solid var(--color-pink);
    outline-offset: 0;
  }

  &.error {
    border-color: var(--color-pink);
  }
}

.unit-select {
  appearance: auto;
  cursor: pointer;
}

.error-message {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-pink);
  font-weight: var(--font-weight-body);
  font-size: 0.75rem;
}

.visually-hidden {
  clip: rect(0 0 0 0);
  position: absolute;
  clip-path: inset(50%);
  width: 1px;
  height: 1px;
  overflow: hidden;
  white-space: nowrap;
}
</style>
