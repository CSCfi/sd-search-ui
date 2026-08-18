<script setup lang="ts">
defineProps<{ active?: boolean }>()
</script>

<template>
  <button type="button" class="pill" :class="{ 'pill--active': active }">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.pill {
  transition:
    background-color 0.15s,
    border-color 0.15s,
    color 0.15s;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 9999px;
  background-color: transparent;
  padding: 0.375rem 0.875rem;
  color: rgba(255, 255, 255, 0.75);
  font-weight: var(--font-weight-body);
  font-size: 0.8125rem;
  line-height: 1.2;
  font-family: var(--font-family);
  white-space: nowrap;

  &:hover:not(.pill--active) {
    border-color: rgba(255, 255, 255, 0.45);
    color: var(--color-white);
  }

  &:focus-visible {
    outline: 2px solid var(--color-pink);
    outline-offset: 2px;
  }

  &.pill--active {
    border-color: var(--color-pink);
    background-color: var(--color-pink);
    color: var(--color-white);
  }
}
</style>
