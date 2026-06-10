import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import SearchPage from '@/views/SearchPage.vue'
import NotFoundPage from '@/views/NotFoundPage.vue'

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
 * Client-side UX guard only — redirects unauthenticated users to login
 * before rendering protected views.
 *
 * This is NOT a security boundary. The cookie can be set manually in the
 * browser. Real authentication is enforced server-side — all API calls use
 * withCredentials and the backend returns 401 for invalid sessions, which
 * triggers a logout redirect via the Axios interceptor in services/api.ts.
 */
router.beforeEach((to) => {
  if (import.meta.env.DEV) {
    return true
  }

  if (to.meta.requiresAuth) {
    const loggedIn = document.cookie.split(';').some((c) => c.trim().startsWith('logged_in=True'))

    if (!loggedIn) {
      window.location.href = import.meta.env.VITE_LOGIN_URL
      return false
    }
  }
})

export default router
