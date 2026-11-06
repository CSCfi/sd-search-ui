---
description: Auth pattern, route guards, env variables. Read when working on authentication or protected routes.
alwaysApply: false
---

# CSC Discovery — Auth

## Pattern

Backend handles the entire LifeScience AAI / OIDC flow. Frontend has no OIDC library — auth is
cookie + redirect only.

**Do not add `oidc-client-ts` or similar libraries.**

The session cookie is `httponly` — frontend JS can never read it directly (`document.cookie` will
never show it). Login state is only ever known by asking the backend, via a real API call.

## Same-origin requirement

`/login`, `/callback`, `/logout`, `/refresh`, and `/api/*` must all be reached through this app's own origin —
never as absolute URLs pointing at the backend's own hostname. The backend's `/callback` sets the
session cookie as host-only (no `Domain` attribute), scoped to whichever origin the browser was on
when it hit `/callback`. If `/callback` were reached directly on the backend's hostname, the cookie
would never be visible to this app's own `/api/` calls. nginx (`docker/nginx.conf`) proxies all five
paths to `BACKEND_URL` for exactly this reason. Never build an absolute, cross-origin URL for any of
these five paths. `/refresh` is at the origin root, not under `/api` — its cookie is `Path=/refresh`,
so `/api/refresh` would never carry it.

## Flow

1. Unauthenticated user hits a protected route → saved to `sessionStorage` as `postLoginRedirect`, then redirected to `/`
2. Backend handles AAI OIDC on `/login` and `/callback`, sets a host-only session cookie
3. Frontend checks login state by making a real API call — never via `document.cookie`
4. All API calls use `withCredentials: true` — sends the session cookie automatically
5. Any 401 from `apiClient` → recover the session once (see Session Refresh): retry, refresh, retry.
   Only a refresh the backend rejects **and** a retry that is still 401 → revoke the refresh token (`DELETE /refresh`, inside `recoverSession`), `sessionStorage.removeItem('postLoginRedirect')` + redirect to `/logout`
6. User clicks Logout → `logoutSession()`: revoke the refresh token under the `session-refresh` lock, then redirect to `/logout` (see Logout)

## Session Refresh (`services/sessionRefresh.ts`)

The backend's access token cookie (`access_token`, LS AAI access token) lives 1 hour. The refresh
cookie (`refresh_token`, about 1 month, `Path=/refresh`) is only sent to `POST /refresh`. Both are
`httponly` — the frontend never sees a token.

`refreshSession()` calls `POST /refresh` (plain axios, origin root, `withCredentials`) and returns:

| Backend | Result | Meaning |
|---|---|---|
| `204` | `'ok'` | Both cookies replaced |
| `401` | `'expired'` | This refresh token is no good (missing cookie, or LS AAI rejected it). Cookies are left untouched — the backend does not clear them |
| `503` / network error | `'unavailable'` | LS AAI unreachable or refusing the API, cookies unchanged — not a logout |

### Why one refresh at a time, across tabs

Every refresh replaces the refresh token and invalidates the old one. The cookies are shared by
every tab of the origin, so two refreshes at once race: the loser presents a spent token and gets
`401`, although the winner was just given valid cookies. Two guards:

- In one tab, `refreshSession()` keeps one module-level in-flight promise that all callers share.
- Across tabs, `recoverSession()` runs under the Web Lock `session-refresh`
  (`navigator.locks.request`). If `navigator.locks` is undefined, it runs directly and the in-tab
  promise is the only guard. Never call `POST /refresh` any other way.

### `recoverSession(retry)` — shared by the interceptor and `checkSession()`

Returns `{ kind: 'ok', value } | 'expired' | 'unavailable' | { kind: 'failed', error }`. Inside the lock:

1. **Retry first.** Call `retry()`. Another tab, or an earlier 401 in this tab, may already have
   renewed the cookies. The refresh cookie is `httponly`, so retrying is the only way to find out.
   Success → `ok`, no refresh. A failure other than 401 → `failed`.
2. Call `refreshSession()`.
   - `'unavailable'` → `unavailable`. Never a logout.
   - `'ok'` → `retry()` once. Success → `ok`. Any failure → `failed` (a 401 here is a downstream
     rejection, not an expired session).
   - `'expired'` → **retry before logout**: `retry()` once more, because another tab may have won
     the race. Success → `ok`. 401 again → `revokeSession()` (`DELETE /refresh`, see Logout), then
     `expired` (session over). Other failure → `failed`. `unavailable` and `failed` never revoke:
     the session is not proven dead.

`isUnauthorized(error)` recognises an `AxiosError` with status 401 and an `ApiError` with
`status === 401` (errors from a retried request through `apiClient`/`dodClient` are already
normalised).

### Interceptor

`attachRefreshInterceptor(instance)` is registered on `apiClient` and `dodClient`. On a `401`:
a request already carrying `_retried`, or a `401` on `/refresh` itself, rejects as a plain
`ApiError` (no loop, no logout). Otherwise it sets `_retried` and calls
`recoverSession(() => instance.request(config))`:

| Outcome | Result |
|---|---|
| `ok` | Resolve with the response |
| `expired` | Clear `postLoginRedirect`, go to `/logout`, reject with the 401 `ApiError`. The revoke already happened inside `recoverSession` |
| `unavailable` | Reject with `ApiError` 503 (`Service unavailable`), no logout |
| `failed` | Reject with the retry's error |

The interceptor must stay registered before `apiClient`'s and `dodClient`'s error normalizers, which
pass an already-shaped `ApiError` through.

## Logout (`logoutSession()`, `revokeSession()` in `services/sessionRefresh.ts`)

