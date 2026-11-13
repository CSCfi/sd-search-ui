<script setup lang="ts">
import { ref } from 'vue'
import { CircleHelp } from '@lucide/vue'
import { useAuthStore } from '@/stores/authStore'
import { useContentConfig } from '@/composables/ui/useContentConfig'
import HelpSidebar from '@/components/HelpSidebar.vue'
import { logoutSession } from '@/services/sessionRefresh'

const auth = useAuthStore()
const { navLogo } = useContentConfig()
const helpOpen = ref(false)
const loggingOut = ref(false)

// Revokes the refresh token, then navigates to /logout. The page unloads, so the flag is not reset.
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  await logoutSession()
}
</script>

<template>
  <header class="app-navbar">
    <RouterLink
      :to="auth.isLoggedIn ? '/search' : '/'"
      aria-label="CSC Discovery home"
      class="app-logo-link"
    >
      <img :src="navLogo.src" :alt="navLogo.alt" class="app-logo" />
    </RouterLink>
    <nav class="app-nav" aria-label="Main navigation">
      <button
        v-if="auth.isLoggedIn"
        class="btn-help"
        aria-label="Search help"
        :aria-expanded="helpOpen"
        @click="helpOpen = !helpOpen"
      >
        <CircleHelp :size="22" aria-hidden="true" />
        Help
      </button>
      <a v-if="!auth.isLoggedIn" href="/login">
        <c-button>Login</c-button>
      </a>
      <c-button v-else outlined :disabled="loggingOut" @click="logout">Logout</c-button>
    </nav>
    <HelpSidebar :open="helpOpen" @close="helpOpen = false" />
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

.app-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-help {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.15s;
  cursor: pointer;
  border: none;
  border-radius: 2rem;
  background: rgb(var(--color-scope-clinical-rgb) / 0.15);
  padding: 0.55rem 1.125rem;
  color: var(--color-dark-blue);
  font-weight: 700;
  font-size: 1rem;
  font-family: inherit;

  &:hover {
    background: rgb(var(--color-scope-clinical-rgb) / 0.25);
  }

  svg {
    flex-shrink: 0;
  }
}
</style>
