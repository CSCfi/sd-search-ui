<script setup lang="ts">
defineProps<{
  label: string
  fieldId: string
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="textfield">
    <label :for="fieldId" class="field-label">{{ label }}</label>
    <input
      :id="fieldId"
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
