import { ref } from 'vue'
import type { FieldValueCount } from '@/types/beacon'

// Stub — replace body with TanStack Query useQuery call when api.ts is ready
const mockValues: Record<string, FieldValueCount[]> = {
  sex: [
    { value: 'Male', count: 42, concept_id: null },
    { value: 'Female', count: 38, concept_id: null },
    { value: 'Unknown', count: 5, concept_id: null },
  ],
  anatomical_site: [
    { value: 'Breast structure', count: 42, concept_id: '80248007' },
    { value: 'Lung structure', count: 38, concept_id: '39607008' },
    { value: 'Kidney structure', count: 21, concept_id: '64033007' },
    { value: 'Liver structure', count: 15, concept_id: '10200004' },
  ],
  animal_species: [
    { value: 'Homo sapiens', count: 120, concept_id: '337915000' },
    { value: 'Mus musculus', count: 18, concept_id: '447612001' },
  ],
  specimen_type: [{ value: 'Tissue specimen', count: 96, concept_id: '119376003' }],
  block_preparation: [
    { value: 'Paraffin embedding', count: 74, concept_id: '311731000' },
    { value: 'Frozen section technique', count: 22, concept_id: '433469005' },
  ],
  fixation_type: [
    { value: 'Formalin-fixed paraffin-embedded (FFPE)', count: 68, concept_id: '431510009' },
    { value: 'Fresh frozen', count: 28, concept_id: '1286895009' },
    { value: 'Custom fixation method', count: 4, concept_id: null },
  ],
  staining_procedure: [
    { value: 'Haematoxylin and eosin stain', count: 55, concept_id: '12710003' },
    { value: 'Immunohistochemical staining', count: 31, concept_id: '406917005' },
    { value: 'In situ hybridization', count: 10, concept_id: '115959002' },
    { value: 'Custom staining protocol', count: 4, concept_id: null },
  ],
  staining_substance: [
    { value: 'Antibody', count: 25, concept_id: null },
    { value: 'Double-stranded DNA', count: 8, concept_id: null },
    { value: 'Haematoxylin', count: 55, concept_id: '12710003' },
  ],
}

export function useFieldValues(fieldId: string) {
  return {
    data: ref<FieldValueCount[]>(mockValues[fieldId] ?? []),
    isLoading: ref(false),
    isError: ref(false),
  }
}
