import axios from 'axios'
import { useAuthStore } from '@/stores/authStore.ts'
import { attachRefreshInterceptor } from '@/services/sessionRefresh.ts'

// ProblemDetails-like error model used by the UI.
// FastAPI responses in this project typically provide `detail`,
// while `type` and `instance` are not provided by the backend.
export interface ApiError {
  status: number
  title: string
  detail?: string
}

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    !(value instanceof Error) &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).title === 'string'
  )
}

// Registered before the normalizer below: it rejects with an ApiError (503 refresh unavailable,
// 401 after retry), which the normalizer must pass through untouched.
attachRefreshInterceptor(apiClient)

apiClient.interceptors.response.use(
  (response) => {
    const authStore = useAuthStore()
    if (authStore.isLoggedIn !== true) {
      authStore.setLoggedIn(true)
    }

    return response
  },
  (error) => {
    if (isApiError(error)) {
      return Promise.reject(error)
    }

    if (!axios.isAxiosError(error)) {
      return Promise.reject({
        status: 0,
        title: error instanceof Error ? error.message : 'Unknown error',
      } satisfies ApiError)
    }

    const detail =
      typeof error.response?.data?.detail === 'string' ? error.response.data.detail : undefined

    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      title: error.response?.data?.title ?? (error.response?.statusText || 'Unknown error'),
      detail,
    }

    return Promise.reject(apiError)
  },
)

export default apiClient
