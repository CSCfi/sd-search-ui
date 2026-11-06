import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore'
import { logoutSession } from '@/services/sessionRefresh'
import AppNavbar from './AppNavbar.vue'

vi.mock('@/services/sessionRefresh', () => ({ logoutSession: vi.fn<() => Promise<void>>() }))

function mountNavbar() {
  return mount(AppNavbar, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' }, HelpSidebar: true },
    },
  })
}

describe('AppNavbar — logout', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().setLoggedIn(true)
    vi.mocked(logoutSession).mockReset()
  })

  it('calls logoutSession once when Logout is clicked', async () => {
    vi.mocked(logoutSession).mockResolvedValue()
    const wrapper = mountNavbar()

    await wrapper.get('a[href="/logout"]').trigger('click')

    expect(logoutSession).toHaveBeenCalledTimes(1)
  })

  it('ignores a second click while the logout is pending and marks the link aria-disabled', async () => {
    vi.mocked(logoutSession).mockReturnValue(new Promise(() => {}))
    const wrapper = mountNavbar()
    const link = wrapper.get('a[href="/logout"]')
    expect(link.attributes('aria-disabled')).toBe('false')

    await link.trigger('click')
    await link.trigger('click')

    expect(logoutSession).toHaveBeenCalledTimes(1)
    expect(link.attributes('aria-disabled')).toBe('true')
  })
})
