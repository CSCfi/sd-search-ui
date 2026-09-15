import { createServiceRouter } from '@/router/shared'
import HomePage from '@/views/bigpicture/HomePage.vue'
import SearchPage from '@/views/bigpicture/SearchPage.vue'
import NotFoundPage from '@/views/shared/NotFoundPage.vue'

const router = createServiceRouter([
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
])

export { router }
export default router
