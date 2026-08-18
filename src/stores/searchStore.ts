import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { router } from '@/router'
import type { BeaconQueryFilter } from '@/types/beacon.ts'

export type DatasetType = 'all' | 'clinical' | 'non_clinical'

// Shared writer for the `?qualifiers=` `id:value` format. It keeps commit() and the
// copy-URL action consistent; SearchPage must parse the same format.
export const serializeQualifiers = (qualifiers: Record<string, string>) =>
  Object.entries(qualifiers)
    .map(([id, value]) => `${id}:${value}`)
    .join(',')

export const useSearchStore = defineStore('search', () => {
  const draftFilters = ref<BeaconQueryFilter[]>([])
  const committedFilters = ref<BeaconQueryFilter[]>([])
  const datasetType = ref<DatasetType>('all')
  const committedDatasetType = ref<DatasetType>('all')
  const draftQualifiers = ref<Record<string, string>>({})
  const committedQualifiers = ref<Record<string, string>>({})

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

  const setQualifier = (qualifierId: string, value: string) => {
    if (value === 'all') {
      delete draftQualifiers.value[qualifierId]
    } else {
      draftQualifiers.value[qualifierId] = value
    }
  }

  // Recover from a hand-edited or stale `?qualifiers=` value that names a qualifier
  // or value the deployment does not declare. Mirrors `resetScope`: without this the
  // backend rejects the query. Also used when /filtering_qualifiers itself fails, since
  // then there is no declared list to validate against either.
  const resetQualifiers = () => {
    draftQualifiers.value = {}
    committedQualifiers.value = {}
  }

  // Copies already-validated draft qualifiers to the committed query state without changing
  // filters or dataset type. Callers must validate URL-derived qualifiers before calling this.
  const commitQualifiers = () => {
    committedQualifiers.value = { ...draftQualifiers.value }
  }

  const clearFilters = () => {
    draftFilters.value = []
    committedFilters.value = []
    datasetType.value = 'all'
    committedDatasetType.value = 'all'
    draftQualifiers.value = {}
    committedQualifiers.value = {}
    router.replace({ query: {} })
  }

  // Apply the current draft as the active search state and sync it to the URL.
  // Array-valued filters are serialized as comma-separated query params, and the default
  // dataset type (`all`) is omitted from the URL.
  const commit = () => {
    committedFilters.value = [...draftFilters.value]
    committedDatasetType.value = datasetType.value
    committedQualifiers.value = { ...draftQualifiers.value }
    const filterEntries = Object.fromEntries(
      committedFilters.value.map((f) => [
        f.id,
        Array.isArray(f.value) ? f.value.join(',') : f.value,
      ]),
    )
    const qualifierParam = serializeQualifiers(committedQualifiers.value)
    router.replace({
      query: {
        ...filterEntries,
        ...(datasetType.value !== 'all' ? { tab: datasetType.value } : {}),
        ...(qualifierParam ? { qualifiers: qualifierParam } : {}),
      },
    })
  }

  // URL values are untrusted. Filters and scope commit immediately and self-correct if
  // invalid via resetScope(). Qualifiers stay draft-only until SearchForm validates
  // them — an invalid qualifier causes the backend to hard-reject the whole query.
  const initFromUrl = (
    filters: BeaconQueryFilter[],
    scope?: DatasetType,
    qualifiers?: Record<string, string>,
  ) => {
    draftFilters.value = filters
    committedFilters.value = [...filters]
    if (scope) {
      datasetType.value = scope
      committedDatasetType.value = scope
    }
    if (qualifiers) {
      draftQualifiers.value = { ...qualifiers }
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
    draftQualifiers,
    committedQualifiers,
    setFilter,
    removeFilters,
    setDatasetType,
    resetScope,
    clearFilters,
    commit,
    initFromUrl,
    setUrlLabel,
    setQualifier,
    resetQualifiers,
    commitQualifiers,
  }
})
