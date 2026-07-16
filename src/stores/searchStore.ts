import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { router } from '@/router'
import type { BeaconQueryFilter } from '@/types/beacon.ts'

export type DatasetType = 'all' | 'clinical' | 'nonclinical'

export const useSearchStore = defineStore('search', () => {
  const draftFilters = ref<BeaconQueryFilter[]>([])
  const committedFilters = ref<BeaconQueryFilter[]>([])
  const datasetType = ref<DatasetType>('all')

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

  const hasCommittedFilters = computed(() => committedFilters.value.length > 0)

  const setDatasetType = (type: DatasetType) => {
    datasetType.value = type
  }

  const clearFilters = () => {
    draftFilters.value = []
    committedFilters.value = []
    datasetType.value = 'all'
    router.replace({ query: {} })
  }

  const commit = () => {
    committedFilters.value = [...draftFilters.value]
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

  const initFromUrl = (filters: BeaconQueryFilter[]) => {
    draftFilters.value = filters
    committedFilters.value = [...filters]
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
    setFilter,
    setDatasetType,
    clearFilters,
    commit,
    initFromUrl,
    setUrlLabel,
  }
})
