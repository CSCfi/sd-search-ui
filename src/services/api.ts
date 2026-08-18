import type {
  BeaconFilteringGroup,
  BeaconFilteringQualifier,
  BeaconFilteringTermsResponse,
  BeaconQueryFilter,
  BeaconQueryRequest,
  BeaconFilteringScope,
  BeaconResultSetsResponse,
  FieldValue,
} from '@/types/beacon'
import apiClient from './apiClient'

export async function getFilteringTerms(): Promise<BeaconFilteringTermsResponse> {
  return apiClient.get<BeaconFilteringTermsResponse>('/filtering_terms').then((r) => r.data)
}

export async function getFieldValues(fieldId: string): Promise<FieldValue[]> {
  return apiClient.get<FieldValue[]>(`/filtering_terms/${fieldId}/values`).then((r) => r.data)
}

export async function getSuggestions(
  fieldId: string,
  term: string,
  signal: AbortSignal,
): Promise<FieldValue[]> {
  return apiClient
    .get<FieldValue[]>(`/filtering_terms/${fieldId}/suggestions`, {
      params: { term, word_match: true },
      signal,
    })
    .then((r) => r.data)
}

export async function postQuery(
  filters: BeaconQueryFilter[],
  scope?: string,
  qualifiers: Record<string, string> = {},
): Promise<BeaconResultSetsResponse> {
  const body: BeaconQueryRequest = {
    query: {
      filters,
      requestedGranularity: 'record',
      ...(scope ? { requestedScope: scope } : {}),
      requestedQualifiers: Object.fromEntries(
        Object.entries(qualifiers).map(([id, value]) => [id, [value]]),
      ),
    },
  }

  const res = await apiClient.post<BeaconResultSetsResponse>('/query', body)
  return res.data
}

export async function getFilteringGroups(): Promise<BeaconFilteringGroup[]> {
  return apiClient.get<BeaconFilteringGroup[]>('/filtering_groups').then((r) => r.data)
}

export async function getFilteringScopes(): Promise<BeaconFilteringScope[]> {
  return apiClient.get<BeaconFilteringScope[]>('/filtering_scopes').then((r) => r.data)
}

export async function getFilteringQualifiers(): Promise<BeaconFilteringQualifier[]> {
  return apiClient.get<BeaconFilteringQualifier[]>('/filtering_qualifiers').then((r) => r.data)
}
