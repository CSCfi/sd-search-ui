import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createServiceRouter } from './shared'
import { useAuthStore } from '@/stores/authStore'

const Stub = defineComponent({ template: '<div />' })

function makeRouter() {
  return createServiceRouter([
    { path: '/', component: Stub },
    { path: '/search', component: Stub, meta: { requiresAuth: true } },
  ])
}

describe('router guard — requiresAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubEnv('VITE_AUTH_BYPASS', 'false')
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/', pathname: '/search', search: '' },
      writable: true,
    })
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('redirects to / and saves postLoginRedirect when the session is confirmed logged out', async () => {
    const store = useAuthStore()
    vi.spyOn(store, 'checkSession').mockImplementation(async () => store.setLoggedIn(false))

    await makeRouter().push('/search')

    expect(window.location.href).toBe('/')
    expect(sessionStorage.getItem('postLoginRedirect')).toBe('/search')
  })

  it('lets the navigation through when the check leaves isLoggedIn null (service unavailable)', async () => {
    const store = useAuthStore()
    const check = vi.spyOn(store, 'checkSession').mockResolvedValue()
    const router = makeRouter()

    await router.push('/search')

    expect(check).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/search')
    expect(window.location.href).toBe('http://localhost/')
    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })

  it('does not check the session again once isLoggedIn is known', async () => {
    const store = useAuthStore()
    store.setLoggedIn(true)
    const check = vi.spyOn(store, 'checkSession')

    await makeRouter().push('/search')

    expect(check).not.toHaveBeenCalled()
  })
})
