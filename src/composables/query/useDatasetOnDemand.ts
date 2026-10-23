import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'
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
// A 401 that survives the session refresh + retry means the DoD service rejected the token.
const ACCESS_DENIED_MESSAGE = 'Your account does not have access to non-clinical images.'
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 20 // ~60s total

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  const apiError = error as Partial<ApiError> | undefined
  if (apiError?.status === 401) return ACCESS_DENIED_MESSAGE
  return apiError?.detail ?? apiError?.title ?? GENERIC_ERROR_MESSAGE
}

export function useDatasetOnDemand() {
  const { committedFilters } = storeToRefs(useSearchStore())

  const dodStatus = ref<DodStatus>('idle')
  const dodError = ref<string | null>(null)
  let isDisposed = false
  let pollTimeout: ReturnType<typeof setTimeout> | undefined
  let resolvePollDelay: (() => void) | undefined

  const isDodBusy = computed(() => dodStatus.value === 'loading' || dodStatus.value === 'polling')

  function waitForNextPoll(): Promise<void> {
    return new Promise((resolve) => {
      resolvePollDelay = () => {
        resolvePollDelay = undefined
        resolve()
      }
      pollTimeout = setTimeout(() => {
        pollTimeout = undefined
        resolvePollDelay?.()
      }, POLL_INTERVAL_MS)
    })
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      isDisposed = true
      if (pollTimeout !== undefined) clearTimeout(pollTimeout)
      resolvePollDelay?.()
    })
  }

  async function applyForNonClinicalImages(): Promise<void> {
    if (isDodBusy.value || isDisposed) return

    dodStatus.value = 'loading'
    dodError.value = null

    try {
      const imageIds = await getNonClinicalImageIds(committedFilters.value)
      if (isDisposed) return

      // The displayed count came from a separate, earlier query (postNonClinicalQuery).
      // An empty record-level result is inconsistent with that count. Route it through
      // the common error handler instead of submitting an empty dataset request.
      if (imageIds.length === 0) {
        throw new Error(GENERIC_ERROR_MESSAGE)
      }

      const result = await submitDatasetOnDemand(imageIds)
      if (isDisposed) return
      const accession = result.onDemandDatasetAccession

      // SDA may need time to compose the dataset regardless of status code.
      // Poll until released or until max attempts are exhausted.
      dodStatus.value = 'polling'

      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        await waitForNextPoll()
        if (isDisposed) return

        const pollingStatus = await pollDatasetOnDemandStatus(accession)
        if (isDisposed) return

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
      if (isDisposed) return
      dodStatus.value = 'error'
      dodError.value = extractErrorMessage(error)
    }
  }

  return { dodStatus, dodError, isDodBusy, applyForNonClinicalImages }
}
