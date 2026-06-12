import { useQuery } from '@tanstack/vue-query'
import { fetchFilteringTerms } from '@/services/filteringTermsApi'

// Backend returns fields that is not meant to be used in UI currently. Whitelist visible fields.
const VISIBLE_FIELD_IDS = new Set([
  'dataset_description',
  'animal_species',
  'anatomical_site',
  'sex',
  'age_at_extraction',
  'fixation_type',
  'block_preparation',
  'specimen_type',
  'staining_procedure',
  'staining_substance',
  'staining_target',
])

export function useFilteringTerms() {
  return useQuery({
    queryKey: ['filteringTerms'],
    queryFn: fetchFilteringTerms,
    staleTime: Infinity,
    select: (data) => ({
      ...data,
      response: {
        filteringTerms: data.response.filteringTerms.filter((f) => VISIBLE_FIELD_IDS.has(f.id)),
      },
    }),
  })
}
