<script setup lang="ts">
import { Loader } from '@lucide/vue'

withDefaults(defineProps<{ size?: number }>(), { size: 16 })
</script>

<template>
  <div class="loading" aria-live="polite">
    <Loader :size="size" class="spinner" aria-hidden="true" />
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  justify-content: center;
  padding: 1rem;
  color: var(--color-dark-blue);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}
</style>
