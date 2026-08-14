import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import SearchPage from '@/views/SearchPage.vue'
import NotFoundPage from '@/views/NotFoundPage.vue'
import { useAuthStore } from '@/stores/authStore.ts'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/search',
      name: 'search',
      component: SearchPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
    },
  ],
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
    sessionStorage.setItem('postLoginRedirect', window.location.href)
    window.location.href = '/'
    return false
  }

  return true
})

export { router }
export default router
