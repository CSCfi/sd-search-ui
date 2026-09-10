import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore.ts'

/**
 * Creates a router with the shared auth guard applied.
 * Each service passes its own routes array — guard logic is shared across all services.
 */
export function createServiceRouter(routes: RouteRecordRaw[]) {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
  })

  /**
   * Client-side UX guard only — redirects to homepage when no authenticated
   * session is known. "Not known" covers both the initial page load (before
   * the session has been checked) and a confirmed 401.
   *
   * This is NOT a security boundary. Real authentication is enforced
   * server-side — all API calls use withCredentials and the backend returns
   * 401 for invalid sessions, which triggers a logout redirect via the Axios
   * interceptor in apiClient.ts.
   */
  router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth || import.meta.env.VITE_AUTH_BYPASS === 'true') {
      return true
    }

    const authStore = useAuthStore()

    // isLoggedIn is null until the session has been checked at least once —
    // a fresh page load (e.g. landing back on /search right after the OIDC
    // callback) must not be treated as logged-out before that check runs, or
    // it redirects to login again even with a valid session cookie.
    if (authStore.isLoggedIn === null) {
      await authStore.checkSession()
    }

    if (!authStore.isLoggedIn) {
      sessionStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search)
      window.location.href = '/'
      return false
    }

    return true
  })

  return router
}
