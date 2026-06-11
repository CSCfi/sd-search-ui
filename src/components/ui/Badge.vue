<script setup lang="ts">
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
  background: var(--color-pink);
  color: var(--color-white);
  font-size: 0.75rem;
  line-height: 1;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
}
</style>
