import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '@/services/apiClient.ts'

export type RefreshResult = 'ok' | 'expired' | 'unavailable'

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let inFlight: Promise<RefreshResult> | null = null

// Each refresh rotates the refresh token on the backend; a second parallel call presents the
// spent token, gets 401 and logs the user out. Every caller must share this one promise.
export function refreshSession(): Promise<RefreshResult> {
  if (inFlight) return inFlight

  // Plain axios, not apiClient: /refresh lives at the origin root (the refresh cookie is
  // Path=/refresh), and apiClient's interceptors would recurse into this function on 401.
  inFlight = axios
    .post('/refresh', undefined, { withCredentials: true })
    .then((): RefreshResult => 'ok')
    .catch((error: unknown): RefreshResult => {
      if (axios.isAxiosError(error) && error.response?.status === 401) return 'expired'
      return 'unavailable'
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

function toApiError(error: AxiosError): ApiError {
  const data = error.response?.data as { title?: string; detail?: unknown } | undefined
  return {
    status: error.response?.status ?? 0,
    title: data?.title ?? error.response?.statusText ?? 'Unknown error',
    detail: typeof data?.detail === 'string' ? data.detail : undefined,
  }
}

// On a 401: refresh once and retry the request once. Refresh 401 ends the session; refresh
// 503/network error is not a logout. A 401 on the retried request is a plain error.
export function attachRefreshInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      return Promise.reject(error)
    }

    const config: RetriableConfig = error.config
    if (config._retried) return Promise.reject(toApiError(error))
    config._retried = true

    const result = await refreshSession()

    if (result === 'ok') return instance.request(config)

    if (result === 'expired') {
      sessionStorage.removeItem('postLoginRedirect')
      window.location.href = '/logout'
      return Promise.reject(toApiError(error))
    }

    return Promise.reject({
      status: 503,
      title: 'Service unavailable',
      detail: 'Session refresh failed, try again shortly.',
    } satisfies ApiError)
  })
}
