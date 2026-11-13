import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '@/services/apiClient.ts'

export type RefreshResult = 'ok' | 'expired' | 'unavailable'

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let inFlight: Promise<RefreshResult> | null = null

// Every refresh replaces the refresh token on the backend.
// A second parallel refresh would send the old token, get 401, and log the user out.
// All callers must therefore share the inFlight promise.
export function refreshSession(): Promise<RefreshResult> {
  if (inFlight) return inFlight

  // Plain axios, not apiClient: /refresh is at the origin root, not under /api.
  // apiClient would call refreshSession() again on a 401 and loop forever.
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
  | { kind: 'expired' } // both the refresh and the retry returned 401: the session is over
  | { kind: 'unavailable' } // refresh 503 or network error
  | { kind: 'failed'; error: unknown } // retry failed, but the session is not proven dead

// Requests retried through apiClient/dodClient reject with ApiError, not AxiosError,
// so both error shapes must be checked.
export function isUnauthorized(error: unknown): boolean {
  if (axios.isAxiosError(error)) return error.response?.status === 401
  return (
    typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 401
  )
}

const LOCK_NAME = 'session-refresh'

// Returns null when the retry returned 401. The caller decides what that means.
async function retryOnce<T>(retry: () => Promise<T>): Promise<RecoverOutcome<T> | null> {
  try {
    return { kind: 'ok', value: await retry() }
  } catch (error) {
    return isUnauthorized(error) ? null : { kind: 'failed', error }
  }
}

async function recover<T>(retry: () => Promise<T>): Promise<RecoverOutcome<T>> {
  // Another tab, or an earlier 401 in this tab, may already have renewed the cookies. The
  // refresh cookie is httponly, so retrying is the only way to find out.
  const first = await retryOnce(retry)
  if (first) return first

  const result = await refreshSession()
  if (result === 'unavailable') return { kind: 'unavailable' }

  try {
    return { kind: 'ok', value: await retry() }
  } catch (error) {
    if (result === 'ok') {
      // The refresh worked, so the session is valid.
      // A 401 here means the API rejected the request itself.
      return { kind: 'failed', error }
    }
    if (!isUnauthorized(error)) return { kind: 'failed', error }
    // Both refresh and retry returned 401: the session has expired.
    // Revoke the refresh token and clear the stale cookies.
    // Call revokeSession() directly: logoutSession() would try to acquire
    // the same lock again and deadlock.
    await revokeSession()
    return { kind: 'expired' }
  }
}

// The backend waits up to 10 seconds for LS AAI to confirm a revoke.
// We give up after 5 seconds, so a slow LS AAI cannot block the logout.
const REVOKE_TIMEOUT_MS = 5000

// Asks the backend to revoke the refresh token and clear the session cookies.
// revokeSession() never throws, because logging out must work even if the revoke fails.
// We use plain axios because apiClient would send the request to /api/refresh.
export async function revokeSession(): Promise<void> {
  try {
    await axios.delete('/refresh', { withCredentials: true, timeout: REVOKE_TIMEOUT_MS })
  } catch {
    // Logout must continue when the revoke fails.
  }
}

const LOCK_WAIT_MS = 8000

// Some browsers have navigator.locks but not AbortSignal.timeout (for example Safari 15.4 to 15.6).
// Without this fallback they would skip the lock when logging out.
// cancel() clears the fallback timer once the lock request has finished.
function lockWaitSignal(): { signal: AbortSignal; cancel: () => void } {
  if (typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(LOCK_WAIT_MS), cancel: () => {} }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOCK_WAIT_MS)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

// Revokes the refresh token, then goes to /logout even if the revoke failed.
// The revoke holds the session-refresh lock so that another tab cannot refresh at the same time.
// Otherwise that tab could receive a new refresh token that stays valid after we log out.
export async function logoutSession(): Promise<void> {
  sessionStorage.removeItem('postLoginRedirect')

  if (typeof navigator === 'undefined' || !navigator.locks) {
    await revokeSession()
  } else {
    const { signal, cancel } = lockWaitSignal()
    try {
      await navigator.locks.request(LOCK_NAME, { signal }, () => revokeSession())
    } catch {
      // Waiting for the lock timed out, because another tab holds it for too long.
      // Revoke without the lock. A slow logout is worse than the small risk of a race.
      await revokeSession()
    } finally {
      cancel()
    }
  }

  window.location.href = '/logout'
}

// Runs under a lock shared by every tab of the origin, so two tabs never refresh at once.
// Without Web Locks the in-tab promise in refreshSession() is the only guard.
export function recoverSession<T>(retry: () => Promise<T>): Promise<RecoverOutcome<T>> {
  if (typeof navigator === 'undefined' || !navigator.locks) return recover(retry)
  return navigator.locks.request(LOCK_NAME, () => recover(retry))
}

// On a 401, recoverSession() retries, refreshes, and retries once more.
// Only a confirmed session end goes to /logout.
// A refresh 503 or network error never logs the user out.
// A request that was already retried, or a 401 from /refresh itself, is rejected as an ApiError
// with no recovery.
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
