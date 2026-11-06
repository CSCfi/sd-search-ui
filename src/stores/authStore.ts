import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { isUnauthorized, recoverSession } from '@/services/sessionRefresh.ts'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref<boolean | null>(null)

  function setLoggedIn(value: boolean) {
    isLoggedIn.value = value
  }

  // Use axios directly so apiClient's 401 interceptor does not compete with the router guard's
  // redirect. Only a 401 can mean the session ended; it goes through recoverSession (cross-tab
  // lock, retry, refresh, retry). Any other probe error (503, network) leaves isLoggedIn unchanged.
  async function checkSession() {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
      setLoggedIn(true)
      return
    }

    const probe = () => axios.get('/filtering_terms', { baseURL: '/api', withCredentials: true })

    try {
      await probe()
      setLoggedIn(true)
      return
    } catch (error) {
      if (!isUnauthorized(error)) return
    }

    const outcome = await recoverSession(probe)
    switch (outcome.kind) {
      case 'ok':
        setLoggedIn(true)
        return
      case 'expired':
        setLoggedIn(false)
        return
      case 'unavailable':
        return
      case 'failed':
        if (isUnauthorized(outcome.error)) setLoggedIn(false)
        return
    }
  }

  return { isLoggedIn, setLoggedIn, checkSession }
})
