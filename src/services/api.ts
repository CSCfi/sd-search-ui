import type {
  BeaconFilteringTermsResponse,
  BeaconQueryFilter,
  BeaconResultSetsResponse,
  FieldValueCount,
  FieldValueSuggestion,
} from '@/types/beacon'
import apiClient from './apiClient'

export async function getFilteringTerms(): Promise<BeaconFilteringTermsResponse> {
  return apiClient.get<BeaconFilteringTermsResponse>('/filtering_terms').then((r) => r.data)
}

export async function getFieldValues(fieldId: string): Promise<FieldValueCount[]> {
  return apiClient.get<FieldValueCount[]>(`/filtering_terms/${fieldId}/values`).then((r) => r.data)
}

export async function getSuggestions(
  fieldId: string,
  term: string,
  signal: AbortSignal,
): Promise<FieldValueSuggestion[]> {
  return apiClient
    .get<FieldValueSuggestion[]>(`/filtering_terms/${fieldId}/suggestions`, {
      params: { term, word_match: true },
      signal,
    })
    .then((r) => r.data)
}

export async function postQuery(filters: BeaconQueryFilter[]): Promise<BeaconResultSetsResponse> {
  const res = await apiClient.post<BeaconResultSetsResponse>('/query', {
    query: {
      filters,
      requestedGranularity: 'record',
    },
  })
  return res.data
}

export async function checkSession(): Promise<boolean> {
  try {
    await apiClient.get(import.meta.env.VITE_ACCOUNT_INFO)
    return true
  } catch {
    return false
  }
}
