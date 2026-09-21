import { computed } from 'vue'
import { groupsConfig } from '@/services/config'
import { useFilteringTerms } from '@/composables/query/useFilteringTerms'
import type { ResolvedGroup } from '@/types/config'

export function useResolvedGroups() {
  const { data: filteringTerms } = useFilteringTerms()

  const groups = computed<ResolvedGroup[]>(() => {
    const termMap = new Map((filteringTerms.value ?? []).map((t) => [t.id, t]))
    return groupsConfig.map((group) => ({
      id: group.id,
      label: group.label,
      parent: group.parent,
      fields: group.fields.flatMap((id) => {
        const term = termMap.get(id)
        return term ? [term] : []
      }),
    }))
  })

  return { groups }
}
