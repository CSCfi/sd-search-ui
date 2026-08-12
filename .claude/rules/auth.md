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

```
1. Unauthenticated user → redirect to /login
2. Backend handles AAI OIDC, sets a host-only session cookie on /callback
3. Frontend asks the backend "am I logged in?" via a real API call (never document.cookie)
4. API calls use { withCredentials: true } — sends the cookie automatically
5. 401 response → redirect to /logout (backend clears the session, redirects back)
```

## Session Check

`isLoggedIn` (`stores/authStore.ts`) starts `null` — "not yet checked", not "logged out". Nothing
sets it except a real API response, so anything that gates on it must resolve that unknown state
first, or it will treat a valid session as logged-out on every fresh page load.

Session check is skipped if `VITE_AUTH_BYPASS` is `"true"` (local dev only).
```ts
// stores/authStore.ts
const isLoggedIn = ref<boolean | null>(null)

// A plain axios call, deliberately not the shared apiClient instance — apiClient's interceptor
// redirects to /logout on 401, which would race with the router guard's own redirect to /login
// on this same check. This call only resolves isLoggedIn; the guard decides what to do next.
async function checkSession() {
    if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
        setLoggedIn(true)
        return
    }
  try {
    await axios.get('/filtering_terms', { baseURL: '/api', withCredentials: true })
    setLoggedIn(true)
  } catch {
    setLoggedIn(false)
  }
}
```

## Route Guard

```ts
// router/index.ts
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth || import.meta.env.VITE_AUTH_BYPASS === 'true') {
    return true
  }

  const authStore = useAuthStore()

  if (authStore.isLoggedIn === null) {
    await authStore.checkSession()
  }

  if (!authStore.isLoggedIn) {
    window.location.href = '/login'
    return false
  }
})
```

This is a UX guard only, not a security boundary — real enforcement is server-side (401s on
invalid sessions).

## API Axios Config

```ts
// services/apiClient.ts
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

apiClient.interceptors.response.use(
  (response) => {
    useAuthStore().setLoggedIn(true)
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/logout'
    }
    return Promise.reject(error)
  },
)
```

## Environment Variables

```
VITE_AUTH_BYPASS   # "true" skips the router guard entirely, for local development
```

There is no `VITE_API_BASE_URL`/`VITE_LOGIN_URL`/`VITE_LOGOUT_URL` — those paths are fixed
(`/api`, `/login`, `/logout`) per the same-origin requirement above, not configuration.

## Auth Status in UI

```ts
// stores/authStore.ts
export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref<boolean | null>(null)
  function setLoggedIn(value: boolean) {
    isLoggedIn.value = value
  }
  async function checkSession() { /* see Session Check above */ }
  return { isLoggedIn, setLoggedIn, checkSession }
})
```

## What Is Not Implemented Yet

- Haka federation SSO (planned as future extension)
- Token refresh logic (backend session-based, not token-based)
