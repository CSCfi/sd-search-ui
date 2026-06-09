<script setup lang="ts">
defineProps<{
  label: string
  fieldId: string
  modelValue: string[]
  allowFreeText: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string[]]
  'update:includeDescendantTerms': [value: boolean]
}>()
</script>

<template>
  <div>{{ label }}</div>
</template>
