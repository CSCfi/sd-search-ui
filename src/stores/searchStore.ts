import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BeaconQueryFilter } from '@/types/beacon.ts'

export const useSearchStore = defineStore('search', () => {
  const filters = ref<BeaconQueryFilter[]>([])

  const setFilter = (id: string, value: string | string[], includeDescendantTerms?: boolean) => {
    const existing = filters.value.findIndex((f) => f.id === id)
    const isEmpty = Array.isArray(value) ? value.length === 0 : value === ''

    if (isEmpty) {
      filters.value = filters.value.filter((f) => f.id !== id)
    } else {
      const entry: BeaconQueryFilter = { id, value, operator: '=' }
      if (includeDescendantTerms !== undefined)
        entry.includeDescendantTerms = includeDescendantTerms

      if (existing >= 0) {
        filters.value[existing] = entry
      } else {
        filters.value.push(entry)
      }
    }
  }

  const clearFilters = () => {
    filters.value = []
  }

  return { filters, setFilter, clearFilters }
})
