<script setup lang="ts">
defineProps<{
  label: string
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <c-text-field
    v-control
    :value="modelValue"
    :label="label"
    :label-on-top="true"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<style lang="scss" scoped>
c-text-field {
  --c-text-field-background-color: var(--color-white);
  --c-text-field-text-color: var(--color-text);
  --c-text-field-label-color: var(--color-white);
  --c-text-field-placeholder-color: #9e9e9e;
  --c-text-field-active-color: var(--color-pink);
  --c-text-field-inactive-color: rgba(255, 255, 255, 0.6);
}
</style>
