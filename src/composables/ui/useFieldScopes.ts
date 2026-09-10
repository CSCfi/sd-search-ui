import { useQuery } from '@tanstack/vue-query'
import { getFilteringTerms } from '@/services/api'

/**
 * Returns a map of field ids to their allowed scopes.
 * Used to detect filters that no longer belong to the active scope.
 *
 * Shares the `['filteringTerms']` query key with `useFilteringTerms`, so it reuses
 * the same cached response instead of making another request.
 *
 * Intentionally does not filter by `ui_display`. Some fields, such as `animal_species`,
 * are hidden in the UI but still scope-specific. If this map were built only from visible
 * fields, those hidden out-of-scope filters would not be removed correctly.
 */
export function useFieldScopes() {
  return useQuery({
    queryKey: ['filteringTerms'],
    queryFn: getFilteringTerms,
    staleTime: Infinity,
    select: (data) => new Map(data.response.filteringTerms.map((t) => [t.id, t.scopes] as const)),
  })
}
