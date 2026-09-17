import type { BeaconFilteringTerm } from '@/types/beacon'

// A filter group from groups.yaml.
// `T` is a field ID in config and a full term object at runtime.
export interface FilteringGroup<T = string> {
  id: string
  label: string
  parent?: string | null
  fields: T[]
}

// A group with field IDs resolved to filtering terms.
export type ResolvedGroup = FilteringGroup<BeaconFilteringTerm>
