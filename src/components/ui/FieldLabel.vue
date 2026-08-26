<script setup lang="ts">
import FieldInfoTooltip from './FieldInfoTooltip.vue'
import { fieldsConfig } from '@/services/config'

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
      v-if="description && !fieldsConfig.hidden_description.includes(fieldId)"
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
