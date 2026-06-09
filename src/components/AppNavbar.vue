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
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0.75rem 1.5rem;
  position: relative;
  overflow: visible;
}

.app-logo-link {
  position: absolute;
  top: 5%;
  left: 2.5%;
  width: 220px;
  z-index: 1;
}

.app-logo {
  width: 100%;
  height: auto;
  display: block;
}
</style>
