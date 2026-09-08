<script setup lang="ts">
import { computed } from 'vue'
import type { BeaconFilteringQualifier } from '@/types/beacon'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import FieldInfoTooltip from '@/components/ui/FieldInfoTooltip.vue'

const props = defineProps<{
  qualifier: BeaconFilteringQualifier
  selected: string | undefined
}>()

const emit = defineEmits<{ change: [qualifierId: string, value: string] }>()

const isConfirmed = computed(() => props.selected === 'confirmed')

function toggle(checked: boolean) {
  emit('change', props.qualifier.id, checked ? 'confirmed' : 'all')
}
</script>

<template>
  <div class="observation-type-toggle">
    <div class="toggle-row">
      <div class="label-row">
        <span :id="`obs-label-${qualifier.id}`" class="field-label">
          {{ qualifier.label }}
        </span>
        <FieldInfoTooltip
          v-if="qualifier.description"
          :field-id="`obs-${qualifier.id}`"
          :description="qualifier.description"
        />
      </div>
      <div class="toggle-with-labels">
        <span class="side-label" :class="{ 'side-label--dim': isConfirmed }">All</span>
        <ToggleSwitch
          :input-id="`obs-toggle-${qualifier.id}`"
          :model-value="isConfirmed"
          :aria-labelledby="`obs-label-${qualifier.id}`"
          @update:model-value="toggle"
        />
        <span class="side-label" :class="{ 'side-label--dim': !isConfirmed }">Confirmed</span>
      </div>
    </div>
    <p class="qualifier-hint">Applies to diagnosis and finding filters.</p>
  </div>
</template>

<style scoped lang="scss">
.observation-type-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toggle-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.label-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.field-label {
  color: var(--color-white);
  font-weight: var(--font-weight-heading);
  font-size: 1rem;
  letter-spacing: 0.15em;
}

.toggle-with-labels {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.side-label {
  transition: opacity 0.15s ease;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.875rem;
  user-select: none;

  &--dim {
    opacity: 0.4;
  }
}

.qualifier-hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8125rem;
}
</style>
