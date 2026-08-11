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
  ui_group?: string | null
  ui_display?: boolean
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
  includeDescendantTerms?: boolean
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

// Field values

export interface FieldValue {
  value: string
  count: number
  concept_id: string | null
}
