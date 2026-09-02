// Filtering terms

export type BeaconFilteringTermType =
  | 'text'
  | 'keyword'
  | 'controlledValue'
  | 'ontology'
  | 'ontologyOrValue'
  | 'iso8601Range'

export interface BeaconFilteringTerm {
  id: string
  type: BeaconFilteringTermType
  label: string
  description: string
  group?: string | null
  scopes: string[]
  ontology?: {
    id: string
  }
  controlledValues?: string[]
}

export interface BeaconFilteringTermsResponse {
  meta: {
    apiVersion: string
    beaconId: string
    returnedSchemas: { entityType: string }[]
  }
  response: {
    filteringTerms: BeaconFilteringTerm[]
  }
}

export interface BeaconFilteringGroup {
  id: string
  label: string
  description?: string
}

export interface BeaconFilteringScope {
  id: string
  label: string
  description: string
}

export interface BeaconFilteringQualifier {
  id: string
  label: string
  description: string
  values: string[]
  groups: string[]
}

// Query

export interface BeaconQueryRequest {
  query: {
    filters: BeaconQueryFilter[]
    requestedGranularity: 'boolean' | 'count' | 'record'
    requestedScope?: string
    requestedQualifiers?: Record<string, string[]>
  }
}

export interface BeaconQueryFilter {
  id: string
  value: string | string[]
  operator: '='
  label?: string[]
}

// Results

export interface BeaconResultSetResult {
  datasetId: string
  datasetTitle: string | null
  datasetDescription: string | null
  datasetUrl: string | null
  totalImageCount: number
  matchingImageCount: number
  imageIds: string[]
}

export interface BeaconResultSet {
  id: string
  setType: 'dataset'
  exists: boolean
  results: BeaconResultSetResult[]
}

export interface BeaconResultSets {
  resultSet: BeaconResultSet[]
}

export interface BeaconResultSetsResponse {
  meta: {
    apiVersion: string
    beaconId: string
    returnedGranularity: 'record'
  }
  responseSummary: {
    exists: boolean
    numTotalResults: number
  }
  response: BeaconResultSets
}

export interface BeaconCountResponse {
  meta: {
    apiVersion: string
    beaconId: string
    returnedGranularity: 'count'
  }
  responseSummary: {
    exists: boolean
    numTotalResults: number
  }
}

// Field values

export interface FieldValue {
  value: string
  count: number
  concept_id: string | null
}

// Deployment status

export interface DocumentCounts {
  indexed: number
  pending: number
}

export interface ScopedCounts {
  documents: DocumentCounts
}

export interface DeploymentStatus {
  deployment: string
  documents: DocumentCounts
  scopes: Record<string, ScopedCounts>
  last_indexed: string | null // ISO 8601 datetime string or null
}
