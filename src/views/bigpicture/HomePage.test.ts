import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomePage from './HomePage.vue'
import { useAuthStore } from '@/stores/authStore'

const replace = vi.fn<(path: string) => void>()
vi.mock('vue-router', () => ({ useRouter: () => ({ replace }) }))

describe('HomePage — postLoginRedirect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    replace.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the saved deep link and removes it when logged in', async () => {
    useAuthStore().setLoggedIn(true)
    sessionStorage.setItem('postLoginRedirect', '/search?sex=Female')

    mount(HomePage)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/search?sex=Female')
    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })

  it('opens /search when nothing is saved and the user is logged in', async () => {
    useAuthStore().setLoggedIn(true)

    mount(HomePage)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/search')
  })

  it('leaves the saved value untouched and does not navigate when logged out', async () => {
    useAuthStore().setLoggedIn(false)
    sessionStorage.setItem('postLoginRedirect', '/search')

    mount(HomePage)
    await flushPromises()

    expect(replace).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('postLoginRedirect')).toBe('/search')
  })
})
