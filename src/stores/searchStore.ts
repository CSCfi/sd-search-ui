import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { router } from '@service-router'
import type { BeaconQueryFilter } from '@/types/beacon.ts'
import { fieldsConfig } from '@/services/config'

export type DatasetType = 'all' | 'clinical' | 'non_clinical'

const isComplementaryEnabled = () => fieldsConfig.complementary === true

export const useSearchStore = defineStore('search', () => {
  const draftFilters = ref<BeaconQueryFilter[]>([])
  const committedFilters = ref<BeaconQueryFilter[]>([])
  const datasetType = ref<DatasetType>('all')
  const committedDatasetType = ref<DatasetType>('all')
  const includeComplementary = ref(false)
  const committedIncludeComplementary = ref(false)

  const setFilter = (
    id: string,
    value: string | string[],
    label?: string[],
    includeDescendantTerms?: boolean,
  ) => {
    const existing = draftFilters.value.findIndex((f) => f.id === id)
    const isEmpty = Array.isArray(value) ? value.length === 0 : value === ''

    if (isEmpty) {
      draftFilters.value = draftFilters.value.filter((f) => f.id !== id)
    } else {
      const entry: BeaconQueryFilter = { id, value, operator: '=' }
      if (label !== undefined) entry.label = label
      if (includeDescendantTerms !== undefined)
        entry.includeDescendantTerms = includeDescendantTerms

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

  // Switch the draft tab and drop draft filters whose field is outside the new scope.
  // Ids absent from `fieldScopes` are kept. Committed filters are left alone, so the visible
  // results keep matching the search that produced them. Returns the dropped field ids.
  const switchScope = (type: DatasetType, fieldScopes?: Map<string, string[]>): string[] => {
    const dropped =
      type === 'all'
        ? []
        : draftFilters.value
            .filter((f) => {
              const fieldScope = fieldScopes?.get(f.id)
              return fieldScope !== undefined && !fieldScope.includes(type)
            })
            .map((f) => f.id)

    datasetType.value = type
    if (dropped.length > 0) removeFilters(dropped)
    return dropped
  }

  const setIncludeComplementary = (value: boolean) => {
    if (value && !isComplementaryEnabled()) return
    includeComplementary.value = value
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
    includeComplementary.value = false
    committedIncludeComplementary.value = false
    router.replace({ query: {} })
  }

  // Apply the current draft as the active search state and sync it to the URL.
  // Array-valued filters are serialized as comma-separated query params, and the default
  // dataset type (`all`) is omitted from the URL.
  const commit = () => {
    committedFilters.value = [...draftFilters.value]
    committedDatasetType.value = datasetType.value
    committedIncludeComplementary.value = includeComplementary.value
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
        ...(includeComplementary.value ? { complementary: 'true' } : {}),
      },
    })
  }

  // URL values are untrusted. Filters and scope commit immediately and self-correct if
  // invalid via resetScope().
  const initFromUrl = (
    filters: BeaconQueryFilter[],
    scope?: DatasetType,
    complementary?: boolean,
  ) => {
    draftFilters.value = filters
    committedFilters.value = [...filters]
    if (scope) {
      datasetType.value = scope
      committedDatasetType.value = scope
    }
    if (complementary && isComplementaryEnabled()) {
      includeComplementary.value = true
      committedIncludeComplementary.value = true
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
    includeComplementary,
    committedIncludeComplementary,
    setFilter,
    removeFilters,
    setDatasetType,
    switchScope,
    setIncludeComplementary,
    resetScope,
    clearFilters,
    commit,
    initFromUrl,
    setUrlLabel,
  }
})
