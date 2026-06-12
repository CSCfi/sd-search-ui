import axios from 'axios'

// ProblemDetails-like error model used by the UI.
// FastAPI responses in this project typically provide `detail`,
// while `type` and `instance` are not provided by the backend.
export interface ApiError {
  status: number
  title: string
  detail?: string
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401) {
    window.location.href = import.meta.env.VITE_LOGOUT_URL
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
})

export default api
