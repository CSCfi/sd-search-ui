<script setup lang="ts">
defineProps<{ message: string }>()
defineEmits<{ dismiss: [] }>()
</script>

<template>
  <div role="alert" class="error-banner">
    <p class="error-message">{{ message }}</p>
    <button class="dismiss-btn" aria-label="Dismiss error" @click="$emit('dismiss')">✕</button>
  </div>
</template>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background-color: var(--color-pink);
  color: var(--color-white);
  padding: 0.75rem 1.25rem;
  border-radius: 0.25rem;
}

.error-message {
  margin: 0;
  font-weight: var(--font-weight-body);
}

.dismiss-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--color-white);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;

  &:hover {
    opacity: 0.8;
  }
}
</style>
