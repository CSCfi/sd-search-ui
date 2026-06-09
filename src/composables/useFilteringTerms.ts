import { ref } from 'vue'
import type { BeaconFilteringTermsResponse } from '@/types/beacon'

// Stub — replace body with TanStack Query useQuery call when api.ts is ready
const mockResponse: BeaconFilteringTermsResponse = {
  meta: { apiVersion: '2.0', beaconId: 'csc-discovery', returnedSchemas: [] },
  response: {
    filteringTerms: [
      { id: 'dataset_description', type: 'text', label: 'Dataset description', description: '', scopes: [] },
      { id: 'animal_species', type: 'ontology', label: 'Biological species', description: '', scopes: [] },
      { id: 'anatomical_site', type: 'ontology', label: 'Anatomical site', description: '', scopes: [] },
      { id: 'sex', type: 'controlledValue', label: 'Sex', description: '', scopes: [], controlledValues: ['Male', 'Female', 'Unknown'] },
      { id: 'age_at_extraction', type: 'iso8601Range', label: 'Age at extraction', description: '', scopes: [] },
      { id: 'fixation_type', type: 'ontologyOrValue', label: 'Fixation type', description: '', scopes: [] },
      { id: 'block_preparation', type: 'ontology', label: 'Block preparation', description: '', scopes: [] },
      { id: 'staining_procedure', type: 'ontologyOrValue', label: 'Staining procedure', description: '', scopes: [] },
    ],
  },
}

export function useFilteringTerms() {
  return {
    data: ref(mockResponse),
    isLoading: ref(false),
    isError: ref(false),
  }
}
