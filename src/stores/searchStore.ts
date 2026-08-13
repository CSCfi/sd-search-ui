import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { router } from '@/router'
import type { BeaconQueryFilter } from '@/types/beacon.ts'

export type DatasetType = 'all' | 'clinical' | 'non_clinical'

export const useSearchStore = defineStore('search', () => {
  const draftFilters = ref<BeaconQueryFilter[]>([])
  const committedFilters = ref<BeaconQueryFilter[]>([])
  const datasetType = ref<DatasetType>('all')
  const committedDatasetType = ref<DatasetType>('all')

  const setFilter = (
    id: string,
    value: string | string[],
    includeDescendantTerms?: boolean,
    label?: string[],
  ) => {
    const existing = draftFilters.value.findIndex((f) => f.id === id)
    const isEmpty = Array.isArray(value) ? value.length === 0 : value === ''

    if (isEmpty) {
      draftFilters.value = draftFilters.value.filter((f) => f.id !== id)
    } else {
      const entry: BeaconQueryFilter = { id, value, operator: '=' }
      if (includeDescendantTerms !== undefined)
        entry.includeDescendantTerms = includeDescendantTerms
      if (label !== undefined) entry.label = label

      if (existing >= 0) {
        draftFilters.value[existing] = entry
      } else {
        draftFilters.value.push(entry)
      }
    }
  }

  // Remove filters from draft state only.
  // `committedFilters` stays unchanged so the visible results still reflect the last executed search.
  // Callers pass filter ids and decide which scoped fields should be removed.
  const removeFilters = (ids: string[]) => {
    draftFilters.value = draftFilters.value.filter((f) => !ids.includes(f.id))
  }

  const hasCommittedFilters = computed(() => committedFilters.value.length > 0)

  const setDatasetType = (type: DatasetType) => {
    datasetType.value = type
  }

  // Recover from an invalid `?tab=` query value by resetting both current and committed scope.
  // This prevents later searches from reusing an unsupported scope.
  const resetScope = () => {
    datasetType.value = 'all'
    committedDatasetType.value = 'all'
  }

  const clearFilters = () => {
    draftFilters.value = []
    committedFilters.value = []
    datasetType.value = 'all'
    committedDatasetType.value = 'all'
    router.replace({ query: {} })
  }

  // Apply the current draft as the active search state and sync it to the URL.
  // Array-valued filters are serialized as comma-separated query params, and the default
  // dataset type (`all`) is omitted from the URL.
  const commit = () => {
    committedFilters.value = [...draftFilters.value]
    committedDatasetType.value = datasetType.value
    const filterEntries = Object.fromEntries(
      committedFilters.value.map((f) => [
        f.id,
        Array.isArray(f.value) ? f.value.join(',') : f.value,
      ]),
    )
    router.replace({
      query: {
        ...filterEntries,
        ...(datasetType.value !== 'all' ? { tab: datasetType.value } : {}),
      },
    })
  }

  const initFromUrl = (filters: BeaconQueryFilter[], scope?: DatasetType) => {
    draftFilters.value = filters
    committedFilters.value = [...filters]
    if (scope) {
      datasetType.value = scope
      committedDatasetType.value = scope
    }
  }

  const setUrlLabel = (id: string, label: string[]) => {
    const f = draftFilters.value.find((f) => f.id === id)
    if (f) f.label = label
    const cf = committedFilters.value.find((f) => f.id === id)
    if (cf) cf.label = label
  }

  return {
    draftFilters,
    committedFilters,
    hasCommittedFilters,
    datasetType,
    committedDatasetType,
    setFilter,
    removeFilters,
    setDatasetType,
    resetScope,
    clearFilters,
    commit,
    initFromUrl,
    setUrlLabel,
  }
})
