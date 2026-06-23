import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { router } from '@/router'
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
    router.replace({ query: {} })
  }

  const commit = () => {
    committedFilters.value = [...draftFilters.value]
    router.replace({
      query: Object.fromEntries(
        committedFilters.value.map((f) => [
          f.id,
          Array.isArray(f.value) ? f.value.join(',') : f.value,
        ]),
      ),
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
    setFilter,
    clearFilters,
    commit,
    initFromUrl,
    setUrlLabel,
  }
})
