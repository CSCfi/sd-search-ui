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
    title: data?.title ?? (error.response?.statusText || 'Unknown error'),
    detail: typeof data?.detail === 'string' ? data.detail : undefined,
  }
}

export type RecoverOutcome<T> =
  | { kind: 'ok'; value: T } // the request succeeded
  | { kind: 'expired' } // refresh 401 and the retry is still 401: session is over
  | { kind: 'unavailable' } // refresh 503 or network error
  | { kind: 'failed'; error: unknown } // retry failed, but the session is not proven dead

// Errors from a retried request through apiClient/dodClient are already normalised to ApiError.
export function isUnauthorized(error: unknown): boolean {
  if (axios.isAxiosError(error)) return error.response?.status === 401
  return (
    typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 401
  )
}

const LOCK_NAME = 'session-refresh'

async function attempt<T>(retry: () => Promise<T>): Promise<RecoverOutcome<T> | null> {
  try {
    return { kind: 'ok', value: await retry() }
  } catch (error) {
    // null = the retry was a 401, caller decides what that means
    return isUnauthorized(error) ? null : { kind: 'failed', error }
  }
}

async function recover<T>(retry: () => Promise<T>): Promise<RecoverOutcome<T>> {
  // Another tab, or an earlier 401 in this tab, may already have renewed the cookies. The
  // refresh cookie is httponly, so retrying is the only way to find out.
  const first = await attempt(retry)
  if (first) return first

  const result = await refreshSession()
  if (result === 'unavailable') return { kind: 'unavailable' }

  try {
    return { kind: 'ok', value: await retry() }
  } catch (error) {
    if (result === 'ok') return { kind: 'failed', error } // 401 here is a downstream rejection
    // Refresh 401: another tab may have won the race. A second 401 means the session is over.
    return isUnauthorized(error) ? { kind: 'expired' } : { kind: 'failed', error }
  }
}

// Runs under a lock shared by every tab of the origin, so two tabs never refresh at once.
// Without Web Locks the in-tab promise in refreshSession() is the only guard.
export function recoverSession<T>(retry: () => Promise<T>): Promise<RecoverOutcome<T>> {
  if (typeof navigator === 'undefined' || !navigator.locks) return recover(retry)
  return navigator.locks.request(LOCK_NAME, () => recover(retry))
}

// On a 401: recover once (retry, refresh, retry). Only a real session end goes to /logout;
// refresh 503/network error is never a logout. A request already retried, or a 401 on /refresh
// itself, is a plain error.
export function attachRefreshInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      return Promise.reject(error)
    }

    const config: RetriableConfig = error.config
    if (config._retried || config.url?.endsWith('/refresh')) {
      return Promise.reject(toApiError(error))
    }
    config._retried = true

    const outcome = await recoverSession(() => instance.request(config))

    switch (outcome.kind) {
      case 'ok':
        return outcome.value
      case 'expired':
        sessionStorage.removeItem('postLoginRedirect')
        window.location.href = '/logout'
        return Promise.reject(toApiError(error))
      case 'unavailable':
        return Promise.reject({
          status: 503,
          title: 'Service unavailable',
          detail: 'Session refresh failed, try again shortly.',
        } satisfies ApiError)
      case 'failed':
        return Promise.reject(outcome.error)
    }
  })
}
