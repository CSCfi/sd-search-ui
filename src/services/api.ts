import axios from 'axios'
import type {
  BeaconCountResponse,
  BeaconFilteringGroup,
  BeaconFilteringQualifier,
  BeaconFilteringTermsResponse,
  BeaconImageResultSetsResponse,
  BeaconQueryFilter,
  BeaconQueryRequest,
  BeaconFilteringScope,
  BeaconResultSetsResponse,
  DatasetOnDemandResult,
  DeploymentStatus,
  FieldValue,
} from '@/types/beacon'
import apiClient from './apiClient'
import type { ApiError } from './apiClient'

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

export async function getNonClinicalImageIds(filters: BeaconQueryFilter[]): Promise<string[]> {
  const body: BeaconQueryRequest = {
    query: {
      filters,
      requestedGranularity: 'record',
      requestedScope: 'non_clinical',
    },
  }

  const res = await apiClient.post<BeaconImageResultSetsResponse>('/images', body)
  return res.data.response.resultSet.map((resultSet) => resultSet.id)
}

// Submits image IDs for a Dataset on Demand (DoD) request.
// Does NOT use the shared apiClient — it has baseURL: '/api' and withCredentials: true
// (cookie-based auth)
export async function submitDatasetOnDemand(imageIds: string[]): Promise<DatasetOnDemandResult> {
  try {
    const res = await axios.post(
      import.meta.env.VITE_DOD_ENDPOINT_URL,
      {
        image_accessions: imageIds,
        // TODO(auth): replace with real user identity once SDA token forwarding spec resolves.
        user: 'placeholder',
      },
      { withCredentials: false },
    )

    const accession: string = res.data.on_demand_dataset_accession

    if (res.status === 202) {
      return { status: 'processing', onDemandDatasetAccession: accession }
    }

    return { status: 'success', onDemandDatasetAccession: accession }
  } catch (error) {
    if (!axios.isAxiosError(error)) {
      throw {
        status: 0,
        title: error instanceof Error ? error.message : 'Unknown error',
      } satisfies ApiError
    }
    const detail =
      typeof error.response?.data?.detail === 'string' ? error.response.data.detail : undefined
    throw {
      status: error.response?.status ?? 0,
      title: error.response?.data?.title ?? error.response?.statusText ?? 'Unknown error',
      detail,
    } satisfies ApiError
  }
}

export type DodPollingStatus = 'STATUS_CREATING' | 'STATUS_RELEASED' | 'STATUS_INVALID'

export async function pollDatasetOnDemandStatus(accession: string): Promise<DodPollingStatus> {
  const res = await axios.get(`${import.meta.env.VITE_DOD_ENDPOINT_URL}/${accession}/status`, {
    withCredentials: false,
  })
  return res.data.status as DodPollingStatus
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
