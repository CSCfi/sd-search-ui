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
   * session is confirmed. Only a confirmed 401 redirects; an unchecked state
   * (null after a failed check) is let through.
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

    // Still null after the check means the service was unavailable (503, network error), not
    // that the session ended. Let the navigation through so API calls surface the error;
    // redirecting to login would loop or log out a valid session.
    if (authStore.isLoggedIn === false) {
      sessionStorage.setItem('postLoginRedirect', window.location.pathname + window.location.search)
      window.location.href = '/'
      return false
    }

    return true
  })

  return router
}
