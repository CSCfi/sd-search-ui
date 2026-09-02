import type {
  BeaconCountResponse,
  BeaconFilteringGroup,
  BeaconFilteringQualifier,
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

export async function getFieldValues(
  fieldId: string,
  scope?: string,
  qualifiers?: Record<string, string>,
): Promise<FieldValue[]> {
  const params: Record<string, string | string[]> = {}
  if (scope && scope !== 'all') params.scope = scope
  if (qualifiers) {
    params.qualifier = Object.entries(qualifiers).map(([id, value]) => `${id}:${value}`)
  }
  return apiClient
    .get<FieldValue[]>(`/filtering_terms/${fieldId}/values`, {
      params,
      // FastAPI expects repeated `qualifier` keys (`qualifier=a&qualifier=b`);
      // Axios otherwise serializes this array as `qualifier[]=a&qualifier[]=b`.
      paramsSerializer: { indexes: null },
    })
    .then((r) => r.data)
}

export async function getSuggestions(
  fieldId: string,
  term: string,
  signal: AbortSignal,
  scope?: string,
  qualifiers?: Record<string, string>,
): Promise<FieldValue[]> {
  const params: Record<string, string | string[]> = { term, word_match: 'true' }
  if (scope && scope !== 'all') params.scope = scope
  if (qualifiers) {
    params.qualifier = Object.entries(qualifiers).map(([id, value]) => `${id}:${value}`)
  }
  return apiClient
    .get<FieldValue[]>(`/filtering_terms/${fieldId}/suggestions`, {
      params,
      signal,
      // FastAPI expects repeated `qualifier` keys (`qualifier=a&qualifier=b`);
      // Axios otherwise serializes this array as `qualifier[]=a&qualifier[]=b`.
      paramsSerializer: { indexes: null },
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

  const res = await apiClient.post<BeaconResultSetsResponse>('/datasets', body)
  return res.data
}

// Non-clinical scope is always queried at 'count' granularity — the backend never returns
// per-dataset identity or imageIds for non-clinical results (see BeaconCountResponse).
export async function postNonClinicalQuery(
  filters: BeaconQueryFilter[],
  qualifiers: Record<string, string> = {},
): Promise<BeaconCountResponse> {
  const body: BeaconQueryRequest = {
    query: {
      filters,
      requestedGranularity: 'count',
      requestedScope: 'non_clinical',
      requestedQualifiers: Object.fromEntries(
        Object.entries(qualifiers).map(([id, value]) => [id, [value]]),
      ),
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

export async function getFilteringQualifiers(): Promise<BeaconFilteringQualifier[]> {
  return apiClient.get<BeaconFilteringQualifier[]>('/filtering_qualifiers').then((r) => r.data)
}

export async function getStatus(): Promise<DeploymentStatus> {
  return apiClient.get<DeploymentStatus>('/status').then((r) => r.data)
}