Logout ends the refresh token at LS AAI, not only the browser cookies. `GET /logout` cannot do this,
because the refresh cookie is `Path=/refresh` and never reaches `/logout`. The backend route for
this is `DELETE /refresh`: it revokes the refresh token at LS AAI (RFC 7009), clears both cookies,
and always answers `204` (also with no cookie). A failed revocation is only logged server-side.

Rule: **before every navigation to `/logout`, call `DELETE /refresh`**, then navigate whatever it
answers. Two paths do this:

| Path | Where | How |
|---|---|---|
| User clicks Logout | `AppNavbar.vue` → `logoutSession()` | Clears `postLoginRedirect`, then runs `revokeSession()` inside `navigator.locks.request('session-refresh', { signal: AbortSignal.timeout(8000) }, ...)`, then `window.location.href = '/logout'` |
| Session proven dead | `recover()` `expired` branch | Calls `revokeSession()` directly (already inside the lock), then returns `expired`; the interceptor or guard navigates |

- `revokeSession()` uses plain `axios.delete('/refresh', { withCredentials: true, timeout: 5000 })`
  (not `apiClient`, whose `baseURL` is `/api`), swallows every error and always resolves. Logging
  out never depends on the revoke succeeding.
- Hold the `session-refresh` lock while revoking. Without it, another tab's `POST /refresh` could
  finish after the revoke and set a fresh, unrevoked refresh token.
- **Never call `logoutSession()` from code that already holds the lock** (`recover()` and anything
  it calls). Web Locks are not re-entrant: it would deadlock. Call `revokeSession()` there.
- The lock wait is capped at 8 s. If it is aborted (another tab is stuck holding the lock),
  `logoutSession()` revokes without the lock and navigates. A slow logout is worse than the small
  race. Without `navigator.locks` it revokes directly.
- Worst case with a stuck lock holder is the 8 s wait plus the 5 s revoke timeout. When only the
  `DELETE` hangs, logout completes in about 5 s.
- Revocation closes only the refresh token. The access token stays valid until it expires (at most
  1 hour) because the API validates it locally.
- nginx allows only `POST` and `DELETE` on `/refresh` (`limit_except`).

## Session Check (`stores/authStore.ts`)

`isLoggedIn` starts as `null` — meaning "not yet checked", not "logged out". Nothing sets it except
a real API response. The route guard must await `checkSession()` before acting on the value, or a
fresh page load with a valid session will be incorrectly treated as logged-out.

The check probes `GET /filtering_terms` with a plain `axios` call, **not** the shared `apiClient`
instance. `apiClient`'s interceptor would refresh and redirect to `/logout`, which would race with the
guard's own redirect to `/` on this same check. Plain axios avoids the conflict — the guard decides
what to do with the result.

| Probe result | `isLoggedIn` |
|---|---|
| success | `true` |
| `401` → `recoverSession(probe)` = `ok` | `true` |
| `401` → `expired` (refresh token revoked, cookies cleared) | `false` |
| `401` → `unavailable` | unchanged |
| `401` → `failed`, error is a 401 | `false` |
| `401` → `failed`, any other error | unchanged |
| any other error (`503`, network error) | unchanged — never `false` |

Session check is skipped entirely if `VITE_AUTH_BYPASS` is `"true"` (local dev only).

## Route Guard (`router/shared.ts`)

Only routes with `meta: { requiresAuth: true }` are gated. If `isLoggedIn` is still `null` on
entry, `checkSession()` is awaited first. Only `isLoggedIn === false` redirects: save intended URL to
`sessionStorage` as `postLoginRedirect`, then redirect to `/`. If `isLoggedIn` is still `null` after
the check (service unavailable: `503` or network error), the navigation goes through, so API calls
surface the error. Redirecting would loop or log out a valid session.

This is a UX guard only — real enforcement is server-side via 401s.

## API Client (`services/apiClient.ts`)

`apiClient` is an Axios instance with `baseURL: '/api'` and `withCredentials: true`.

Response interceptor:
- Success → calls `authStore.setLoggedIn(true)` if not already set
- 401 → recover once (see Session Refresh); `/logout` only when the refresh is rejected and the retry is still 401
- Other errors → rejects with a normalized `ApiError` (`status`, `title`, `detail`)

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_AUTH_BYPASS` | `"true"` skips the route guard entirely — local dev only |

## Dataset on Demand (DoD) auth

DoD is a separate third-party service (Connect-style JSON over POST) that needs a bearer token.
The access token cookie is `httponly`, so the frontend cannot attach it. nginx does it:
`POST /dod` and `POST /dod/status` on this origin are proxied to `DOD_URL` (`/RequestDatasetCreation`,
`/GetOnDemandDatasetStatus`) with `Authorization: Bearer $cookie_access_token`. The `Cookie` header is
stripped, the upstream certificate is verified (`proxy_ssl_verify on`, depth 3), only `POST` is allowed
and every other `/dod/` path is 404.

- `DOD_URL` is optional. Unset or empty = DoD disabled: `docker-entrypoint-validate.sh` renders `location /dod { return 404; }`
  instead of the proxy locations (`docker/dod.locations.template`, included by `nginx.conf`). Set = validated and rendered.
- No `access_token` cookie -> nginx answers `401` itself. The browser drops an expired cookie, so this
  is the normal "token expired" signal and triggers the same refresh + retry as any other 401.
- `dodClient` (`services/dodClient.ts`) has `baseURL: '/dod'`, `withCredentials: true` and
  `attachRefreshInterceptor` (see Session Refresh). Its error mapper converts Connect `{ code, message }`
  bodies to `ApiError` (`title` = code, `detail` = message).
- A `401` after refresh + retry means the DoD service rejected the token. `useDatasetOnDemand` shows an
  access-denied message; there is no logout.
- The dev server has no `/dod` proxy and cannot read the cookie: DoD does not work with `pnpm dev`.