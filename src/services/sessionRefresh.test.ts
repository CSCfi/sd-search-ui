import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { attachRefreshInterceptor, refreshSession } from './sessionRefresh'

function httpError(status: number, config: InternalAxiosRequestConfig) {
  return new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    data: {},
    headers: {},
    config,
  })
}

// Real axios instance and real interceptor; only the transport is replaced.
function makeClient(statuses: Record<string, number[]>) {
  const calls: string[] = []
  const adapter: AxiosAdapter = (config) => {
    const url = config.url ?? ''
    calls.push(url)
    const status = statuses[url]?.shift() ?? 200
    if (status >= 400) return Promise.reject(httpError(status, config))
    return Promise.resolve({ data: { ok: true }, status, statusText: 'OK', headers: {}, config })
  }
  const client = axios.create({ adapter })
  attachRefreshInterceptor(client)
  return { client, calls }
}

function mockRefresh(...outcomes: ('ok' | 401 | 503 | 'network')[]) {
  const spy = vi.spyOn(axios, 'post')
  for (const outcome of outcomes) {
    if (outcome === 'ok') {
      spy.mockResolvedValueOnce({ status: 204 })
    } else if (outcome === 'network') {
      spy.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
    } else {
      spy.mockRejectedValueOnce(
        new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, null, {
          status: outcome,
          statusText: '',
          data: {},
          headers: {},
          config: {} as InternalAxiosRequestConfig,
        }),
      )
    }
  }
  return spy
}

describe('refreshSession', () => {
  afterEach(() => vi.restoreAllMocks())

  it('posts /refresh at the origin root with credentials', async () => {
    const spy = mockRefresh('ok')
    await refreshSession()
    expect(spy).toHaveBeenCalledWith('/refresh', undefined, { withCredentials: true })
  })

  it.each([
    ['ok', 'ok'],
    [401, 'expired'],
    [503, 'unavailable'],
    ['network', 'unavailable'],
  ] as const)('maps outcome %s to %s', async (outcome, expected) => {
    mockRefresh(outcome)
    expect(await refreshSession()).toBe(expected)
  })

  it('shares one request between concurrent callers', async () => {
    const spy = mockRefresh('ok')
    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()])
    expect(results).toEqual(['ok', 'ok', 'ok'])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('starts a new request after the previous one settled', async () => {
    const spy = mockRefresh('ok', 'ok')
    await refreshSession()
    await refreshSession()
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

function stubLocks() {
  const request = vi.fn<(name: string, fn: () => Promise<unknown>) => Promise<unknown>>(
    (_name, fn) => fn(),
  )
  Object.defineProperty(navigator, 'locks', { value: { request }, configurable: true })
  return request
}

function removeLocks() {
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
}

describe('attachRefreshInterceptor', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { href: '/search' }, writable: true })
    sessionStorage.setItem('postLoginRedirect', '/search?sex=Female')
    removeLocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    removeLocks()
  })

  it('runs the recovery under the session-refresh lock', async () => {
    const locks = stubLocks()
    mockRefresh('ok')
    const { client } = makeClient({ '/data': [401, 401] })

    await client.get('/data')

    expect(locks).toHaveBeenCalledTimes(1)
    expect(locks.mock.calls[0]?.[0]).toBe('session-refresh')
  })

  it('retries the request before refreshing and skips the refresh when the retry succeeds', async () => {
    stubLocks()
    const refresh = mockRefresh()
    const { client, calls } = makeClient({ '/data': [401] })

    const res = await client.get('/data')

    expect(res.data).toEqual({ ok: true })
    expect(calls).toEqual(['/data', '/data'])
    expect(refresh).not.toHaveBeenCalled()
  })

  it('refreshes and retries the original request after two 401s', async () => {
    const refresh = mockRefresh('ok')
    const { client, calls } = makeClient({ '/data': [401, 401] })

    const res = await client.get('/data')

    expect(res.data).toEqual({ ok: true })
    expect(calls).toEqual(['/data', '/data', '/data'])
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('triggers exactly one refresh for parallel 401s without Web Locks', async () => {
    let finishRefresh: (value: unknown) => void = () => {}
    const refresh = vi
      .spyOn(axios, 'post')
      .mockReturnValue(new Promise((resolve) => (finishRefresh = resolve)))
    const { client } = makeClient({ '/a': [401, 401], '/b': [401, 401], '/c': [401, 401] })

    const all = Promise.all([client.get('/a'), client.get('/b'), client.get('/c')])
    await new Promise((resolve) => setTimeout(resolve, 0))
    finishRefresh({ status: 204 })
    await all

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('does not redirect when the refresh is 401 but the retry succeeds (another tab refreshed)', async () => {
    mockRefresh(401)
    const { client } = makeClient({ '/data': [401, 401] })

    const res = await client.get('/data')

    expect(res.data).toEqual({ ok: true })
    expect(window.location.href).toBe('/search')
    expect(sessionStorage.getItem('postLoginRedirect')).toBe('/search?sex=Female')
  })

  it('redirects to /logout and clears postLoginRedirect when refresh and retry are both 401', async () => {
    mockRefresh(401)
    const { client } = makeClient({ '/data': [401, 401, 401] })

    await expect(client.get('/data')).rejects.toMatchObject({ status: 401 })

    expect(window.location.href).toBe('/logout')
    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })

  it.each([503, 'network'] as const)(
    'rejects with ApiError 503 and does not log out when refresh is %s',
    async (outcome) => {
      mockRefresh(outcome)
      const { client } = makeClient({ '/data': [401, 401] })

      await expect(client.get('/data')).rejects.toMatchObject({ status: 503 })

      expect(window.location.href).toBe('/search')
      expect(sessionStorage.getItem('postLoginRedirect')).toBe('/search?sex=Female')
    },
  )

  it('does not loop or log out when the retry after a successful refresh gets 401', async () => {
    const refresh = mockRefresh('ok')
    const { client, calls } = makeClient({ '/data': [401, 401, 401] })

    await expect(client.get('/data')).rejects.toMatchObject({ status: 401 })

    expect(calls).toEqual(['/data', '/data', '/data'])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/search')
  })

  it('rejects a 401 on /refresh itself without recovering', async () => {
    const refresh = mockRefresh()
    const { client, calls } = makeClient({ '/refresh': [401] })

    await expect(client.post('/refresh')).rejects.toMatchObject({ status: 401 })

    expect(calls).toEqual(['/refresh'])
    expect(refresh).not.toHaveBeenCalled()
    expect(window.location.href).toBe('/search')
  })

  it('rejects with the retry error when it is not a 401', async () => {
    const refresh = mockRefresh('ok')
    const { client } = makeClient({ '/data': [401, 401, 500] })

    await expect(client.get('/data')).rejects.toBeInstanceOf(AxiosError)

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/search')
  })

  it('does not refresh for non-401 errors', async () => {
    const refresh = mockRefresh()
    const { client } = makeClient({ '/data': [500] })

    await expect(client.get('/data')).rejects.toBeInstanceOf(AxiosError)

    expect(refresh).not.toHaveBeenCalled()
  })
})
