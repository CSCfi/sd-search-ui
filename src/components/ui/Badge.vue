<script setup lang="ts">
defineOptions({ name: 'SelectionBadge' })

defineProps<{
  count: number
}>()
</script>

<template>
  <span class="badge">+{{ count }}</span>
</template>

<style scoped>
.badge {
  flex-shrink: 0;
  border-radius: 9999px;
  background: var(--color-pink);
  padding: 0.125rem 0.375rem;
  color: var(--color-white);
  font-size: 0.75rem;
  line-height: 1;
}
</style>
