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
5. Any 401 from `apiClient` → refresh the session once and retry the request once (see Session Refresh).
   Only a refresh the backend rejects → `sessionStorage.removeItem('postLoginRedirect')` + redirect to `/logout`

## Session Refresh (`services/sessionRefresh.ts`)

The backend's access token cookie (`access_token`, LS AAI access token) lives 1 hour. The refresh
cookie (`refresh_token`, about 1 month, `Path=/refresh`) is only sent to `POST /refresh`. Both are
`httponly` — the frontend never sees a token.

`refreshSession()` calls `POST /refresh` (plain axios, origin root, `withCredentials`) and returns:

| Backend | Result | Meaning |
|---|---|---|
| `204` | `'ok'` | Both cookies replaced |
| `401` | `'expired'` | Session over, backend cleared cookies |
| `503` / network error | `'unavailable'` | LS AAI unreachable, cookies unchanged — not a logout |

**Only one refresh runs at a time.** Every refresh replaces the refresh token and invalidates the
old one, so a second parallel refresh presents a spent token, gets `401` and logs the user out.
`refreshSession()` therefore keeps one module-level in-flight promise that all callers share. Never
call `POST /refresh` any other way.

`attachRefreshInterceptor(instance)` is registered on `apiClient`. On a `401` (not already retried):
`'ok'` → retry the request once; `'expired'` → clear `postLoginRedirect`, go to `/logout`;
`'unavailable'` → reject with `ApiError` 503, no logout. A `401` on the retried request rejects as
`ApiError` 401 — no loop, no logout. The interceptor must stay registered before `apiClient`'s error
normalizer, which passes an already-shaped `ApiError` through.

## Session Check (`stores/authStore.ts`)

`isLoggedIn` starts as `null` — meaning "not yet checked", not "logged out". Nothing sets it except
a real API response. The route guard must await `checkSession()` before acting on the value, or a
fresh page load with a valid session will be incorrectly treated as logged-out.

The check uses a plain `axios` call, **not** the shared `apiClient` instance. `apiClient`'s
interceptor would refresh and redirect to `/logout`, which would race with the guard's own redirect
to `/` on this same check. Plain axios avoids the conflict — the guard decides what to do with the
result.

On `401` the check calls `refreshSession()` once and repeats the probe. `isLoggedIn` becomes `false`
only if the refresh returns `'expired'` (or the repeated probe fails). On `'unavailable'`
`isLoggedIn` is left unchanged. Non-401 probe errors still set `false`.

Session check is skipped entirely if `VITE_AUTH_BYPASS` is `"true"` (local dev only).

## Route Guard (`router/index.ts`)

Only routes with `meta: { requiresAuth: true }` are gated. If `isLoggedIn` is still `null` on
entry, `checkSession()` is awaited first. On failure: save intended URL to `sessionStorage` as
`postLoginRedirect`, then redirect to `/`.

This is a UX guard only — real enforcement is server-side via 401s.

## API Client (`services/apiClient.ts`)

`apiClient` is an Axios instance with `baseURL: '/api'` and `withCredentials: true`.

Response interceptor:
- Success → calls `authStore.setLoggedIn(true)` if not already set
- 401 → refresh once and retry once (see Session Refresh); `/logout` only if the refresh is rejected
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
- Open: whether the DoD service accepts the LS AAI access token (audience is the sd-search-api client).
  `TODO(auth)` in `submitDatasetOnDemand`.

## What Is Not Implemented Yet

- Haka federation SSO (planned as future extension)