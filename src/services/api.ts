import type {
  BeaconCountResponse,
  BeaconFilteringGroup,
  BeaconFilteringTermsResponse,
  BeaconQueryFilter,
  BeaconQueryRequest,
  BeaconFilteringScope,
  BeaconResultSetsResponse,
  DeploymentStatus,
  FieldValue,
} from '@/types/beacon'
import apiClient from './apiClient'

export async function getFilteringTerms(): Promise<BeaconFilteringTermsResponse> {
  return apiClient.get<BeaconFilteringTermsResponse>('/filtering_terms').then((r) => r.data)
}

export async function getFieldValues(fieldId: string, scope?: string): Promise<FieldValue[]> {
  const params: Record<string, string> = {}
  if (scope && scope !== 'all') params.scope = scope
  return apiClient
    .get<FieldValue[]>(`/filtering_terms/${fieldId}/values`, { params })
    .then((r) => r.data)
}

export async function getSuggestions(
  fieldId: string,
  term: string,
  signal: AbortSignal,
  scope?: string,
): Promise<FieldValue[]> {
  const params: Record<string, string> = { term, word_match: 'true' }
  if (scope && scope !== 'all') params.scope = scope
  return apiClient
    .get<FieldValue[]>(`/filtering_terms/${fieldId}/suggestions`, { params, signal })
    .then((r) => r.data)
}

export async function postQuery(
  filters: BeaconQueryFilter[],
  scope?: string,
): Promise<BeaconResultSetsResponse> {
  const body: BeaconQueryRequest = {
    query: {
      filters,
      requestedGranularity: 'record',
      ...(scope ? { requestedScope: scope } : {}),
    },
  }

  const res = await apiClient.post<BeaconResultSetsResponse>('/datasets', body)
  return res.data
}

// Non-clinical scope is always queried at 'count' granularity — the backend never returns
// per-dataset identity or imageIds for non-clinical results (see BeaconCountResponse).
export async function postNonClinicalQuery(
  filters: BeaconQueryFilter[],
): Promise<BeaconCountResponse> {
  const body: BeaconQueryRequest = {
    query: {
      filters,
      requestedGranularity: 'count',
      requestedScope: 'non_clinical',
    },
  }

  const res = await apiClient.post<BeaconCountResponse>('/images', body)
  return res.data
}

export async function getFilteringGroups(): Promise<BeaconFilteringGroup[]> {
  return apiClient.get<BeaconFilteringGroup[]>('/filtering_groups').then((r) => r.data)
}

export async function getFilteringScopes(): Promise<BeaconFilteringScope[]> {
  return apiClient.get<BeaconFilteringScope[]>('/filtering_scopes').then((r) => r.data)
}

export async function getStatus(): Promise<DeploymentStatus> {
  return apiClient.get<DeploymentStatus>('/status').then((r) => r.data)
}
