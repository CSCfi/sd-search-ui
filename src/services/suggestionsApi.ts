import type { FieldValueSuggestion } from '@/types/beacon'
import api from './api'

export async function fetchSuggestions(
  fieldId: string,
  term: string,
): Promise<FieldValueSuggestion[]> {
  return api
    .get<FieldValueSuggestion[]>(`/filtering_terms/${fieldId}/suggestions`, {
      params: { term, word_match: true },
    })
    .then((r) => r.data)
}
