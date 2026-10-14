import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './authStore'

function httpError(status: number) {
  return new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, null, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  })
}

// Each entry answers one call in order: 200 resolves, a status number rejects with that status.
function mockProbe(...results: number[]) {
  const spy = vi.spyOn(axios, 'get')
  for (const status of results) {
    if (status === 200) spy.mockResolvedValueOnce({ status })
    else spy.mockRejectedValueOnce(httpError(status))
  }
  return spy
}

function mockRefresh(outcome: 'ok' | 401 | 503) {
  const spy = vi.spyOn(axios, 'post')
  if (outcome === 'ok') return spy.mockResolvedValueOnce({ status: 204 })
  return spy.mockRejectedValueOnce(httpError(outcome))
}

describe('authStore — checkSession', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // A local .env may set the bypass to "true"; these tests exercise the real path.
    vi.stubEnv('VITE_AUTH_BYPASS', 'false')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('marks the user logged in when the probe succeeds, without refreshing', async () => {
    mockProbe(200)
    const refresh = vi.spyOn(axios, 'post')
    const store = useAuthStore()

    await store.checkSession()

    expect(store.isLoggedIn).toBe(true)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes once on 401 and stays logged in when the repeated probe succeeds', async () => {
    const probe = mockProbe(401, 200)
    const refresh = mockRefresh('ok')
    const store = useAuthStore()

    await store.checkSession()

    expect(store.isLoggedIn).toBe(true)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('reports logged out when the refresh is rejected', async () => {
    mockProbe(401)
    mockRefresh(401)
    const store = useAuthStore()

    await store.checkSession()

    expect(store.isLoggedIn).toBe(false)
  })

  it('does not report logged out when the refresh is unavailable', async () => {
    mockProbe(401)
    mockRefresh(503)
    const store = useAuthStore()
    store.setLoggedIn(true)

    await store.checkSession()

    expect(store.isLoggedIn).toBe(true)
  })

  it('leaves isLoggedIn unchecked (null) when the refresh is unavailable on first check', async () => {
    mockProbe(401)
    mockRefresh(503)
    const store = useAuthStore()

    await store.checkSession()

    expect(store.isLoggedIn).toBeNull()
  })

  it('reports logged out when the probe is still 401 after a successful refresh, without looping', async () => {
    const probe = mockProbe(401, 401)
    const refresh = mockRefresh('ok')
    const store = useAuthStore()

    await store.checkSession()

    expect(store.isLoggedIn).toBe(false)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('reports logged out on a non-401 probe failure, without refreshing', async () => {
    mockProbe(500)
    const refresh = vi.spyOn(axios, 'post')
    const store = useAuthStore()

    await store.checkSession()

    expect(store.isLoggedIn).toBe(false)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('skips the probe entirely when VITE_AUTH_BYPASS is true', async () => {
    vi.stubEnv('VITE_AUTH_BYPASS', 'true')
    const probe = vi.spyOn(axios, 'get')
    const store = useAuthStore()

    await store.checkSession()

    expect(store.isLoggedIn).toBe(true)
    expect(probe).not.toHaveBeenCalled()
  })
})
