import { useQueryClient } from '@tanstack/vue-query'
import { getFieldValues, getFilteringTerms } from '@/services/api'
import { useSearchStore } from '@/stores/searchStore'
import type { BeaconFilteringTermsResponse, BeaconQueryFilter, FieldValue } from '@/types/beacon'

const ONTOLOGY_TYPES = new Set(['ontology', 'ontologyOrValue'])

export function useResolveUrlLabels() {
  const queryClient = useQueryClient()
  const store = useSearchStore()

  async function resolveLabelsFromUrl(filters: BeaconQueryFilter[]) {
    if (filters.length === 0) return

    let termsResponse: BeaconFilteringTermsResponse
    try {
      termsResponse = await queryClient.fetchQuery({
        queryKey: ['filteringTerms'],
        queryFn: getFilteringTerms,
        staleTime: Infinity,
      })
    } catch {
      // Non-fatal: if filtering terms cannot be loaded, URL filters remain as raw IDs.
      return
    }

    const ontologyFieldIds = new Set(
      termsResponse.response.filteringTerms
        .filter((t) => ONTOLOGY_TYPES.has(t.type))
        .map((t) => t.id),
    )

    const ontologyFilters = filters.filter((f) => ontologyFieldIds.has(f.id))

    await Promise.all(
      ontologyFilters.map(async (filter) => {
        try {
          const values = await queryClient.fetchQuery({
            queryKey: ['values', filter.id],
            queryFn: () => getFieldValues(filter.id),
            staleTime: 4 * 60 * 60 * 1000,
          })

          const valueByConceptId = new Map<string, FieldValue>()
          for (const fv of values) {
            if (fv.concept_id !== null) valueByConceptId.set(fv.concept_id, fv)
          }

          const filterValues = Array.isArray(filter.value) ? filter.value : [filter.value]
          const labels = filterValues.map((id) => valueByConceptId.get(id)?.value ?? id)

          // Only persist resolved labels when at least one raw ID was replaced by a human label.
          // If every label still equals its raw ID, nothing resolved — skip the store write.
          if (labels.some((label, i) => label !== filterValues[i])) {
            store.setUrlLabel(filter.id, labels)
          }
        } catch {
          // silent — raw ID fallback in ResultsBanner applies
        }
      }),
    )
  }

  return { resolveLabelsFromUrl }
}
