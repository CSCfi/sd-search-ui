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
