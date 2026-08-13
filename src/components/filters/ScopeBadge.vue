<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ scopeId: string }>()

// Derived from the id, not a lookup table, so a scope added in the backend gets a
// correctly formatted badge without a frontend change.
const label = computed(() => `${props.scopeId.replace(/_/g, '-').toUpperCase()} ONLY`)
</script>

<template>
  <span class="scope-badge" :class="`scope-badge--${scopeId}`">{{ label }}</span>
</template>

<style scoped lang="scss">
.scope-badge {
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.12);
  padding: 0.1875rem 0.5rem;
  color: rgba(255, 255, 255, 0.85);
  font-weight: var(--font-weight-body);
  font-size: 0.6875rem;
  line-height: 1.2;
  letter-spacing: 0.08em;
  white-space: nowrap;

  // Per-scope colours mirror the active tab colours in FilterTabGroup. A scope id with no
  // rule here keeps the neutral pill above, so a new backend scope still renders correctly.
  &.scope-badge--clinical {
    border-color: rgb(var(--color-scope-clinical-rgb) / 0.5);
    background-color: rgb(var(--color-scope-clinical-rgb) / 0.15);
    color: rgb(var(--color-scope-clinical-light-rgb));
  }

  &.scope-badge--non_clinical {
    border-color: rgb(var(--color-scope-non-clinical-rgb) / 0.55);
    background-color: rgb(var(--color-scope-non-clinical-rgb) / 0.15);
    color: rgb(var(--color-scope-non-clinical-light-rgb));
  }
}
</style>
