<script setup lang="ts">
import FieldLabel from '@/components/ui/FieldLabel.vue'

defineProps<{
  label: string
  fieldId: string
  modelValue: string
  description?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="textfield">
    <FieldLabel :field-id="fieldId" :label="label" :description="description" />
    <input
      :id="`${fieldId}-trigger`"
      type="text"
      class="input"
      placeholder="Search..."
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<style scoped lang="scss">
.textfield {
  position: relative;
  width: 100%;
}

.input {
  display: block;
  transition: border-color 0.15s;
  box-sizing: border-box;
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  background: var(--color-surface);
  padding: 0.625rem 0.75rem;
  width: 100%;
  color: var(--color-text);
  font-size: 0.875rem;
  font-family: var(--font-family);

  &::placeholder {
    opacity: 0.5;
  }

  &:hover {
    border-color: var(--color-bright-blue);
  }

  &:focus {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }
}
</style>
