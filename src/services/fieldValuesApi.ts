import type { FieldValueCount } from '@/types/beacon'
import api from './api'

export async function fetchFieldValues(fieldId: string): Promise<FieldValueCount[]> {
  return api.get<FieldValueCount[]>(`/filtering_terms/${fieldId}/values`).then((r) => r.data)
}
