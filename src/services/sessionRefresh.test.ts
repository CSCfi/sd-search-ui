import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import {
  attachRefreshInterceptor,
  logoutSession,
  recoverSession,
  refreshSession,
  revokeSession,
} from './sessionRefresh'

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

function mockRevoke(outcome: 204 | 503 | 'network' | 'timeout' = 204) {
  const spy = vi.spyOn(axios, 'delete')
  if (outcome === 204) return spy.mockResolvedValue({ status: 204 })
  if (outcome === 'network')
    return spy.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
  if (outcome === 'timeout') {
    return spy.mockRejectedValue(new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED'))
  }
  return spy.mockRejectedValue(
    new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, null, {
      status: outcome,
      statusText: '',
      data: {},
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    }),
  )
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

type LockOptions = { signal?: AbortSignal }
type LockCallback = () => Promise<unknown>

function stubLocks() {
  const request = vi.fn<
    (
      name: string,
      optionsOrFn: LockOptions | LockCallback,
      maybeFn?: LockCallback,
    ) => Promise<unknown>
  >((_name: string, optionsOrFn: LockOptions | LockCallback, maybeFn?: LockCallback) => {
    const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn!
    return fn()
  })
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
    mockRevoke()
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

describe('revokeSession', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends DELETE /refresh at the origin root with credentials and a 5 s timeout', async () => {
    const spy = mockRevoke()
    await revokeSession()
    expect(spy).toHaveBeenCalledWith('/refresh', { withCredentials: true, timeout: 5000 })
  })

  it.each([503, 'network', 'timeout'] as const)(
    'resolves when the DELETE fails (%s)',
    async (o) => {
      mockRevoke(o)
      await expect(revokeSession()).resolves.toBeUndefined()
    },
  )
})

describe('logoutSession', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { href: '/search' }, writable: true })
    sessionStorage.setItem('postLoginRedirect', '/search?sex=Female')
    removeLocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    removeLocks()
  })

  it('revokes under the session-refresh lock, clears postLoginRedirect, then navigates', async () => {
    const order: string[] = []
    const locks = stubLocks()
    locks.mockImplementation(async (_name, _options, fn) => {
      order.push('lock acquired')
      const result = await (fn as LockCallback)()
      order.push('lock released')
      return result
    })
    const revoke = mockRevoke()
    revoke.mockImplementation(() => {
      order.push('DELETE')
      return Promise.resolve({ status: 204 })
    })

    await logoutSession()

    expect(locks).toHaveBeenCalledTimes(1)
    expect(locks.mock.calls[0]?.[0]).toBe('session-refresh')
    expect(order).toEqual(['lock acquired', 'DELETE', 'lock released'])
    expect(revoke).toHaveBeenCalledWith('/refresh', { withCredentials: true, timeout: 5000 })
    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    expect(window.location.href).toBe('/logout')
  })

  it('caps the lock wait with an abort signal', async () => {
    const locks = stubLocks()
    mockRevoke()

    await logoutSession()

    const options = locks.mock.calls[0]?.[1] as LockOptions
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('passes an initially un-aborted signal to the logout lock when AbortSignal.timeout is missing', async () => {
    const original = AbortSignal.timeout
    Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true })
    try {
      const locks = stubLocks()
      const revoke = mockRevoke()

      await logoutSession()

      const options = locks.mock.calls[0]?.[1] as LockOptions
      expect(options.signal).toBeInstanceOf(AbortSignal)
      expect(options.signal?.aborted).toBe(false)
      expect(revoke).toHaveBeenCalledTimes(1)
      expect(window.location.href).toBe('/logout')
    } finally {
      Object.defineProperty(AbortSignal, 'timeout', { value: original, configurable: true })
    }
  })

  it.each([503, 'network', 'timeout'] as const)(
    'still navigates to /logout when the DELETE fails (%s)',
    async (outcome) => {
      stubLocks()
      mockRevoke(outcome)

      await logoutSession()

      expect(window.location.href).toBe('/logout')
      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    },
  )

  it('revokes directly and navigates when Web Locks is unavailable', async () => {
    const revoke = mockRevoke()

    await logoutSession()

    expect(revoke).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/logout')
  })

  it('revokes without the lock and navigates when the lock wait is aborted', async () => {
    const locks = stubLocks()
    locks.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
    const revoke = mockRevoke()

    await logoutSession()

    expect(locks).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/logout')
    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })
})

describe('recoverSession — revoke on a dead session', () => {
  const unauthorized = () =>
    new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, null, {
      status: 401,
      statusText: '',
      data: {},
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    })

  beforeEach(() => removeLocks())
  afterEach(() => {
    vi.restoreAllMocks()
    removeLocks()
  })

  it('calls DELETE /refresh exactly once when the outcome is expired', async () => {
    mockRefresh(401)
    const revoke = mockRevoke()
    const retry = vi.fn<() => Promise<string>>().mockRejectedValue(unauthorized())

    const outcome = await recoverSession(retry)

    expect(outcome).toEqual({ kind: 'expired' })
    expect(revoke).toHaveBeenCalledTimes(1)
  })

  it('requests the lock once on expired (no deadlock)', async () => {
    const locks = stubLocks()
    mockRefresh(401)
    mockRevoke()
    const retry = vi.fn<() => Promise<string>>().mockRejectedValue(unauthorized())

    const outcome = await recoverSession(retry)

    expect(outcome).toEqual({ kind: 'expired' })
    expect(locks).toHaveBeenCalledTimes(1)
  })

  it('does not revoke when the first retry succeeds (ok)', async () => {
    mockRefresh()
    const revoke = mockRevoke()

    const outcome = await recoverSession(() => Promise.resolve('data'))

    expect(outcome).toEqual({ kind: 'ok', value: 'data' })
    expect(revoke).not.toHaveBeenCalled()
  })

  it('does not revoke when another tab already refreshed (refresh 401, retry ok)', async () => {
    mockRefresh(401)
    const revoke = mockRevoke()
    const retry = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(unauthorized())
      .mockResolvedValueOnce('data')

    const outcome = await recoverSession(retry)

    expect(outcome).toEqual({ kind: 'ok', value: 'data' })
    expect(revoke).not.toHaveBeenCalled()
  })

  it('does not revoke when the refresh is unavailable', async () => {
    mockRefresh(503)
    const revoke = mockRevoke()
    const retry = vi.fn<() => Promise<string>>().mockRejectedValue(unauthorized())

    const outcome = await recoverSession(retry)

    expect(outcome).toEqual({ kind: 'unavailable' })
    expect(revoke).not.toHaveBeenCalled()
  })

  it('does not revoke when the retry fails with a non-401 (failed)', async () => {
    mockRefresh(401)
    const revoke = mockRevoke()
    const retry = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(unauthorized())
      .mockRejectedValueOnce(new Error('boom'))

    const outcome = await recoverSession(retry)

    expect(outcome.kind).toBe('failed')
    expect(revoke).not.toHaveBeenCalled()
  })

  it('does not revoke when the retry after a successful refresh is still 401 (failed)', async () => {
    mockRefresh('ok')
    const revoke = mockRevoke()
    const retry = vi.fn<() => Promise<string>>().mockRejectedValue(unauthorized())

    const outcome = await recoverSession(retry)

    expect(outcome.kind).toBe('failed')
    expect(revoke).not.toHaveBeenCalled()
  })
})
