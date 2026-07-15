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
 * Client-side UX guard only — redirects to login when no authenticated
 * session is known. "Not known" covers both the initial page load (before
 * any API response has confirmed the session) and a confirmed 401.
 *
 * This is NOT a security boundary. Real authentication is enforced
 * server-side — all API calls use withCredentials and the backend returns
 * 401 for invalid sessions, which triggers a logout redirect via the Axios
 * interceptor in apiClient.ts.
 */
router.beforeEach(() => {
  if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
    return true
  }

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    window.location.href = import.meta.env.VITE_LOGIN_URL
    return false
  }
})

export { router }
export default router
