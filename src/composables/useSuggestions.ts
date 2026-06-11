import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import type { FieldValueSuggestion } from '@/types/beacon'

// TODO: replace with TanStack Query useQuery call when api.ts is ready
// Stub — data is ComputedRef, not Ref<T | undefined> as TanStack Query returns.
// When replacing with useQuery, update consumers: data.value ?? []
const mockSuggestions: Record<string, FieldValueSuggestion[]> = {
  anatomical_site: [
    { term: 'Breast structure', concept_id: '80248007' },
    { term: 'Lung structure', concept_id: '39607008' },
    { term: 'Kidney structure', concept_id: '64033007' },
    { term: 'Liver structure', concept_id: '10200004' },
  ],
  animal_species: [
    { term: 'Homo sapiens', concept_id: '337915000' },
    { term: 'Mus musculus', concept_id: '447612001' },
  ],
  specimen_type: [{ term: 'Tissue specimen', concept_id: '119376003' }],
  block_preparation: [
    { term: 'Paraffin embedding', concept_id: '311731000' },
    { term: 'Frozen section technique', concept_id: '433469005' },
  ],
  fixation_type: [
    { term: 'Formalin-fixed paraffin-embedded (FFPE)', concept_id: '431510009' },
    { term: 'Fresh frozen', concept_id: '1286895009' },
    { term: 'Custom fixation method', concept_id: null },
  ],
  staining_procedure: [
    { term: 'Haematoxylin and eosin stain', concept_id: '12710003' },
    { term: 'Immunohistochemical staining', concept_id: '406917005' },
    { term: 'In situ hybridization', concept_id: '115959002' },
    { term: 'Custom staining protocol', concept_id: null },
  ],
  staining_substance: [
    { term: 'Antibody', concept_id: null },
    { term: 'Double-stranded DNA', concept_id: null },
    { term: 'Haematoxylin', concept_id: '12710003' },
  ],
}

export function useSuggestions(fieldId: string, searchTerm: Ref<string>) {
  const all = mockSuggestions[fieldId] ?? []
  const data = computed<FieldValueSuggestion[]>(() => {
    if (searchTerm.value.length < 2) return []
    const q = searchTerm.value.toLowerCase()
    return all.filter((item) => item.term.toLowerCase().includes(q))
  })
  return { data, isLoading: ref(false), isError: ref(false) }
}
