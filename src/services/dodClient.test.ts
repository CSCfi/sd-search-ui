import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import dodClient from './dodClient'

function respond(status: number, config: InternalAxiosRequestConfig, data: unknown = {}) {
  const response = {
    data,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    headers: {},
    config,
  }
  if (status < 400) return Promise.resolve(response)
  return Promise.reject(new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response))
}

function useStatuses(...statuses: number[]) {
  const adapter: AxiosAdapter = (config) => respond(statuses.shift() ?? 200, config, { ok: true })
  dodClient.defaults.adapter = adapter
}

function mockRefresh(outcome: 'ok' | 401 | 503) {
  const spy = vi.spyOn(axios, 'post')
  if (outcome === 'ok') return spy.mockResolvedValueOnce({ status: 204 })
  return spy.mockRejectedValueOnce(
    new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, null, {
      status: outcome,
      statusText: '',
      data: {},
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    }),
  )
}

describe('dodClient', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { href: '/search' }, writable: true })
  })
  afterEach(() => vi.restoreAllMocks())

  it('retries once after a 401 when the session is refreshed', async () => {
    const refresh = mockRefresh('ok')
    useStatuses(401, 401, 200)

    const res = await dodClient.post('', {})

    expect(res.data).toEqual({ ok: true })
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/search')
  })

  it('keeps status 401 and does not log out when the retried request is rejected again', async () => {
    const refresh = mockRefresh('ok')
    useStatuses(401, 401, 401)

    await expect(dodClient.post('', {})).rejects.toMatchObject({ status: 401 })

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(window.location.href).toBe('/search')
  })

  it('goes to /logout when the refresh is rejected with 401', async () => {
    mockRefresh(401)
    useStatuses(401, 401, 401)

    await expect(dodClient.post('', {})).rejects.toMatchObject({ status: 401 })

    expect(window.location.href).toBe('/logout')
  })

  it('keeps the 503 ApiError intact and does not log out when refresh is unavailable', async () => {
    mockRefresh(503)
    useStatuses(401, 401)

    await expect(dodClient.post('', {})).rejects.toMatchObject({ status: 503 })

    expect(window.location.href).toBe('/search')
  })

  it('maps a Connect error body to ApiError', async () => {
    dodClient.defaults.adapter = (config) =>
      respond(400, config, { code: 'invalid_argument', message: 'image_accessions is empty' })

    await expect(dodClient.post('', {})).rejects.toEqual({
      status: 400,
      title: 'invalid_argument',
      detail: 'image_accessions is empty',
    })
  })

  it('falls back to the status text when the error body is not a Connect error', async () => {
    dodClient.defaults.adapter = (config) => respond(502, config, '<html>Bad Gateway</html>')

    await expect(dodClient.post('', {})).rejects.toEqual({
      status: 502,
      title: 'Error',
      detail: undefined,
    })
  })

  it('maps an HTML error body with an empty status text to an ApiError with a non-empty title', async () => {
    dodClient.defaults.adapter = (config) => {
      const response = {
        data: '<html>Bad Gateway</html>',
        status: 502,
        statusText: '',
        headers: {},
        config,
      }
      return Promise.reject(new AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, response))
    }

    await expect(dodClient.post('', {})).rejects.toMatchObject({ status: 502 })
    await expect(dodClient.post('', {})).rejects.toHaveProperty('title', 'Unknown error')
  })
})
