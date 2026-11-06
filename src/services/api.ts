import type {
  BeaconCountResponse,
  BeaconFilteringTermsResponse,
  BeaconQueryFilter,
  BeaconQueryRequest,
  BeaconFilteringScope,
  BeaconResultSetsResponse,
  DeploymentStatus,
  FieldValue,
} from '@/types/beacon'
import type { BigPictureImageResultSetsResponse } from '@/types/bigpicture'
import apiClient from './apiClient'
import dodClient from './dodClient'

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
  includeComplementary?: boolean,
): Promise<BeaconResultSetsResponse> {
  const body: BeaconQueryRequest = {
    query: {
      filters,
      requestedGranularity: 'record',
      ...(scope ? { requestedScope: scope } : {}),
      ...(includeComplementary ? { includeComplementary: true } : {}),
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

export async function getNonClinicalImageIds(filters: BeaconQueryFilter[]): Promise<string[]> {
  const body: BeaconQueryRequest = {
    query: {
      filters,
      requestedGranularity: 'record',
      requestedScope: 'non_clinical',
    },
  }

  const res = await apiClient.post<BigPictureImageResultSetsResponse>('/images', body)
  return res.data.response.resultSet.map((resultSet) => resultSet.id)
}

// Submits image IDs for a Dataset on Demand (DoD) request via `dodClient` (`POST /dod`).
// Errors arrive as ApiError, mapped by dodClient.
export async function submitDatasetOnDemand(imageIds: string[]): Promise<void> {
  // '' keeps the URL at `/dod`; '/' would give `/dod/`, which nginx's exact-match location misses.
  await dodClient.post('', { image_accessions: imageIds })
}

export async function getFilteringScopes(): Promise<BeaconFilteringScope[]> {
  return apiClient.get<BeaconFilteringScope[]>('/filtering_scopes').then((r) => r.data)
}

export async function getStatus(): Promise<DeploymentStatus> {
  return apiClient.get<DeploymentStatus>('/status').then((r) => r.data)
}
