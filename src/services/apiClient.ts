import axios from 'axios'
import { useAuthStore } from '@/stores/authStore.ts'

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

apiClient.interceptors.response.use(
  (response) => {
    const authStore = useAuthStore()
    if (authStore.isLoggedIn !== true) {
      authStore.setLoggedIn(true)
    }

    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/logout'
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
      title: error.response?.data?.title ?? error.response?.statusText ?? 'Unknown error',
      detail,
    }

    return Promise.reject(apiError)
  },
)

export default apiClient
