import type { FieldValueSuggestion } from '@/types/beacon'
import api from './api'

export async function fetchSuggestions(
  fieldId: string,
  term: string,
  signal: AbortSignal,
): Promise<FieldValueSuggestion[]> {
  return api
    .get<FieldValueSuggestion[]>(`/filtering_terms/${fieldId}/suggestions`, {
      params: { term, word_match: true },
      signal,
    })
    .then((r) => r.data)
}
