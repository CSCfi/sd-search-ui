<script setup lang="ts">
defineProps<{
  label: string
  fieldId: string
  modelValue: string[]
}>()

defineEmits<{
  'update:modelValue': [value: string[]]
}>()
</script>

<template>
  <div>{{ label }}</div>
</template>
