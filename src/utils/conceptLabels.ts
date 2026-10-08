import type { FieldValue } from '@/types/beacon'

/**
 * Maps concept ids to the display labels listed by `/filtering_terms/{id}/values`.
 * An id with no matching entry is its own label.
 */
export function resolveConceptLabels(ids: string[], values: FieldValue[]): string[] {
  const valueByConceptId = new Map<string, FieldValue>()
  for (const fv of values) {
    if (fv.concept_id !== null) valueByConceptId.set(fv.concept_id, fv)
  }
  return ids.map((id) => valueByConceptId.get(id)?.value ?? id)
}
