export type BeaconFilteringTermType =
  | 'text'
  | 'controlledValue'
  | 'ontology'
  | 'ontologyOrValue'
  | 'iso8601Range'

export interface BeaconFilteringTerm {
  id: string
  type: BeaconFilteringTermType
  label: string
  description: string
  scopes: string[]
  ontology?: {
    id: string
    rootTerms?: string[] | null
    allowedTerms?: string[] | null
  }
  ontologyConcept?: string | string[]
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

export interface BeaconQueryFilter {
  id: string
  value: string | string[]
  operator: '='
  includeDescendantTerms?: boolean
}

export interface BeaconResultSetResult {
  datasetId: string
  datasetTitle: string | null
  datasetDescription: string | null
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
    returnedGranularity: 'resultSets'
  }
  responseSummary: {
    exists: boolean
    numTotalResults: number
  }
  response: BeaconResultSets
}

export interface FieldValueSuggestion {
  term: string
  count: number
  concept_id: string | null
}

export interface FieldValueCount {
  value: string
  count: number
  concept_id: string | null
}
