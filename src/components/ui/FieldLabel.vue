<script setup lang="ts">
import FieldInfoTooltip from './FieldInfoTooltip.vue'

const HIDDEN_DESCRIPTION_FIELD_IDS: string[] = ['dataset_description']

defineProps<{
  fieldId: string
  label: string
  description?: string
}>()
</script>

<template>
  <div class="field-label-row">
    <label :for="`${fieldId}-trigger`" class="field-label">{{ label }}</label>
    <FieldInfoTooltip
      v-if="description && !HIDDEN_DESCRIPTION_FIELD_IDS.includes(fieldId)"
      :field-id="fieldId"
      :description="description"
    />
  </div>
</template>

<style scoped lang="scss">
.field-label-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 0.25rem;
}

.field-label {
  display: block;
  opacity: 0.8;
  cursor: default;
  color: var(--color-white);
  font-weight: var(--font-weight-subheading);
  font-size: 1rem;
  white-space: nowrap;
}
</style>
