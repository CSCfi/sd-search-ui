<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="not-found">
    <span class="code" aria-hidden="true">404</span>
    <h1 class="title">Page not found</h1>
    <RouterLink to="/" class="home-link">Go to home</RouterLink>
  </main>
</template>

<style scoped lang="scss">
.not-found {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  min-height: 60vh;
  text-align: center;
}

.code {
  color: var(--color-light-grey);
  font-weight: var(--font-weight-heading);
  font-size: 6rem;
  line-height: 1;
  letter-spacing: 0.05em;
}

.title {
  color: var(--color-text);
  font-weight: var(--font-weight-body);
  font-size: 1.25rem;
}

.home-link {
  margin-top: 1rem;
  color: var(--color-bright-blue);
  font-size: 0.9375rem;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
