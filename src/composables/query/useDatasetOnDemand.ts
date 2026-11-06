import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getNonClinicalImageIds, submitDatasetOnDemand } from '@/services/api'
import type { ApiError } from '@/services/apiClient'
import { useSearchStore } from '@/stores/searchStore'

export type DodStatus = 'idle' | 'loading' | 'sent' | 'error'

const GENERIC_ERROR_MESSAGE = 'Something went wrong while creating the dataset. Please try again.'
// A 401 that survives the session refresh + retry means the DoD service rejected the token.
const ACCESS_DENIED_MESSAGE = 'Your account does not have access to non-clinical images.'

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

  const isDodBusy = computed(() => dodStatus.value === 'loading')

  if (getCurrentScope()) {
    onScopeDispose(() => {
      isDisposed = true
    })
  }

  // commit() assigns a new array even for identical filters, so compare values, not references.
  // An identical re-commit must keep `sent`, otherwise the same request could be submitted twice.
  watch(committedFilters, (next, prev) => {
    if (dodStatus.value === 'sent' && JSON.stringify(next) !== JSON.stringify(prev)) {
      dodStatus.value = 'idle'
    }
  })

  async function applyForNonClinicalImages(): Promise<void> {
    if (isDodBusy.value || dodStatus.value === 'sent' || isDisposed) return

    const requestedFilters = JSON.stringify(committedFilters.value)
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

      await submitDatasetOnDemand(imageIds)
      if (isDisposed) return

      // Filters changed while the request was in flight: `sent` would describe a search the
      // user is no longer looking at.
      dodStatus.value =
        JSON.stringify(committedFilters.value) === requestedFilters ? 'sent' : 'idle'
    } catch (error) {
      if (isDisposed) return
      dodStatus.value = 'error'
      dodError.value = extractErrorMessage(error)
    }
  }

  return { dodStatus, dodError, isDodBusy, applyForNonClinicalImages }
}
