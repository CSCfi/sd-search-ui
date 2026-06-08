---
description: Auth pattern, route guards, env variables. Read when working on authentication or protected routes.
alwaysApply: false
---

# CSC Discovery — Auth

## Pattern

Backend handles the entire LifeScience AAI / OIDC flow.
Frontend has no OIDC library — auth is cookie + redirect only.

**Do not add `oidc-client-ts` or similar libraries.**

## Flow

```
1. Unauthenticated user → redirect to VITE_LOGIN_URL
2. Backend handles AAI OIDC, sets cookie: logged_in=True
3. Frontend checks cookie on every protected route
4. API calls use { withCredentials: true } — sends cookie automatically
5. 401 response → redirect to VITE_LOGOUT_URL
```

## Session Check

Before any authenticated API call:

```ts
// services/auth.ts
const checkSession = async (): Promise<boolean> => {
  try {
    const resp = await fetch(import.meta.env.VITE_ACCOUNT_INFO, {
      credentials: 'include',
    })
    return resp.ok
  } catch {
    return false
  }
}
```

On 401 anywhere in the app:

```ts
// redirect to logout — backend clears the session
window.location.href = import.meta.env.VITE_LOGOUT_URL
```

## Route Guard

```ts
// router/index.ts
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const loggedIn = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('logged_in=True'))

    if (!loggedIn) {
      window.location.href = import.meta.env.VITE_LOGIN_URL
      return false
    }
  }
})
```

## API Axios/Fetch Config

All requests to the backend must include credentials:

```ts
// services/api.ts — axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    window.location.href = import.meta.env.VITE_LOGOUT_URL
  }
  return Promise.reject(error)
})
```

## Environment Variables

```
VITE_API_BASE_URL     # Search API base URL
VITE_LOGIN_URL        # LifeScience AAI login redirect
VITE_LOGOUT_URL       # Logout + session clear
VITE_ACCOUNT_INFO     # GET endpoint that returns user info (200 = valid session)
```

## Auth Status in UI

Auth state is minimal — no user profile needed beyond login status:

```ts
// stores/authStore.ts
export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = computed(() =>
    document.cookie.split(';').some((c) => c.trim().startsWith('logged_in=True'))
  )
  return { isLoggedIn }
})
```

## What Is Not Implemented Yet

- Haka federation SSO (planned as future extension)
- Token refresh logic (backend session-based, not token-based)