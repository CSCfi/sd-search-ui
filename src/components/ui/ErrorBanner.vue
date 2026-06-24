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
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border-radius: 0.25rem;
  background-color: var(--color-pink);
  padding: 0.75rem 1.25rem;
  color: var(--color-white);
}

.error-message {
  margin: 0;
  font-weight: var(--font-weight-body);
}

.dismiss-btn {
  flex-shrink: 0;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0.25rem;
  color: var(--color-white);
  font-size: 1rem;
  line-height: 1;

  &:hover {
    opacity: 0.8;
  }
}
</style>
