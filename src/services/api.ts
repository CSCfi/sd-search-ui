import axios from 'axios'

export interface ApiError {
  status: number
  title: string
  detail?: string
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
})

api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    window.location.href = import.meta.env.VITE_LOGOUT_URL
    return Promise.reject(error)
  }

  // Normalizes to RFC 7807 ProblemDetails shape.
  // FastAPI returns { detail } only — title is derived from HTTP statusText.
  const apiError: ApiError = {
    status: error.response?.status ?? 0,
    title: error.response?.data?.title ?? error.response?.statusText ?? 'Unknown error',
    detail: error.response?.data?.detail,
  }

  return Promise.reject(apiError)
})

export default api
