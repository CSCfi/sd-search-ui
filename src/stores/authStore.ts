import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { isUnauthorized, recoverSession } from '@/services/sessionRefresh.ts'

const CHECK_FALLBACK_MS = 3000

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref<boolean | null>(null)
  // True while checkSession() runs, so the UI can hide login buttons from a user who may still
  // have a valid session. Cleared after CHECK_FALLBACK_MS at the latest, so a hung backend never
  // leaves the user without a login button.
  const isChecking = ref(false)

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

    isChecking.value = true
    const fallback = setTimeout(() => {
      isChecking.value = false
    }, CHECK_FALLBACK_MS)

    try {
      await runSessionCheck()
    } finally {
      clearTimeout(fallback)
      isChecking.value = false
    }
  }

  async function runSessionCheck() {
    const probe = () => axios.get('/filtering_scopes', { baseURL: '/api', withCredentials: true })

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

  return { isLoggedIn, isChecking, setLoggedIn, checkSession }
})
