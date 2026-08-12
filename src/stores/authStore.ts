import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref<boolean | null>(null)

  function setLoggedIn(value: boolean) {
    isLoggedIn.value = value
  }

  // A plain axios call, deliberately not the shared apiClient instance —
  // apiClient's interceptor redirects to /logout on 401, which would race
  // with the router guard's own redirect to /login on the same check. This
  // call just resolves isLoggedIn; the guard decides what to do.
  async function checkSession() {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      setLoggedIn(true)
      return
    }

    try {
      await axios.get('/filtering_terms', {
        baseURL: '/api',
        withCredentials: true,
      })
      setLoggedIn(true)
    } catch {
      setLoggedIn(false)
    }
  }

  return { isLoggedIn, setLoggedIn, checkSession }
})
