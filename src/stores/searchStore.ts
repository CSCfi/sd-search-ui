import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { BeaconQueryFilter } from '@/types/beacon.ts'

export const useSearchStore = defineStore('search', () => {
  const draftFilters = ref<BeaconQueryFilter[]>([])
  const committedFilters = ref<BeaconQueryFilter[]>([])

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

  const clearFilters = () => {
    draftFilters.value = []
    committedFilters.value = []
  }

  const commit = () => {
    committedFilters.value = [...draftFilters.value]
  }

  return { draftFilters, committedFilters, hasCommittedFilters, setFilter, clearFilters, commit }
})
