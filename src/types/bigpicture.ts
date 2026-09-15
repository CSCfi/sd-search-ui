export interface BigPictureDatasetResult {
  datasetId: string
  datasetTitle: string | null
  datasetDescription: string | null
  datasetUrl: string | null
  totalImageCount: number
  matchingImageCount: number
  imageIds: string[]
}
