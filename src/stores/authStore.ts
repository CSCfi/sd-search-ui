import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { refreshSession } from '@/services/sessionRefresh.ts'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref<boolean | null>(null)

  function setLoggedIn(value: boolean) {
    isLoggedIn.value = value
  }

  // Use axios directly so apiClient's 401 interceptor does not compete with the
  // router guard's redirect. A 401 usually means the access token has expired,
  // so refresh the session once and retry. Keep the current state if LS AAI is unavailable.
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
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        setLoggedIn(false)
        return
      }
    }

    const refreshed = await refreshSession()
    if (refreshed === 'unavailable') return
    if (refreshed === 'expired') {
      setLoggedIn(false)
      return
    }

    try {
      await probe()
      setLoggedIn(true)
    } catch {
      setLoggedIn(false)
    }
  }

  return { isLoggedIn, setLoggedIn, checkSession }
})
