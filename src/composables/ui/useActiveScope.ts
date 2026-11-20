import { computed } from 'vue'
import { useFilteringScopes } from '@/composables/query/useFilteringScopes'
import { useFieldScopes } from '@/composables/ui/useFieldScopes'
import { fieldsConfig } from '@/services/config'
import { useSearchStore, type DatasetType } from '@/stores/searchStore'
import type { BeaconQueryFilter } from '@/types/beacon'
import { scopeOfFilters } from '@/utils/aiFilters'

/** `null` while the field scopes are still loading, `'mixed'` for a conflicting filter set. */
export type ActiveScope = DatasetType | 'mixed' | null

export interface ScopeInputs {
  scopeTabs: boolean
  hiddenScopes: string[]
  /** Scope ids from `/filtering_scopes`, `undefined` while loading. */
  scopeIds: string[] | undefined
  /** Field id -> scope ids from `/filtering_terms`, `undefined` while loading. */
  fieldScopes: Map<string, string[]> | undefined
}

/**
 * Scope of one filter set. With scope tabs on, the tab the user picked wins.
 * With tabs off, the scope follows from the filters. One visible scope always wins,
 * so `hidden_scopes` keeps targeting the remaining scope.
 */
export function resolveScope(
  filters: BeaconQueryFilter[],
  tabValue: DatasetType,
  { scopeTabs, hiddenScopes, scopeIds, fieldScopes }: ScopeInputs,
): ActiveScope {
  if (scopeTabs) return tabValue
  if (!fieldScopes || !scopeIds) return null

  const visible = scopeIds.filter((id) => !hiddenScopes.includes(id))
  if (visible.length === 1) return visible[0] as DatasetType

  return scopeOfFilters(
    filters.map((f) => f.id),
    fieldScopes,
    scopeIds,
  )
}

/**
 * Scope for one field's `/values` and `/suggestions` calls. A field outside the active scope
 * (the locked panel) asks for all data, because the backend rejects such a field with a
 * "not in scope" error when the scope is passed.
 */
export function scopeForField(scope: DatasetType, fieldScopes: string[] | undefined): DatasetType {
  if (scope === 'all' || !fieldScopes || fieldScopes.includes(scope)) return scope
  return 'all'
}

export function useActiveScope() {
  const store = useSearchStore()
  // useFieldScopes, not useFilteringTerms: it keeps hidden fields, which still carry a scope.
  const { data: fieldScopes } = useFieldScopes()
  const { data: scopes } = useFilteringScopes()

  const inputs = (): ScopeInputs => ({
    scopeTabs: fieldsConfig.scope_tabs === true,
    hiddenScopes: fieldsConfig.hidden_scopes,
    scopeIds: scopes.value?.map((s) => s.id),
    fieldScopes: fieldScopes.value,
  })

  const draftScope = computed(() => resolveScope(store.draftFilters, store.datasetType, inputs()))

  // Loading and conflicting sets query all data.
  const draftQueryScope = computed<DatasetType>(() =>
    draftScope.value === null || draftScope.value === 'mixed' ? 'all' : draftScope.value,
  )

  return {
    draftScope,
    draftQueryScope,
    queryScopeFor: (fieldId: string): DatasetType =>
      scopeForField(draftQueryScope.value, fieldScopes.value?.get(fieldId)),
    committedScope: computed(() =>
      resolveScope(store.committedFilters, store.committedDatasetType, inputs()),
    ),
  }
}
