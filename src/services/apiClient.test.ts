import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import apiClient from './apiClient'
import { useAuthStore } from '@/stores/authStore'

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
  apiClient.defaults.adapter = adapter
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

describe('apiClient — session refresh', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.defineProperty(window, 'location', { value: { href: '/search' }, writable: true })
  })
  afterEach(() => vi.restoreAllMocks())

  it('retries after a 401 once the session is refreshed and marks the user logged in', async () => {
    mockRefresh('ok')
    useStatuses(401, 401, 200)

    const res = await apiClient.get('/status')

    expect(res.data).toEqual({ ok: true })
    expect(useAuthStore().isLoggedIn).toBe(true)
    expect(window.location.href).toBe('/search')
  })

  it('goes to /logout when the refresh is rejected with 401', async () => {
    mockRefresh(401)
    useStatuses(401, 401, 401)

    await expect(apiClient.get('/status')).rejects.toMatchObject({ status: 401 })

    expect(window.location.href).toBe('/logout')
  })

  it('keeps the 503 ApiError intact and does not log out when refresh is unavailable', async () => {
    mockRefresh(503)
    useStatuses(401, 401)

    await expect(apiClient.get('/status')).rejects.toMatchObject({ status: 503 })

    expect(window.location.href).toBe('/search')
  })

  it('keeps status 401 when the retried request is rejected again', async () => {
    mockRefresh('ok')
    useStatuses(401, 401, 401)

    await expect(apiClient.get('/status')).rejects.toMatchObject({ status: 401 })

    expect(window.location.href).toBe('/search')
  })

  it('still normalizes other errors to ApiError', async () => {
    apiClient.defaults.adapter = (config) => respond(500, config, { detail: 'boom' })

    await expect(apiClient.get('/status')).rejects.toEqual({
      status: 500,
      title: 'Error',
      detail: 'boom',
    })
  })
})
