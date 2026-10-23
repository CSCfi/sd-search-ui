import axios from 'axios'
import { attachRefreshInterceptor } from '@/services/sessionRefresh.ts'
import type { ApiError } from '@/services/apiClient.ts'

// Dataset on Demand calls go through this app's own origin. nginx (`/dod`, `/dod/status`) adds
// `Authorization: Bearer` from the httponly access_token cookie, so the frontend never holds a
// token. See auth.md.
const dodClient = axios.create({
  baseURL: '/dod',
  withCredentials: true,
})

// Registered before the normalizer below: it rejects with an ApiError (503 refresh unavailable,
// 401 after retry), which the normalizer must pass through untouched.
attachRefreshInterceptor(dodClient)

// Connect protocol errors are `{ code, message }`, not the FastAPI `{ title, detail }` shape.
dodClient.interceptors.response.use(undefined, (error: unknown) => {
  if (!axios.isAxiosError(error)) return Promise.reject(error)

  const data = error.response?.data as { code?: unknown; message?: unknown } | undefined

  return Promise.reject({
    status: error.response?.status ?? 0,
    title:
      (typeof data?.code === 'string' ? data.code : undefined) ??
      (error.response?.statusText || 'Unknown error'),
    detail: typeof data?.message === 'string' ? data.message : undefined,
  } satisfies ApiError)
})

export default dodClient
