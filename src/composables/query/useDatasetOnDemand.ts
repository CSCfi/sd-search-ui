import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  getNonClinicalImageIds,
  submitDatasetOnDemand,
  pollDatasetOnDemandStatus,
} from '@/services/api'
import { buildRemsUrl } from '@/utils/rems'
import type { ApiError } from '@/services/apiClient'
import { useSearchStore } from '@/stores/searchStore'

export type DodStatus = 'idle' | 'loading' | 'polling' | 'error'

const GENERIC_ERROR_MESSAGE = 'Something went wrong while creating the dataset. Please try again.'
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 20 // ~60s total

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  const apiError = error as Partial<ApiError> | undefined
  return apiError?.detail ?? apiError?.title ?? GENERIC_ERROR_MESSAGE
}

export function useDatasetOnDemand() {
  const { committedFilters } = storeToRefs(useSearchStore())

  const dodStatus = ref<DodStatus>('idle')
  const dodError = ref<string | null>(null)

  const isDodBusy = computed(() => dodStatus.value === 'loading' || dodStatus.value === 'polling')

  async function applyForNonClinicalImages(): Promise<void> {
    dodStatus.value = 'loading'
    dodError.value = null

    try {
      const imageIds = await getNonClinicalImageIds(committedFilters.value)

      // The displayed count came from a separate, earlier query (postNonClinicalQuery).
      // An empty record-level result is inconsistent with that count. Route it through
      // the common error handler instead of submitting an empty dataset request.
      if (imageIds.length === 0) {
        throw new Error(GENERIC_ERROR_MESSAGE)
      }

      const result = await submitDatasetOnDemand(imageIds)
      const accession = result.onDemandDatasetAccession

      // SDA may need time to compose the dataset regardless of status code.
      // Poll until released or until max attempts are exhausted.
      dodStatus.value = 'polling'

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

        const pollingStatus = await pollDatasetOnDemandStatus(accession)

        if (pollingStatus === 'STATUS_RELEASED') {
          dodStatus.value = 'idle'
          window.open(buildRemsUrl(accession), '_blank', 'noopener')
          return
        }

        if (pollingStatus === 'STATUS_INVALID') {
          throw new Error(GENERIC_ERROR_MESSAGE)
        }
      }

      // Max attempts reached without STATUS_RELEASED
      throw new Error(
        'This is taking longer than expected. You will receive an email when your dataset is ready.',
      )
    } catch (error) {
      dodStatus.value = 'error'
      dodError.value = extractErrorMessage(error)
    }
  }

  return { dodStatus, dodError, isDodBusy, applyForNonClinicalImages }
}
