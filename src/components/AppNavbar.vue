<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
const loginUrl = import.meta.env.VITE_LOGIN_URL ?? '#'
const logoutUrl = import.meta.env.VITE_LOGOUT_URL ?? '#'
</script>

<template>
  <header class="app-navbar">
    <RouterLink
      :to="auth.isLoggedIn ? '/search' : '/'"
      aria-label="CSC Discovery home"
      class="app-logo-link"
    >
      <img src="@/assets/images/bg-logo.png" alt="CSC Discovery" class="app-logo" />
    </RouterLink>
    <nav class="app-nav" aria-label="Main navigation">
      <a v-if="!auth.isLoggedIn" :href="loginUrl">
        <c-button>Login</c-button>
      </a>
      <a v-else :href="logoutUrl">
        <c-button outlined>Logout</c-button>
      </a>
    </nav>
  </header>
</template>

<style scoped lang="scss">
.app-navbar {
  display: flex;
  position: relative;
  justify-content: flex-end;
  align-items: center;
  background-color: var(--color-white);
  padding: 0.75rem 1.5rem;
  overflow: visible;
}

.app-logo-link {
  position: absolute;
  top: 5%;
  left: 2.5%;
  z-index: 1;
  width: 220px;
}

.app-logo {
  display: block;
  width: 100%;
  height: auto;
}
</style>
