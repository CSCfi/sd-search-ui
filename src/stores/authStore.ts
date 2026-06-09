import { defineStore } from 'pinia'
import { computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = computed(() =>
    document.cookie.split(';').some((c) => c.trim().startsWith('logged_in=True')),
  )
  return { isLoggedIn }
})
