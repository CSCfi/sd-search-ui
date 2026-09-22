// Non-clinical images at record granularity.
export interface BigPictureImageResult {
  imageId: string
}

export interface BigPictureImageResultSet {
  id: string
  setType: 'image'
  results: BigPictureImageResult[]
}

export interface BigPictureImageResultSetsResponse {
  meta: {
    apiVersion: string
    beaconId: string
    returnedGranularity: 'record'
  }
  responseSummary: {
    exists: boolean
    numTotalResults: number
  }
  response: {
    resultSet: BigPictureImageResultSet[]
  }
}

// Dataset on Demand (DoD)
export interface DatasetOnDemandCreated {
  onDemandDatasetAccession: string
}

export type DatasetOnDemandResult =
  | ({ status: 'success' } & DatasetOnDemandCreated)
  | { status: 'processing'; onDemandDatasetAccession: string }

export interface BigPictureDatasetResult {
  datasetId: string
  datasetTitle: string | null
  datasetDescription: string | null
  datasetUrl: string | null
  totalImageCount: number
  matchingImageCount: number
  imageIds: string[]
}
