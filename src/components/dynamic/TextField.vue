<script setup lang="ts">
const props = defineProps<{
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
  margin-bottom: 0.25rem;
  font-size: 0.75rem;
  font-weight: var(--font-weight-subheading);
  color: var(--color-white);
  opacity: 0.8;
  white-space: nowrap;
  cursor: default;
}

.input {
  display: block;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-light-grey);
  border-radius: 4px;
  color: var(--color-text);
  font-family: var(--font-family);
  font-size: 0.875rem;
  transition: border-color 0.15s;
  box-sizing: border-box;

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
