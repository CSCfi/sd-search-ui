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

`/login`, `/callback`, `/logout`, and `/api/*` must all be reached through this app's own origin —
never as absolute URLs pointing at the backend's own hostname. The backend's `/callback` sets the
session cookie as host-only (no `Domain` attribute), scoped to whichever origin the browser was on
when it hit `/callback`. If `/callback` were reached directly on the backend's hostname, the cookie
would never be visible to this app's own `/api/` calls. nginx (`docker/nginx.conf`) proxies all four
paths to `BACKEND_URL` for exactly this reason. Never build an absolute, cross-origin URL for any of
these four paths.

## Flow

1. Unauthenticated user hits a protected route → saved to `sessionStorage` as `postLoginRedirect`, then redirected to `/`
2. Backend handles AAI OIDC on `/login` and `/callback`, sets a host-only session cookie
3. Frontend checks login state by making a real API call — never via `document.cookie`
4. All API calls use `withCredentials: true` — sends the session cookie automatically
5. Any 401 response → `sessionStorage.removeItem('postLoginRedirect')` + redirect to `/logout` (backend clears session)

## Session Check (`stores/authStore.ts`)

`isLoggedIn` starts as `null` — meaning "not yet checked", not "logged out". Nothing sets it except
a real API response. The route guard must await `checkSession()` before acting on the value, or a
fresh page load with a valid session will be incorrectly treated as logged-out.

The check uses a plain `axios` call, **not** the shared `apiClient` instance. `apiClient`'s
interceptor redirects to `/logout` on 401, which would race with the guard's own redirect to `/`
on this same check. Plain axios avoids the conflict — the guard decides what to do with the result.

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
- 401 → clears `sessionStorage.postLoginRedirect`, redirects to `/logout`
- Other errors → rejects with a normalized `ApiError` (`status`, `title`, `detail`)

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_AUTH_BYPASS` | `"true"` skips the route guard entirely — local dev only |

## What Is Not Implemented Yet

- Haka federation SSO (planned as future extension)
- Token refresh logic (backend session-based, not token-based)